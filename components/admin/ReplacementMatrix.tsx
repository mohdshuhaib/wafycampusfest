"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AlertCircle, Check, Info, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface Student {
  id: string
  name: string
  section: string
  chest_no: string | null
  team_id: string
}

interface Event {
  id: string
  name: string
  category: string
  max_participants_per_team: number
  applicable_section: string[] | null
}

interface Participation {
  id: string
  student_id: string
  event_id: string
  team_id: string
  status: string
}

interface SectionLimit {
  section: string
  category: string
  limit_count: number
}

interface Props {
  teamId: string
  teamName: string
}

const TABS = [
  { id: "SENIOR_ON", label: "Senior On", section: "Senior", cat: "ON STAGE" },
  { id: "SENIOR_OFF", label: "Senior Off", section: "Senior", cat: "OFF STAGE" },
  { id: "JUNIOR_ON", label: "Junior On", section: "Junior", cat: "ON STAGE" },
  { id: "JUNIOR_OFF", label: "Junior Off", section: "Junior", cat: "OFF STAGE" },
  { id: "SUB_ON", label: "Sub-Jr On", section: "Sub-Junior", cat: "ON STAGE" },
  { id: "SUB_OFF", label: "Sub-Jr Off", section: "Sub-Junior", cat: "OFF STAGE" },
  { id: "GENERAL_ON", label: "General On", section: "General", cat: "ON STAGE" },
  { id: "GENERAL_OFF", label: "General Off", section: "General", cat: "OFF STAGE" },
  { id: "FOUNDATION_ON", label: "Foundation On", section: "Foundation", cat: "ON STAGE" },
  { id: "FOUNDATION_OFF", label: "Foundation Off", section: "Foundation", cat: "OFF STAGE" },
]

