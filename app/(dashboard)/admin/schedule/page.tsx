"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Plus,
  Search,
  CalendarClock,
  Edit2,
  Trash2,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Filter,
  Check,
  AlertCircle,
} from "lucide-react"

interface ProgrammeEvent {
  id: string
  name: string
  event_code: string | null
  category: string
}

interface StudentInfo {
  id: string
  name: string
  chest_no: string | null
}

interface ProgrammeSchedule {
  id: string
  programme_id: string
  schedule_date: string
  start_time: string
  end_time: string
  created_at?: string
  programme?: ProgrammeEvent
  // Computed properties
  hasClash?: boolean
  clashingProgrammeCount?: number
}

interface ClashConflict {
  id: string
  date: string
  programmeA: ProgrammeEvent
  programmeB: ProgrammeEvent
  timeA: { start: string; end: string }
  timeB: { start: string; end: string }
  commonParticipants: StudentInfo[]
}

// Time conversion utilities
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(":")
  const h = parseInt(parts[0], 10) || 0
  const m = parseInt(parts[1], 10) || 0
  return h * 60 + m
}

function format12Hour(timeStr: string): string {
  if (!timeStr) return ""
  const mins = timeToMinutes(timeStr)
  const hours = Math.floor(mins / 60)
  const m = mins % 60
  const suffix = hours >= 12 ? "PM" : "AM"
  const h12 = hours % 12 || 12
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const dt = new Date(dateStr + "T00:00:00")
    return dt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "short",
    })
  } catch {
    return dateStr
  }
}

// Proper interval overlap logic: startA < endB AND startB < endA
function doTimesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const sA = timeToMinutes(startA)
  const eA = timeToMinutes(endA)
  const sB = timeToMinutes(startB)
  const eB = timeToMinutes(endB)

  return sA < eB && sB < eA
}

