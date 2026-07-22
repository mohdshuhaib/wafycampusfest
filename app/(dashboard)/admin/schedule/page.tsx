"use client"

import { useEffect, useMemo, useState } from "react"
import { addMinutes, format, isValid, parseISO } from "date-fns"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  GripVertical,
  Layers3,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Wand2,
  XCircle,
} from "lucide-react"

type ScheduleCategory = "ON STAGE" | "OFF STAGE"
type ScheduleStatus = "idle" | "success" | "error" | "warning"

interface EventRow {
  id: string
  name: string
  event_code: string | null
  category: string
  grade_type: string | null
  duration_minutes: number | null
}

interface ParticipationRow {
  event_id: string
  student_id: string | null
}

interface TimeWindow {
  id: string
  date: string
  start: string
  end: string
}

interface ScheduledItem {
  id: string
  eventId: string
  eventName: string
  eventCode: string | null
  gradeType: string | null
  duration: number
  date: string
  startMinute: number
  endMinute: number
  stage: number
  participantIds: string[]
}

interface ScheduleCell {
  date: string
  startMinute: number
  endMinute: number
  stage: number
  item: ScheduledItem | null
}

interface ScheduleMessage {
  status: ScheduleStatus
  title: string
  detail: string
}

function minutesToTimeLabel(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const suffix = hours >= 12 ? "pm" : "am"
  const hour12 = hours % 12 || 12
  return `${hour12}:${String(mins).padStart(2, "0")}${suffix}`
}