export function ReplacementMatrix({ teamId, teamName }: Props) {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [students, setStudents] = useState<Student[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [limits, setLimits] = useState<SectionLimit[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      if (!teamId) return

      try {
        setLoading(true)

        const [stuRes, evtRes, partRes, limitRes] = await Promise.all([
          supabase.from("students").select("*").eq("team_id", teamId).order("name"),
          supabase.from("events").select("*").order("name"),
          supabase.from("participations").select("*").eq("team_id", teamId),
          supabase.from("section_limits").select("*"),
        ])

        if (stuRes.data) setStudents(stuRes.data as unknown as Student[])
        if (evtRes.data) setEvents(evtRes.data as unknown as Event[])
        if (partRes.data) setParticipations(partRes.data as unknown as Participation[])
        if (limitRes.data) setLimits(limitRes.data as unknown as SectionLimit[])
      } catch (e) {
        console.error("Load error", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [teamId])

  const filteredStudents = useMemo(() => {
    let list = students

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.chest_no && s.chest_no.toLowerCase().includes(q))
      )
    }

    if (activeTab.section === "General") {
      return list.filter((s) => s.section === "Senior" || s.section === "Junior")
    }
    if (activeTab.section === "Foundation") {
      return list.filter((s) => s.section === "Sub-Junior")
    }
    return list.filter((s) => s.section === activeTab.section)
  }, [students, activeTab, searchQuery])

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (e.category !== activeTab.cat) return false
      if (!e.applicable_section || e.applicable_section.length === 0) return false
      return e.applicable_section.includes(activeTab.section)
    })
  }, [events, activeTab])

  const getLimitStatus = (student: Student) => {
    const limitRule = limits.find((l) => l.section === activeTab.section && l.category === activeTab.cat)
    const limit = limitRule ? limitRule.limit_count : 100

    const count = participations.filter((p) => {
      const ev = events.find((e) => e.id === p.event_id)
      if (!ev) return false
      const isTabSectionEvent = ev.applicable_section?.includes(activeTab.section)
      return p.student_id === student.id && isTabSectionEvent && ev.category === activeTab.cat
    }).length

    return { count, limit, isFull: count >= limit, remaining: limit - count }
  }

  const handleToggle = async (studentId: string, eventId: string, isChecked: boolean) => {
    if (!teamId) return

    if (!isChecked) {
      setParticipations((prev) => prev.filter((p) => !(p.student_id === studentId && p.event_id === eventId)))

      const { error } = await supabase.from("participations").delete().match({ student_id: studentId, event_id: eventId, team_id: teamId })

      if (error) {
        alert("Failed to remove participant")
      }
      return
    }

    const student = students.find((s) => s.id === studentId)
    const event = events.find((e) => e.id === eventId)
    if (!student || !event) return

    const { isFull, limit } = getLimitStatus(student)

    if (isFull) {
      const confirm = window.confirm(`Limit reached. This student has hit the max of ${limit}. Proceed anyway?`)
      if (!confirm) return
    }

    const eventTeamCount = participations.filter((p) => p.event_id === eventId).length
    if (eventTeamCount >= event.max_participants_per_team) {
      const confirm = window.confirm(`Event full. This event already has ${event.max_participants_per_team} participants. Add anyway?`)
      if (!confirm) return
    }

    const tempId = Math.random().toString()
    const newPart = {
      id: tempId,
      student_id: studentId,
      event_id: eventId,
      team_id: teamId,
      status: "registered",
      created_at: new Date().toISOString(),
    } as any

    setParticipations((prev) => [...prev, newPart])

    const { data: inserted, error } = await (supabase.from("participations") as any).insert({
      student_id: studentId,
      event_id: eventId,
      team_id: teamId,
      status: "registered",
    }).select().single()

    if (error) {
      setParticipations((prev) => prev.filter((p) => p.id !== tempId))
      alert("Error adding: " + error.message)
    } else {
      setParticipations((prev) => prev.map((p) => p.id === tempId ? inserted : p))
    }
  }

  const getCellColor = (isRegistered: boolean, isDisabled: boolean) => {
    if (isRegistered) return "border-gold bg-gold text-navy shadow-[inset_0_0_0_1px_rgba(10,29,44,.18)]"
    if (isDisabled) return "border-navy/8 bg-navy/4"
    return "border-navy/8 bg-ivory hover:bg-gold/10 hover:border-gold/30"
  }

  const getLimitBadgeColor = (isFull: boolean) => {
    return isFull
      ? "border-success/20 bg-success/10 text-success"
      : "border-navy/10 bg-ivory text-slatebrand"
  }

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2 text-slatebrand">
        <Loader2 className="size-5 animate-spin text-gold" />
        <p className="text-sm font-bold">Loading {teamName}...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
            <Input
              placeholder="Search student or chest number"
              className="h-11 rounded-2xl pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-gold/20 bg-gold/10 px-3 py-2 text-xs font-bold text-navy">
            <AlertCircle className="size-4 text-gold" />
            <span>Admin mode allows overrides after confirmation.</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-1 scrollbar-none">
          <div className="flex w-max gap-1 rounded-2xl bg-navy/6 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] transition-all",
                  activeTab.id === tab.id
                    ? "bg-navy text-ivory shadow-premium"
                    : "text-slatebrand hover:bg-navy/7 hover:text-navy"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-navy/10 bg-ivory shadow-sm">
        {filteredEvents.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-slatebrand">
            <Info className="mb-2 size-12 opacity-30" />
            <p className="text-sm font-bold text-navy">No programmes available for this category.</p>
          </div>
        ) : (
          <div className="h-full w-full overflow-auto scrollbar-thin scrollbar-thumb-navy/18 scrollbar-track-transparent">
            <table className="w-full border-collapse bg-ivory text-sm">
              <thead className="sticky top-0 z-20 bg-mist shadow-sm">
                <tr>
                  <th className="sticky left-0 top-0 z-30 min-w-[150px] border-b border-r border-navy/10 bg-mist p-3 text-left shadow-[8px_0_18px_-18px_rgba(10,29,44,.45)] sm:min-w-64">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-black text-navy">Student</span>
                      <span className="hidden text-[10px] font-black uppercase tracking-[0.12em] text-slatebrand sm:block">
                        {activeTab.section} / {activeTab.cat}
                      </span>
                    </div>
                  </th>

                  {filteredEvents.map((event) => {
                    const count = participations.filter((p) => p.event_id === event.id).length
                    const limit = event.max_participants_per_team
                    const isFull = count >= limit

                    return (
                      <th key={event.id} className="h-44 min-w-[72px] border-b border-l border-navy/10 bg-mist p-2 align-bottom sm:min-w-24">
                        <div className="flex h-full w-full flex-col items-center justify-end gap-3 pb-2">
                          <Badge className={cn("h-6 border px-2 text-[10px] font-black", getLimitBadgeColor(isFull))}>
                            {count}/{limit}
                          </Badge>
                          <div
                            className="max-h-32 text-[11px] font-black tracking-wide text-navy"
                            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                          >
                            {event.name}
                          </div>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const { isFull, remaining } = getLimitStatus(student)

                  return (
                    <tr key={student.id} className="group border-b border-navy/8 hover:bg-gold/6">
                      <td className="sticky left-0 z-10 border-r border-navy/10 bg-ivory p-3 shadow-[8px_0_18px_-18px_rgba(10,29,44,.45)] group-hover:bg-[#f3ead8]">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-black text-navy sm:text-sm">{student.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slatebrand">
                            <span className="rounded-full bg-navy/7 px-2 py-0.5 font-mono text-navy">{student.chest_no || "-"}</span>
                            <span className="hidden sm:inline">{student.section}</span>
                          </div>
                          <Badge variant="outline" className={cn("mt-2 h-5 border px-2 text-[9px]", getLimitBadgeColor(isFull))}>
                            {isFull ? "Maxed" : `${remaining} left`}
                          </Badge>
                        </div>
                      </td>

                      {filteredEvents.map((event) => {
                        const isRegistered = participations.some((p) => p.student_id === student.id && p.event_id === event.id)
                        const eventCount = participations.filter((p) => p.event_id === event.id).length
                        const isEventFull = eventCount >= event.max_participants_per_team
                        const isVisualDisabled = !isRegistered && (isFull || isEventFull)

                        return (
                          <td key={`${student.id}-${event.id}`} className="relative border-b border-l border-navy/8 p-0 align-middle">
                            <label className={cn("absolute inset-0 flex cursor-pointer items-center justify-center border transition-all duration-200", getCellColor(isRegistered, isVisualDisabled))}>
                              <input
                                type="checkbox"
                                checked={isRegistered}
                                onChange={(e) => handleToggle(student.id, event.id, e.target.checked)}
                                className="peer sr-only"
                              />
                              {isRegistered && <Check className="size-5 animate-in zoom-in duration-200" strokeWidth={3} />}
                            </label>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