export default function AdminSchedulePage() {
  const [events, setEvents] = useState<ProgrammeEvent[]>([])
  const [schedules, setSchedules] = useState<ProgrammeSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("ALL")

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [programmeSearch, setProgrammeSearch] = useState("")
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>("")
  const [scheduleDate, setScheduleDate] = useState<string>("")
  const [startTime, setStartTime] = useState<string>("09:00")
  const [endTime, setEndTime] = useState<string>("10:00")
  const [saving, setSaving] = useState(false)

  // Clash Detection State
  const [isClashModalOpen, setIsClashModalOpen] = useState(false)
  const [clashesList, setClashesList] = useState<ClashConflict[]>([])
  const [checkingClashes, setCheckingClashes] = useState(false)
  const [clashCheckDone, setClashCheckDone] = useState(false)

  // Delete State
  const [deleteSchedule, setDeleteSchedule] = useState<ProgrammeSchedule | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [dbTableMissing, setDbTableMissing] = useState(false)

  const supabase = createClient()

  // Load events and programme schedules
  const fetchData = async () => {
    setLoading(true)
    setDbTableMissing(false)

    // 1. Fetch Events / Programmes
    const { data: eventsData } = await (supabase.from("events") as any)
      .select("id, name, event_code, category")
      .order("event_code", { ascending: true })

    if (eventsData) setEvents((eventsData as ProgrammeEvent[]) || [])

    // 2. Fetch Programme Schedules
    const { data: schedulesData, error } = await (supabase.from("programme_schedules") as any)
      .select(`
        id,
        programme_id,
        schedule_date,
        start_time,
        end_time,
        created_at,
        programme:events ( id, name, event_code, category )
      `)
      .order("schedule_date", { ascending: true })
      .order("start_time", { ascending: true })

    if (error) {
      console.warn("Could not query programme_schedules table (migration required):", error)
      setDbTableMissing(true)
      setSchedules([])
    } else if (schedulesData) {
      const formatted = (schedulesData as ProgrammeSchedule[]) || []
      setSchedules(formatted)
      // Automatically run background clash analysis
      runClashAnalysis(formatted, false)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Core Clash Detection Engine
  const runClashAnalysis = async (
    scheduleList: ProgrammeSchedule[],
    openModalOnComplete: boolean = true
  ) => {
    if (openModalOnComplete) setCheckingClashes(true)

    if (scheduleList.length < 2) {
      setClashesList([])
      setClashCheckDone(true)
      if (openModalOnComplete) {
        setIsClashModalOpen(true)
        setCheckingClashes(false)
      }
      return
    }

    // 1. Get unique programme IDs in the schedules
    const scheduledProgIds = Array.from(new Set(scheduleList.map((s) => s.programme_id)))

    // 2. Batch-fetch participations & student details for all scheduled programmes
    const { data: participationsData } = await (supabase.from("participations") as any)
      .select(`
        event_id,
        student_id,
        students ( id, name, chest_no )
      `)
      .in("event_id", scheduledProgIds)
      .not("student_id", "is", null)

    // Build map: programme_id -> Map<student_id, StudentInfo>
    const progParticipantsMap = new Map<string, Map<string, StudentInfo>>()

    if (participationsData) {
      participationsData.forEach((p: any) => {
        if (!p.event_id || !p.student_id || !p.students) return
        if (!progParticipantsMap.has(p.event_id)) {
          progParticipantsMap.set(p.event_id, new Map<string, StudentInfo>())
        }
        const studentInfo: StudentInfo = {
          id: p.students.id,
          name: p.students.name,
          chest_no: p.students.chest_no || "N/A",
        }
        progParticipantsMap.get(p.event_id)!.set(p.student_id, studentInfo)
      })
    }

    // 3. Group schedules by schedule_date
    const dateGroups = new Map<string, ProgrammeSchedule[]>()
    scheduleList.forEach((sched) => {
      if (!dateGroups.has(sched.schedule_date)) {
        dateGroups.set(sched.schedule_date, [])
      }
      dateGroups.get(sched.schedule_date)!.push(sched)
    })

    const foundClashes: ClashConflict[] = []
    const clashingSchedIds = new Set<string>()
    const clashingCounts = new Map<string, number>()

    // 4. Check overlapping pairs for each date
    dateGroups.forEach((itemsOnDate, dateStr) => {
      for (let i = 0; i < itemsOnDate.length; i++) {
        for (let j = i + 1; j < itemsOnDate.length; j++) {
          const schedA = itemsOnDate[i]
          const schedB = itemsOnDate[j]

          // Check if times overlap
          if (doTimesOverlap(schedA.start_time, schedA.end_time, schedB.start_time, schedB.end_time)) {
            // Find common participants
            const partsA = progParticipantsMap.get(schedA.programme_id) || new Map()
            const partsB = progParticipantsMap.get(schedB.programme_id) || new Map()

            const commonList: StudentInfo[] = []
            partsA.forEach((student, studentId) => {
              if (partsB.has(studentId)) {
                commonList.push(student)
              }
            })

            // If they share at least one participant => CLASH!
            if (commonList.length > 0) {
              clashingSchedIds.add(schedA.id)
              clashingSchedIds.add(schedB.id)

              clashingCounts.set(schedA.id, (clashingCounts.get(schedA.id) || 0) + 1)
              clashingCounts.set(schedB.id, (clashingCounts.get(schedB.id) || 0) + 1)

              foundClashes.push({
                id: `${schedA.id}-${schedB.id}`,
                date: dateStr,
                programmeA: schedA.programme || { id: schedA.programme_id, name: "Programme A", event_code: null, category: "" },
                programmeB: schedB.programme || { id: schedB.programme_id, name: "Programme B", event_code: null, category: "" },
                timeA: { start: schedA.start_time, end: schedA.end_time },
                timeB: { start: schedB.start_time, end: schedB.end_time },
                commonParticipants: commonList,
              })
            }
          }
        }
      }
    })

    // 5. Update schedules status flags
    const updatedSchedules = scheduleList.map((s) => ({
      ...s,
      hasClash: clashingSchedIds.has(s.id),
      clashingProgrammeCount: clashingCounts.get(s.id) || 0,
    }))

    setSchedules(updatedSchedules)
    setClashesList(foundClashes)
    setClashCheckDone(true)

    if (openModalOnComplete) {
      setIsClashModalOpen(true)
      setCheckingClashes(false)
    }
  }

  // Open Modal for Add or Edit
  const handleOpenAddModal = (schedToEdit?: ProgrammeSchedule) => {
    if (schedToEdit) {
      setEditingScheduleId(schedToEdit.id)
      setSelectedProgrammeId(schedToEdit.programme_id)
      setScheduleDate(schedToEdit.schedule_date)
      setStartTime(schedToEdit.start_time.slice(0, 5))
      setEndTime(schedToEdit.end_time.slice(0, 5))
    } else {
      setEditingScheduleId(null)
      setSelectedProgrammeId("")
      // Default to today or existing date
      const today = new Date().toISOString().slice(0, 10)
      setScheduleDate(today)
      setStartTime("09:00")
      setEndTime("10:00")
    }
    setProgrammeSearch("")
    setIsModalOpen(true)
  }

  // Save Schedule
  const handleSaveSchedule = async () => {
    if (!selectedProgrammeId) {
      toast.error("Please select a programme")
      return
    }
    if (!scheduleDate) {
      toast.error("Please select a date")
      return
    }
    if (!startTime || !endTime) {
      toast.error("Please specify both start and end times")
      return
    }

    const startMins = timeToMinutes(startTime)
    const endMins = timeToMinutes(endTime)

    if (endMins <= startMins) {
      toast.error("End time must be after start time")
      return
    }

    // Check duplicate schedule entry
    const isDuplicate = schedules.some(
      (s) =>
        s.id !== editingScheduleId &&
        s.programme_id === selectedProgrammeId &&
        s.schedule_date === scheduleDate &&
        s.start_time.slice(0, 5) === startTime.slice(0, 5)
    )

    if (isDuplicate) {
      toast.error("This programme is already scheduled for the exact same date and start time")
      return
    }

    setSaving(true)

    const payload = {
      programme_id: selectedProgrammeId,
      schedule_date: scheduleDate,
      start_time: startTime + ":00",
      end_time: endTime + ":00",
      updated_at: new Date().toISOString(),
    }

    if (editingScheduleId) {
      const { error } = await (supabase.from("programme_schedules") as any)
        .update(payload)
        .eq("id", editingScheduleId)

      if (error) {
        toast.error("Failed to update schedule: " + error.message)
        console.error(error)
      } else {
        toast.success("Programme schedule updated successfully")
        setIsModalOpen(false)
        fetchData()
      }
    } else {
      const { error } = await (supabase.from("programme_schedules") as any)
        .insert(payload)

      if (error) {
        if (error.message?.includes("table") || error.code === "42P01") {
          toast.error("Database table 'programme_schedules' missing. Run migration script 20260812000000_create_programme_schedules.sql")
          setDbTableMissing(true)
        } else {
          toast.error("Failed to add schedule: " + error.message)
        }
        console.error(error)
      } else {
        toast.success("Programme added to schedule successfully")
        setIsModalOpen(false)
        fetchData()
      }
    }

    setSaving(false)
  }

  // Delete Schedule
  const handleDeleteSchedule = async () => {
    if (!deleteSchedule) return
    setDeleting(true)

    const { error } = await (supabase.from("programme_schedules") as any)
      .delete()
      .eq("id", deleteSchedule.id)

    if (error) {
      toast.error("Failed to delete schedule: " + error.message)
    } else {
      toast.success("Schedule deleted successfully")
      setDeleteSchedule(null)
      fetchData()
    }
    setDeleting(false)
  }

  // Unique list of dates present in schedules
  const availableDates = useMemo(() => {
    const datesSet = new Set(schedules.map((s) => s.schedule_date))
    return Array.from(datesSet).sort()
  }, [schedules])

  // Filtered schedules for table view
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      // Date filter
      if (selectedDateFilter !== "ALL" && s.schedule_date !== selectedDateFilter) {
        return false
      }
      // Text search
      const q = searchQuery.toLowerCase()
      const code = s.programme?.event_code?.toLowerCase() || ""
      const name = s.programme?.name?.toLowerCase() || ""
      const category = s.programme?.category?.toLowerCase() || ""

      return code.includes(q) || name.includes(q) || category.includes(q)
    })
  }, [schedules, selectedDateFilter, searchQuery])

  // Filter modal programmes
  const filteredModalEvents = events.filter((e) => {
    const q = programmeSearch.toLowerCase()
    return (
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.event_code && e.event_code.toLowerCase().includes(q))
    )
  })

  // Set of scheduled programme IDs
  const scheduledProgrammeIds = useMemo(() => {
    return new Set(schedules.map((s) => s.programme_id))
  }, [schedules])

  return (
    <div className="space-y-6 font-sans">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy flex items-center gap-2">
            <CalendarClock className="size-6 text-gold" />
            Programme Schedule
          </h1>
          <p className="text-sm text-slatebrand mt-1">
            Schedule festival programmes by date & time and automatically detect participant conflicts.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <Button
            onClick={() => runClashAnalysis(schedules, true)}
            disabled={checkingClashes}
            className="bg-ivory hover:bg-gold/15 text-navy border border-navy/15 gap-2 rounded-xl h-11 px-5 font-bold shadow-xs cursor-pointer"
          >
            {checkingClashes ? (
              <Loader2 className="size-4 animate-spin text-gold" />
            ) : (
              <AlertTriangle className="size-4 text-amber-600" />
            )}
            <span>Find Clashes</span>
          </Button>

          <Button
            onClick={() => handleOpenAddModal()}
            className="bg-navy hover:bg-navy/90 text-ivory gap-2 shadow-premium rounded-xl px-5 h-11 cursor-pointer font-bold"
          >
            <Plus className="size-4 text-gold" />
            <span>+ Add Programme</span>
          </Button>
        </div>
      </div>

      {/* Database Table Missing Notice */}
      {dbTableMissing && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-950 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-navy">Database Migration Required</p>
              <p className="text-slatebrand font-medium">
                The <code className="font-mono bg-amber-500/15 px-1 py-0.5 rounded text-navy font-bold">programme_schedules</code> table is not present in your Supabase database yet.
              </p>
            </div>
          </div>
          <div className="font-mono text-[11px] bg-navy text-ivory p-2.5 rounded-xl select-all shrink-0">
            Run migration: 20260812000000_create_programme_schedules.sql
          </div>
        </div>
      )}

      {/* Clashes Banner Alert (if clashes present) */}
      {clashesList.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-950 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-navy">
                ⚠ {clashesList.length} Participant Conflict{clashesList.length === 1 ? "" : "s"} Detected
              </p>
              <p className="text-slatebrand font-medium">
                Overlapping programmes have participants scheduled at the exact same time.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsClashModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-9 px-4 font-bold shrink-0 cursor-pointer"
          >
            Inspect Clashes
          </Button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
          <Input
            placeholder="Search by code, programme name, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-ivory/80 border-navy/10 focus:border-gold rounded-xl shadow-xs text-sm"
          />
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedDateFilter("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
              selectedDateFilter === "ALL"
                ? "bg-navy text-ivory border-navy shadow-xs"
                : "bg-white/70 border-navy/10 text-slatebrand hover:border-navy/25"
            }`}
          >
            All Dates ({schedules.length})
          </button>

          {availableDates.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDateFilter(d)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                selectedDateFilter === d
                  ? "bg-navy text-ivory border-navy shadow-xs"
                  : "bg-white/70 border-navy/10 text-slatebrand hover:border-navy/25"
              }`}
            >
              {formatDateLabel(d)}
            </button>
          ))}
        </div>
      </div>

      {/* Chronological Schedule Table */}
      <div className="rounded-3xl border border-navy/10 bg-ivory/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slatebrand">
            <Loader2 className="size-8 animate-spin text-gold mb-2" />
            <p className="text-sm font-medium">Loading schedule...</p>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="size-16 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-4">
              <CalendarClock className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-navy">No Scheduled Programmes</h3>
            <p className="text-sm text-slatebrand max-w-md mt-1 mb-6">
              {searchQuery || selectedDateFilter !== "ALL"
                ? "No schedule entries match your search or date filter."
                : "No programmes have been scheduled yet. Click '+ Add Programme' to begin."}
            </p>
            {schedules.length === 0 && (
              <Button
                onClick={() => handleOpenAddModal()}
                className="bg-navy hover:bg-navy/90 text-ivory gap-2 rounded-xl cursor-pointer font-bold"
              >
                <Plus className="size-4 text-gold" /> Schedule First Programme
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy text-ivory text-xs uppercase tracking-wider font-extrabold border-b border-navy/10">
                <tr>
                  <th scope="col" className="px-5 py-4 w-16 text-center">
                    #
                  </th>
                  <th scope="col" className="px-5 py-4 min-w-[220px]">
                    Programme
                  </th>
                  <th scope="col" className="px-5 py-4 min-w-[140px]">
                    Date
                  </th>
                  <th scope="col" className="px-5 py-4 w-32">
                    Start Time
                  </th>
                  <th scope="col" className="px-5 py-4 w-32">
                    End Time
                  </th>
                  <th scope="col" className="px-5 py-4 min-w-[130px]">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-4 w-28 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5 text-navy font-medium">
                {filteredSchedules.map((sched, index) => {
                  const hasClash = !!sched.hasClash

                  return (
                    <tr
                      key={sched.id}
                      className={`transition-colors ${
                        hasClash ? "bg-amber-500/8 hover:bg-amber-500/12" : "hover:bg-navy/4"
                      }`}
                    >
                      {/* Index */}
                      <td className="px-5 py-4 text-center font-mono font-bold text-slatebrand">
                        {index + 1}
                      </td>

                      {/* Programme Code + Name + Category */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-extrabold text-navy bg-navy/8 px-2.5 py-0.5 rounded-md border border-navy/10">
                            {sched.programme?.event_code || "N/A"}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase text-slatebrand bg-navy/5 px-2 py-0.5 rounded-md">
                            {sched.programme?.category}
                          </span>
                        </div>
                        <div className="font-bold text-navy text-base leading-snug">
                          {sched.programme?.name}
                        </div>
                      </td>

                      {/* Schedule Date */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-bold text-navy">
                          <Calendar className="size-3.5 text-gold shrink-0" />
                          <span>{formatDateLabel(sched.schedule_date)}</span>
                        </div>
                      </td>

                      {/* Start Time */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-mono font-extrabold text-navy text-sm">
                          <Clock className="size-3.5 text-slatebrand" />
                          <span>{format12Hour(sched.start_time)}</span>
                        </div>
                      </td>

                      {/* End Time */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-mono font-extrabold text-navy text-sm">
                          <Clock className="size-3.5 text-slatebrand" />
                          <span>{format12Hour(sched.end_time)}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        {hasClash ? (
                          <button
                            type="button"
                            onClick={() => setIsClashModalOpen(true)}
                            className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-amber-500/15 text-amber-900 border border-amber-500/30 px-3 py-1 rounded-full cursor-pointer hover:bg-amber-500/25 transition-all shadow-xs"
                          >
                            <AlertTriangle className="size-3.5 text-amber-600" />
                            <span>⚠ Clash</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-emerald-500/15 text-emerald-900 border border-emerald-500/30 px-3 py-1 rounded-full">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            <span>✓ No Clash</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAddModal(sched)}
                            className="size-8 p-0 text-navy hover:bg-navy/8 rounded-lg cursor-pointer"
                            title="Edit Schedule"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteSchedule(sched)}
                            className="size-8 p-0 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                            title="Delete Schedule"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Schedule Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-ivory border border-navy/10 shadow-2xl rounded-3xl p-6 sm:p-8">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-black text-navy flex items-center gap-2">
              <Sparkles className="size-5 text-gold" />
              {editingScheduleId ? "Edit Programme Schedule" : "Schedule a Programme"}
            </DialogTitle>
            <DialogDescription className="text-slatebrand text-sm">
              Select an existing programme from the database, set the date and times.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* 1. Programme Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                Select Programme
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
                <Input
                  placeholder="Search programme by code or name..."
                  value={programmeSearch}
                  onChange={(e) => setProgrammeSearch(e.target.value)}
                  className="pl-9 h-10 bg-ivory/90 border-navy/15 rounded-xl text-sm"
                />
              </div>

              {/* Scrollable Programme Selection List */}
              <div className="max-h-44 overflow-y-auto rounded-2xl border border-navy/15 bg-white/80 p-1.5 space-y-1 scrollbar-thin">
                {filteredModalEvents.length === 0 ? (
                  <p className="p-3 text-xs text-center text-slatebrand">
                    No programmes found matching search.
                  </p>
                ) : (
                  filteredModalEvents.map((evt) => {
                    const isSelected = selectedProgrammeId === evt.id
                    const isScheduled = scheduledProgrammeIds.has(evt.id)

                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => setSelectedProgrammeId(evt.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-navy text-ivory border-2 border-gold ring-2 ring-gold/40 font-black shadow-md"
                            : isScheduled
                            ? "bg-emerald-500/10 text-emerald-950 border border-emerald-500/25 font-semibold"
                            : "hover:bg-navy/6 text-navy font-medium bg-white/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span
                            className={`font-mono text-[11px] px-2 py-0.5 rounded-md font-extrabold shrink-0 ${
                              isSelected
                                ? "bg-gold text-navy font-black"
                                : isScheduled
                                ? "bg-emerald-600 text-white"
                                : "bg-navy/8 text-navy"
                            }`}
                          >
                            {evt.event_code || "N/A"}
                          </span>
                          <span className={`truncate ${isSelected ? "text-ivory font-black text-sm" : ""}`}>{evt.name}</span>
                        </div>

                        {isSelected ? (
                          <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-gold text-navy shadow-sm shrink-0">
                            <Check className="size-3 stroke-[3]" />
                            <span>SELECTED</span>
                          </span>
                        ) : isScheduled ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600/15 text-emerald-700 shrink-0">
                            <Check className="size-3 stroke-[3]" />
                            <span>Scheduled</span>
                          </span>
                        ) : null}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* 2. Schedule Date Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                Date
              </Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="h-11 bg-white border-navy/15 rounded-xl text-sm font-semibold text-navy"
              />
            </div>

            {/* 3. Start & End Time Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                  Start Time
                </Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-11 bg-white border-navy/15 rounded-xl text-sm font-bold font-mono text-navy"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                  End Time
                </Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-11 bg-white border-navy/15 rounded-xl text-sm font-bold font-mono text-navy"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-navy/15 text-navy hover:bg-navy/5 rounded-xl h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={saving || !selectedProgrammeId || !scheduleDate || !startTime || !endTime}
              className="bg-navy hover:bg-navy/90 text-ivory gap-2 rounded-xl h-11 px-6 shadow-premium cursor-pointer font-bold"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin text-gold" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="size-4 text-gold" />
                  Add to Schedule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clashes Analysis Modal */}
      <Dialog open={isClashModalOpen} onOpenChange={setIsClashModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-ivory border border-navy/10 shadow-2xl rounded-3xl p-6 sm:p-8 scrollbar-thin">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-black text-navy flex items-center gap-2">
              {clashesList.length > 0 ? (
                <AlertTriangle className="size-6 text-amber-600" />
              ) : (
                <CheckCircle2 className="size-6 text-emerald-600" />
              )}
              {clashesList.length > 0 ? `CLASHES FOUND: ${clashesList.length}` : "No Clashes Found"}
            </DialogTitle>
            <DialogDescription className="text-slatebrand text-sm">
              {clashesList.length > 0
                ? "The following scheduled programmes have overlapping time slots on the same date with shared registered participants."
                : "All scheduled programmes can be conducted without any participant being assigned to overlapping programmes."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4">
            {clashesList.length === 0 ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-950 text-center space-y-2">
                <CheckCircle2 className="size-12 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-base text-emerald-900">✓ Schedule Clear</h4>
                <p className="text-xs font-semibold text-emerald-800 leading-relaxed max-w-md mx-auto">
                  Every participant has sufficient time to attend their registered events without schedule conflicts.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {clashesList.map((clash, idx) => (
                  <div
                    key={clash.id || idx}
                    className="p-5 rounded-2xl bg-white border border-amber-500/30 shadow-xs space-y-4"
                  >
                    {/* Clash Conflict Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-navy/5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-4 text-amber-600" />
                        <span className="font-bold text-xs uppercase tracking-wider text-amber-900">
                          Conflict #{idx + 1} — {formatDateLabel(clash.date)}
                        </span>
                      </div>
                    </div>

                    {/* Programme A ↔ Programme B */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-navy/4">
                      {/* Programme A */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-extrabold bg-navy text-ivory px-2 py-0.5 rounded">
                            {clash.programmeA.event_code || "A"}
                          </span>
                          <span className="font-bold text-navy text-sm">{clash.programmeA.name}</span>
                        </div>
                        <div className="text-xs font-mono font-semibold text-slatebrand flex items-center gap-1">
                          <Clock className="size-3" />
                          <span>{format12Hour(clash.timeA.start)} – {format12Hour(clash.timeA.end)}</span>
                        </div>
                      </div>

                      {/* Programme B */}
                      <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-navy/10 pt-2 sm:pt-0 sm:pl-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-extrabold bg-navy text-ivory px-2 py-0.5 rounded">
                            {clash.programmeB.event_code || "B"}
                          </span>
                          <span className="font-bold text-navy text-sm">{clash.programmeB.name}</span>
                        </div>
                        <div className="text-xs font-mono font-semibold text-slatebrand flex items-center gap-1">
                          <Clock className="size-3" />
                          <span>{format12Hour(clash.timeB.start)} – {format12Hour(clash.timeB.end)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Common Participants List */}
                    <div className="space-y-2">
                      <Label className="text-xs font-extrabold uppercase tracking-wider text-navy block">
                        Common Participants ({clash.commonParticipants.length}):
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {clash.commonParticipants.map((st) => (
                          <span
                            key={st.id}
                            className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-500/15 text-amber-950 px-3 py-1 rounded-xl border border-amber-500/25"
                          >
                            <span className="font-mono text-[10px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-extrabold">
                              #{st.chest_no}
                            </span>
                            <span>{st.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              onClick={() => setIsClashModalOpen(false)}
              className="bg-navy hover:bg-navy/90 text-ivory rounded-xl h-11 px-6 font-bold cursor-pointer"
            >
              Close Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteSchedule} onOpenChange={(open) => !open && setDeleteSchedule(null)}>
        <DialogContent className="max-w-md bg-ivory border border-navy/10 shadow-2xl rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-black text-navy flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Remove Schedule Entry
            </DialogTitle>
            <DialogDescription className="text-slatebrand text-sm">
              Are you sure you want to remove{" "}
              <span className="font-bold text-navy">{deleteSchedule?.programme?.name}</span> ({deleteSchedule?.programme?.event_code}) from the schedule for{" "}
              <span className="font-bold text-navy">{formatDateLabel(deleteSchedule?.schedule_date || "")}</span>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteSchedule(null)}
              className="border-navy/15 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSchedule}
              disabled={deleting}
              className="rounded-xl gap-2 cursor-pointer font-bold"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Remove Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