function parseTimeToMinutes(value: string) {
  if (!value) return null
  const [h, m] = value.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function formatScheduleDate(date: string) {
  const parsed = parseISO(date)
  if (!isValid(parsed)) return { dateLabel: date || "-", dayLabel: "-" }
  return {
    dateLabel: format(parsed, "dd/MM/yy"),
    dayLabel: format(parsed, "EEEE"),
  }
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd
}

function dateTimeKey(item: Pick<ScheduledItem, "date" | "startMinute" | "endMinute">) {
  return `${item.date}-${item.startMinute}-${item.endMinute}`
}

function cellKey(date: string, startMinute: number, endMinute: number, stage: number) {
  return `${date}-${startMinute}-${endMinute}-${stage}`
}

function getWindowMinutes(window: TimeWindow) {
  const start = parseTimeToMinutes(window.start)
  const end = parseTimeToMinutes(window.end)
  if (start === null || end === null || end <= start) return null
  return { start, end, length: end - start }
}

export default function AdminSchedulePage() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventRow[]>([])
  const [participations, setParticipations] = useState<ParticipationRow[]>([])
  const [category, setCategory] = useState<ScheduleCategory>("ON STAGE")
  const [stageCount, setStageCount] = useState(2)
  const [windows, setWindows] = useState<TimeWindow[]>([
    { id: crypto.randomUUID(), date: "", start: "09:00", end: "12:00" },
  ])
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([])
  const [unscheduledEvents, setUnscheduledEvents] = useState<EventRow[]>([])
  const [message, setMessage] = useState<ScheduleMessage>({
    status: "idle",
    title: "Ready to build schedule",
    detail: "Add dates, time windows, and stages, then process a clash-free draft.",
  })
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [eventsRes, partsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, name, event_code, category, grade_type, duration_minutes")
          .order("event_code", { ascending: true }),
        supabase.from("participations").select("event_id, student_id").not("student_id", "is", null),
      ])

      if (eventsRes.data) setEvents(eventsRes.data as EventRow[])
      if (partsRes.data) setParticipations(partsRes.data as ParticipationRow[])
      setLoading(false)
    }

    loadData()
  }, [])

  const participantMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    participations.forEach((row) => {
      if (!row.student_id) return
      if (!map.has(row.event_id)) map.set(row.event_id, new Set())
      map.get(row.event_id)?.add(row.student_id)
    })
    return map
  }, [participations])

  const schedulableEvents = useMemo(() => {
    return events
      .filter((event) => event.category === category)
      .filter((event) => (event.duration_minutes || 0) > 0)
      .sort((a, b) => {
        const aParticipants = participantMap.get(a.id)?.size || 0
        const bParticipants = participantMap.get(b.id)?.size || 0
        return bParticipants - aParticipants || (b.duration_minutes || 0) - (a.duration_minutes || 0)
      })
  }, [events, category, participantMap])

  const skippedEvents = useMemo(() => {
    return events.filter((event) => event.category === category && !event.duration_minutes)
  }, [events, category])

  const totalEventMinutes = useMemo(() => {
    return schedulableEvents.reduce((sum, event) => sum + (event.duration_minutes || 0), 0)
  }, [schedulableEvents])

  const availableStageMinutes = useMemo(() => {
    return windows.reduce((sum, window) => {
      const minutes = getWindowMinutes(window)
      return sum + (minutes?.length || 0) * stageCount
    }, 0)
  }, [windows, stageCount])

  const scheduleRows = useMemo(() => {
    const map = new Map<string, ScheduleCell[]>()

    scheduledItems.forEach((item) => {
      const key = dateTimeKey(item)
      if (!map.has(key)) {
        map.set(
          key,
          Array.from({ length: stageCount }, (_, index) => ({
            date: item.date,
            startMinute: item.startMinute,
            endMinute: item.endMinute,
            stage: index + 1,
            item: null,
          }))
        )
      }
      const row = map.get(key)
      const cell = row?.find((entry) => entry.stage === item.stage)
      if (cell) cell.item = item
    })

    return Array.from(map.values()).sort((a, b) => {
      const firstA = a[0]
      const firstB = b[0]
      return firstA.date.localeCompare(firstB.date) || firstA.startMinute - firstB.startMinute || firstA.endMinute - firstB.endMinute
    })
  }, [scheduledItems, stageCount])

  const updateWindow = (id: string, field: keyof TimeWindow, value: string) => {
    setWindows((prev) => prev.map((window) => window.id === id ? { ...window, [field]: value } : window))
  }

  const addWindow = () => {
    setWindows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), date: prev.at(-1)?.date || "", start: "09:00", end: "10:00" },
    ])
  }

  const removeWindow = (id: string) => {
    setWindows((prev) => prev.length === 1 ? prev : prev.filter((window) => window.id !== id))
  }

  const hasParticipantClash = (
    candidate: Pick<ScheduledItem, "eventId" | "date" | "startMinute" | "endMinute" | "participantIds">,
    current: ScheduledItem[],
    ignoreIds: string[] = []
  ) => {
    const participants = new Set(candidate.participantIds)
    if (participants.size === 0) return null

    return current.find((item) => {
      if (ignoreIds.includes(item.id)) return false
      if (item.eventId === candidate.eventId) return false
      if (item.date !== candidate.date) return false
      if (!overlaps(candidate.startMinute, candidate.endMinute, item.startMinute, item.endMinute)) return false
      return item.participantIds.some((id) => participants.has(id))
    }) || null
  }

  const hasStageClash = (
    candidate: Pick<ScheduledItem, "date" | "startMinute" | "endMinute" | "stage">,
    current: ScheduledItem[],
    ignoreIds: string[] = []
  ) => {
    return current.find((item) => {
      if (ignoreIds.includes(item.id)) return false
      return item.date === candidate.date
        && item.stage === candidate.stage
        && overlaps(candidate.startMinute, candidate.endMinute, item.startMinute, item.endMinute)
    }) || null
  }

  const buildSchedule = () => {
    const validWindows = windows
      .map((window) => ({ window, minutes: getWindowMinutes(window) }))
      .filter((entry): entry is { window: TimeWindow; minutes: { start: number; end: number; length: number } } => Boolean(entry.minutes && entry.window.date))
      .sort((a, b) => a.window.date.localeCompare(b.window.date) || a.minutes.start - b.minutes.start)

    if (validWindows.length === 0) {
      setMessage({ status: "error", title: "Add valid time windows", detail: "Each schedule window needs a date, start time, and end time." })
      return
    }

    if (schedulableEvents.length === 0) {
      setScheduledItems([])
      setUnscheduledEvents([])
      setMessage({ status: "warning", title: "No events to schedule", detail: `${category} has no events with duration minutes. Add duration to events you want in the schedule.` })
      return
    }

    const cursors = new Map<string, number>()
    validWindows.forEach(({ window, minutes }) => {
      for (let stage = 1; stage <= stageCount; stage++) {
        cursors.set(`${window.id}-${stage}`, minutes.start)
      }
    })

    const scheduled: ScheduledItem[] = []
    const unscheduled: EventRow[] = []

    for (const event of schedulableEvents) {
      const duration = event.duration_minutes || 0
      const participantIds = Array.from(participantMap.get(event.id) || [])
      let placed: ScheduledItem | null = null

      for (const { window, minutes } of validWindows) {
        if (placed) break
        for (let stage = 1; stage <= stageCount; stage++) {
          if (placed) break
          const cursorKey = `${window.id}-${stage}`
          let start = cursors.get(cursorKey) || minutes.start

          while (start + duration <= minutes.end) {
            const candidate = {
              id: crypto.randomUUID(),
              eventId: event.id,
              eventName: event.name,
              eventCode: event.event_code,
              gradeType: event.grade_type,
              duration,
              date: window.date,
              startMinute: start,
              endMinute: start + duration,
              stage,
              participantIds,
            }

            const clash = hasParticipantClash(candidate, scheduled)
            if (!clash) {
              placed = candidate
              scheduled.push(candidate)
              cursors.set(cursorKey, candidate.endMinute)
              break
            }

            start = clash.endMinute
          }
        }
      }

      if (!placed) unscheduled.push(event)
    }

    setScheduledItems(scheduled)
    setUnscheduledEvents(unscheduled)

    if (unscheduled.length > 0) {
      const missingMinutes = unscheduled.reduce((sum, event) => sum + (event.duration_minutes || 0), 0)
      const approxMoreClockMinutes = Math.ceil(missingMinutes / Math.max(stageCount, 1))
      setMessage({
        status: "error",
        title: "Time is not enough",
        detail: `${unscheduled.length} events could not be scheduled. Add about ${approxMoreClockMinutes} more clock minutes across ${stageCount} stage${stageCount === 1 ? "" : "s"}, or add another day/window.`,
      })
    } else {
      setMessage({
        status: "success",
        title: "Schedule created successfully",
        detail: `${scheduled.length} events scheduled with no participant clashes. ${skippedEvents.length} events skipped because duration is empty.`,
      })
    }
  }

  const moveItem = (target: ScheduleCell) => {
    if (!draggedItemId) return
    const dragged = scheduledItems.find((item) => item.id === draggedItemId)
    if (!dragged) return

    if (target.endMinute - target.startMinute < dragged.duration) {
      setMessage({
        status: "error",
        title: "Cannot move event",
        detail: `${dragged.eventName} needs ${dragged.duration} min, but this slot is only ${target.endMinute - target.startMinute} min.`,
      })
      setDraggedItemId(null)
      return
    }

    const targetItem = target.item
    if (targetItem && dragged.endMinute - dragged.startMinute < targetItem.duration) {
      setMessage({
        status: "error",
        title: "Cannot swap events",
        detail: `${targetItem.eventName} needs ${targetItem.duration} min, but the original slot is only ${dragged.endMinute - dragged.startMinute} min.`,
      })
      setDraggedItemId(null)
      return
    }

    const nextItems = scheduledItems.map((item) => {
      if (item.id === dragged.id) {
        return {
          ...item,
          date: target.date,
          startMinute: target.startMinute,
          endMinute: target.startMinute + item.duration,
          stage: target.stage,
        }
      }

      if (targetItem && item.id === targetItem.id) {
        return {
          ...item,
          date: dragged.date,
          startMinute: dragged.startMinute,
          endMinute: dragged.startMinute + item.duration,
          stage: dragged.stage,
        }
      }

      return item
    })

    const moved = nextItems.find((item) => item.id === dragged.id)!
    const swapped = targetItem ? nextItems.find((item) => item.id === targetItem.id) : null
    const movedStageClash = hasStageClash(moved, nextItems, [moved.id, swapped?.id || ""])
    const swappedStageClash = swapped ? hasStageClash(swapped, nextItems, [moved.id, swapped.id]) : null
    const movedClash = hasParticipantClash(moved, nextItems, [moved.id, swapped?.id || ""])
    const swappedClash = swapped ? hasParticipantClash(swapped, nextItems, [moved.id, swapped.id]) : null

    if (movedStageClash || swappedStageClash) {
      const clash = movedStageClash || swappedStageClash
      setMessage({
        status: "error",
        title: "Move rejected: stage overlap",
        detail: `${movedStageClash ? moved.eventName : swapped?.eventName} overlaps with ${clash?.eventName} on Stage-${clash?.stage}.`,
      })
      setDraggedItemId(null)
      return
    }

    if (movedClash || swappedClash) {
      const clash = movedClash || swappedClash
      setMessage({
        status: "error",
        title: "Move rejected: participant clash",
        detail: `${movedClash ? moved.eventName : swapped?.eventName} clashes with ${clash?.eventName} at ${minutesToTimeLabel(clash?.startMinute || 0)}.`,
      })
      setDraggedItemId(null)
      return
    }

    setScheduledItems(nextItems)
    setMessage({
      status: "success",
      title: "Schedule updated",
      detail: "The event was moved and no participant clash was found.",
    })
    setDraggedItemId(null)
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <div className="surface-elevated flex items-center gap-3 rounded-3xl px-5 py-4">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold text-navy">Preparing schedule studio</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-20 md:pb-4">
      <section className="surface-dark relative overflow-hidden rounded-[2rem] p-5 sm:p-6">
        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <Badge variant="gold" className="h-8 gap-2 px-3">
              <Sparkles className="size-3.5" />
              Schedule Studio
            </Badge>
            <h1 className="text-display mt-4 text-3xl text-ivory sm:text-4xl">Build clash-free programme flow.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/62">
              Choose On Stage or Off Stage, add flexible date windows, and generate a draft that avoids participant clashes.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 xl:w-[34rem]">
            <Metric label="Events" value={schedulableEvents.length} />
            <Metric label="Event Minutes" value={totalEventMinutes} />
            <Metric label="Stage Minutes" value={availableStageMinutes} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="surface-elevated rounded-[2rem] p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-navy text-gold">
                <CalendarClock className="size-5" />
              </div>
              <div>
                <h2 className="text-title text-xl text-navy">Schedule Inputs</h2>
                <p className="text-xs font-semibold text-slatebrand">Define category, stages, dates, and available time.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.12em] text-slatebrand">Programme Type</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as ScheduleCategory)}>
                    <SelectTrigger className="h-11 rounded-2xl bg-ivory">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="surface-elevated rounded-2xl border-navy/10">
                      <SelectItem value="ON STAGE">On Stage</SelectItem>
                      <SelectItem value="OFF STAGE">Off Stage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.12em] text-slatebrand">Stages</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={stageCount}
                    onChange={(event) => setStageCount(Math.max(1, Math.min(12, Number(event.target.value) || 1)))}
                    className="h-11 rounded-2xl bg-ivory"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black uppercase tracking-[0.12em] text-slatebrand">Date & Time Windows</Label>
                  <Button variant="outline" size="sm" onClick={addWindow}>
                    <Plus className="size-3.5" />
                    Add
                  </Button>
                </div>

                <div className="space-y-3">
                  {windows.map((window, index) => (
                    <div key={window.id} className="rounded-3xl border border-navy/10 bg-ivory/70 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-full bg-navy/7 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slatebrand">
                          Window {index + 1}
                        </span>
                        <Button variant="ghost" size="icon-sm" onClick={() => removeWindow(window.id)} disabled={windows.length === 1}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        <Input type="date" value={window.date} onChange={(event) => updateWindow(window.id, "date", event.target.value)} />
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="time" value={window.start} onChange={(event) => updateWindow(window.id, "start", event.target.value)} />
                          <Input type="time" value={window.end} onChange={(event) => updateWindow(window.id, "end", event.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={buildSchedule} className="bg-gold text-navy hover:bg-gold/90">
                  <Wand2 className="size-4" />
                  Process Schedule
                </Button>
                <Button variant="outline" onClick={() => { setScheduledItems([]); setUnscheduledEvents([]); setMessage({ status: "idle", title: "Schedule cleared", detail: "Adjust inputs and process again." }) }}>
                  <RotateCcw className="size-4" />
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <StatusPanel message={message} />

          {skippedEvents.length > 0 && (
            <div className="surface-panel rounded-[2rem] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-black text-navy">
                <Layers3 className="size-4 text-gold" />
                Skipped Events
              </div>
              <p className="text-xs font-semibold leading-5 text-slatebrand">
                {skippedEvents.length} {category} event{skippedEvents.length === 1 ? "" : "s"} have no duration, so they are not included in clash scheduling.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <ScheduleTable
            category={category}
            stageCount={stageCount}
            rows={scheduleRows}
            draggedItemId={draggedItemId}
            setDraggedItemId={setDraggedItemId}
            onDropCell={moveItem}
          />

          {unscheduledEvents.length > 0 && (
            <div className="surface-elevated rounded-[2rem] p-4">
              <h3 className="text-title text-lg text-navy">Unscheduled Events</h3>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {unscheduledEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3">
                    <div className="text-sm font-black text-navy">{event.name}</div>
                    <div className="mt-1 text-xs font-semibold text-destructive">
                      {event.event_code || "No code"} · {event.duration_minutes} min
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
      <div className="text-title text-2xl text-ivory">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">{label}</div>
    </div>
  )
}

function StatusPanel({ message }: { message: ScheduleMessage }) {
  const Icon = message.status === "success" ? CheckCircle2 : message.status === "error" ? XCircle : message.status === "warning" ? AlertTriangle : CalendarClock
  const tone = {
    idle: "border-navy/10 bg-ivory text-navy",
    success: "border-success/20 bg-success/10 text-success",
    warning: "border-gold/25 bg-gold/10 text-navy",
    error: "border-destructive/20 bg-destructive/10 text-destructive",
  }[message.status]

  return (
    <div className={cn("rounded-[2rem] border p-4", tone)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" />
        <div>
          <div className="text-sm font-black">{message.title}</div>
          <p className="mt-1 text-xs font-semibold leading-5 opacity-80">{message.detail}</p>
        </div>
      </div>
    </div>
  )
}

function ScheduleTable({
  category,
  stageCount,
  rows,
  draggedItemId,
  setDraggedItemId,
  onDropCell,
}: {
  category: ScheduleCategory
  stageCount: number
  rows: ScheduleCell[][]
  draggedItemId: string | null
  setDraggedItemId: (id: string | null) => void
  onDropCell: (cell: ScheduleCell) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="surface-elevated grid min-h-[520px] place-items-center rounded-[2rem] p-8 text-center">
        <div className="max-w-md">
          <CalendarClock className="mx-auto mb-4 size-12 text-slatebrand/35" />
          <h2 className="text-title text-xl text-navy">No schedule generated yet</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slatebrand">
            Add time windows and click Process Schedule to create a clash-free draft.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="surface-elevated overflow-hidden rounded-[2rem]">
      <div className="border-b border-navy/10 bg-navy px-5 py-4 text-ivory">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-title text-xl">{category === "ON STAGE" ? "On Stage" : "Off Stage"} Schedule</h2>
            <p className="mt-1 text-xs font-semibold text-ivory/55">Drag events between cells to adjust. Every move checks participant clashes.</p>
          </div>
          <Badge variant="gold" className="h-8 px-3">{stageCount} Stage{stageCount === 1 ? "" : "s"}</Badge>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#F2F1EE]">
              <th className="sticky left-0 z-20 min-w-32 border-b border-r border-navy/10 bg-[#F2F1EE] p-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slatebrand">
                Date
              </th>
              <th className="min-w-36 border-b border-r border-navy/10 p-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slatebrand">
                Time
              </th>
              {Array.from({ length: stageCount }, (_, index) => (
                <th key={index} className="min-w-64 border-b border-r border-navy/10 p-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slatebrand">
                  Stage-{index + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const first = row[0]
              const labels = formatScheduleDate(first.date)
              return (
                <tr key={dateTimeKey(first)} className="border-b border-navy/8">
                  <td className="sticky left-0 z-10 border-r border-navy/10 bg-[#F6F2E8] p-3 shadow-[8px_0_18px_-18px_rgba(10,29,44,.45)]">
                    <div className="text-sm font-black text-navy">{labels.dateLabel}</div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-slatebrand">{labels.dayLabel}</div>
                  </td>
                  <td className="border-r border-navy/10 bg-ivory/70 p-3 font-mono text-xs font-black text-navy">
                    {minutesToTimeLabel(first.startMinute)} - {minutesToTimeLabel(first.endMinute)}
                  </td>
                  {row.map((cell) => (
                    <td
                      key={cellKey(cell.date, cell.startMinute, cell.endMinute, cell.stage)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => onDropCell(cell)}
                      className={cn(
                        "h-24 border-r border-navy/8 bg-ivory/55 p-2 align-top transition-colors",
                        draggedItemId && "bg-gold/6"
                      )}
                    >
                      {cell.item ? (
                        <div
                          draggable
                          onDragStart={() => setDraggedItemId(cell.item!.id)}
                          onDragEnd={() => setDraggedItemId(null)}
                          className={cn(
                            "h-full cursor-grab rounded-2xl border border-gold/25 bg-gold/12 p-3 shadow-sm transition active:cursor-grabbing",
                            draggedItemId === cell.item.id && "opacity-45"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="mt-0.5 size-4 shrink-0 text-gold" />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-navy">{cell.item.eventName}</div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                <span className="rounded-full bg-navy px-2 py-0.5 font-mono text-[10px] font-bold text-ivory">
                                  {cell.item.eventCode || "No Code"}
                                </span>
                                <span className="rounded-full bg-ivory px-2 py-0.5 text-[10px] font-black text-slatebrand">
                                  {cell.item.duration} min
                                </span>
                                <span className="rounded-full bg-ivory px-2 py-0.5 text-[10px] font-black text-slatebrand">
                                  Grade {cell.item.gradeType || "-"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid h-full place-items-center rounded-2xl border border-dashed border-navy/12 text-[10px] font-black uppercase tracking-[0.1em] text-slatebrand/55">
                          Drop Here
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
