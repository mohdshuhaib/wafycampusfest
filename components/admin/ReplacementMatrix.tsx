"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { AlertCircle, Check, Info, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { StudentPhoto } from "@/components/student-photo"

interface Student {
  id: string
  name: string
  section: string
  chest_no: string | null
  image_link: string | null
  team_id: string
}

interface Event {
  id: string
  name: string
  category: string
  grade_type: string | null
  max_participants_per_team: number
  applicable_section: string[] | null
}

interface Participation {
  id: string
  student_id: string | null
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
  { id: "GENERAL", label: "General", section: "Senior", cat: "GENERAL" },
  { id: "SPECIAL", label: "Special", section: "Senior", cat: "SPECIAL" },
]

export function ReplacementMatrix({ teamId, teamName }: Props) {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [students, setStudents] = useState<Student[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [limits, setLimits] = useState<SectionLimit[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null)

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

    return activeTab.cat === "SPECIAL" ? [] : list.filter((s) => s.section === "Senior")
  }, [students, activeTab, searchQuery])

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (activeTab.cat === "GENERAL" && e.grade_type !== "C") return false
      if (activeTab.cat === "SPECIAL" && e.grade_type !== "D") return false
      if (activeTab.cat !== "GENERAL" && activeTab.cat !== "SPECIAL") {
        if (e.category !== activeTab.cat) return false
        if (e.grade_type === "C" || e.grade_type === "D") return false
      }
      if (!e.applicable_section || e.applicable_section.length === 0) return false
      return e.applicable_section.includes(activeTab.section)
    })
  }, [events, activeTab])

  const getLimitStatus = (student: Student) => {
    const countByCategory = (category: string) => participations.filter((p) => {
      const ev = events.find((e) => e.id === p.event_id)
      if (!ev) return false
      if (p.student_id !== student.id) return false
      if (category === "GENERAL") return ev.grade_type === "C"
      return ev.category === category && ev.grade_type !== "C" && ev.grade_type !== "D"
    }).length

    const currentCount = countByCategory(activeTab.cat)
    const onOffTotal = countByCategory("ON STAGE") + countByCategory("OFF STAGE")
    const limit = activeTab.cat === "GENERAL" ? 2 : 4
    const totalLimit = activeTab.cat === "GENERAL" ? 2 : 6
    const totalCount = activeTab.cat === "GENERAL" ? currentCount : onOffTotal
    const isFull = currentCount >= limit || totalCount >= totalLimit

    return { count: currentCount, limit, isFull, remaining: Math.max(0, Math.min(limit - currentCount, totalLimit - totalCount)) }
  }

  const handleToggle = async (studentId: string, eventId: string, isChecked: boolean) => {
    if (!teamId) return

    if (!isChecked) {
      setParticipations((prev) => prev.filter((p) => !(p.student_id === studentId && p.event_id === eventId)))

      const { error } = await supabase.from("participations").delete().match({ student_id: studentId, event_id: eventId, team_id: teamId })

      if (error) {
        setNotice({ title: "Could not remove participant", message: error.message })
      }
      return
    }

    const student = students.find((s) => s.id === studentId)
    const event = events.find((e) => e.id === eventId)
    if (!student || !event) return

    const { isFull, limit } = getLimitStatus(student)

    if (isFull) {
      setNotice({
        title: "Maximum reached",
        message: activeTab.cat === "GENERAL"
          ? "This student already reached the 2 programme General limit."
          : "This student already reached the 6 total On/Off limit or the 4 programme stage limit.",
      })
      return
    }

    const eventTeamCount = participations.filter((p) => p.event_id === eventId).length
    if (eventTeamCount >= event.max_participants_per_team) {
      setNotice({ title: "Programme full", message: `This programme allows only ${event.max_participants_per_team} participants from this team.` })
      return
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
      setNotice({ title: "Could not save", message: error.message })
    } else {
      setParticipations((prev) => prev.map((p) => p.id === tempId ? inserted : p))
    }
  }

  const handleTeamToggle = async (eventId: string, isChecked: boolean) => {
    if (!teamId) return

    if (!isChecked) {
      setParticipations((prev) => prev.filter((p) => !(p.student_id === null && p.event_id === eventId && p.team_id === teamId)))
      await supabase.from("participations").delete().match({ event_id: eventId, team_id: teamId }).is("student_id", null)
      return
    }

    const tempId = Math.random().toString()
    const newPart = { id: tempId, student_id: null, event_id: eventId, team_id: teamId, status: "registered" } as Participation
    setParticipations((prev) => [...prev, newPart])

    const { data: inserted, error } = await (supabase.from("participations") as any).insert({
      student_id: null,
      event_id: eventId,
      team_id: teamId,
      status: "registered",
    }).select().single()

    if (error) {
      setParticipations((prev) => prev.filter((p) => p.id !== tempId))
      setNotice({ title: "Could not save team participation", message: error.message })
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
    <div className="w-full space-y-4">
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
            <span>{activeTab.cat === "SPECIAL" ? "Special events are registered once for the full team." : "Committee mode follows the same participant limits as captain registration."}</span>
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

      <div className="relative rounded-3xl border border-navy/10 bg-ivory shadow-sm">
        {filteredEvents.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center text-center text-slatebrand">
            <Info className="mb-2 size-12 opacity-30" />
            <p className="text-sm font-bold text-navy">No programmes available for this category.</p>
          </div>
        ) : activeTab.cat === "SPECIAL" ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event) => {
              const isRegistered = participations.some((p) => p.event_id === event.id && p.team_id === teamId && p.student_id === null)
              return (
                <label key={event.id} className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-3xl border p-4 transition", isRegistered ? "border-gold/40 bg-gold/12" : "border-navy/10 bg-ivory hover:bg-gold/6")}>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-navy">{event.name}</div>
                    <div className="mt-1 text-xs font-semibold text-slatebrand">Grade D Team Participation</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isRegistered}
                    onChange={(e) => handleTeamToggle(event.id, e.target.checked)}
                    className="size-5 accent-[#D4AF37]"
                  />
                </label>
              )
            })}
          </div>
        ) : (
          <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-navy/18 scrollbar-track-transparent">
            <table className="w-max min-w-full border-collapse bg-[#F6F2E8] text-sm">
              <thead className="sticky top-0 z-20 bg-[#F2F1EE] shadow-sm">
                <tr>
                  <th className="sticky left-0 top-0 z-30 min-w-[150px] border-b border-r border-navy/10 bg-[#F2F1EE] p-3 text-left shadow-[8px_0_18px_-18px_rgba(10,29,44,.45)] sm:min-w-64">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-black text-navy">Student</span>
                      <div className="mt-1 flex max-w-[8rem] flex-wrap gap-1">
                        <span className="rounded-full bg-navy/7 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-slatebrand">
                          {activeTab.section}
                        </span>
                        <span className="rounded-full bg-gold/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-navy">
                          {activeTab.cat}
                        </span>
                      </div>
                    </div>
                  </th>

                  {filteredEvents.map((event) => {
                    const count = participations.filter((p) => p.event_id === event.id).length
                    const limit = event.max_participants_per_team
                    const isFull = count >= limit

                    return (
                      <th key={event.id} className="h-44 min-w-[64px] border-b border-l border-navy/10 bg-[#F2F1EE] p-1.5 align-bottom sm:min-w-20">
                        <div className="flex h-full w-full flex-col items-center justify-end gap-3 pb-2">
                          <Badge className={cn("h-6 border px-2 text-[10px] font-black", getLimitBadgeColor(isFull))}>
                            {count}/{limit}
                          </Badge>
                          <div
                            className="max-h-36 max-w-8 overflow-hidden text-[10px] font-black leading-tight tracking-normal text-navy sm:text-[11px]"
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
                    <tr key={student.id} className={cn("group border-b border-navy/8 hover:bg-gold/6", isFull && "bg-gold/12")}>
                      <td className={cn("sticky left-0 z-10 border-r border-navy/10 bg-[#F6F2E8] p-3 shadow-[8px_0_18px_-18px_rgba(10,29,44,.45)] group-hover:bg-[#f3ead8]", isFull && "bg-[#F4E5BE]")}>
                        <div className="flex min-w-0 items-center gap-3">
                          <StudentPhoto imageLink={student.image_link} name={student.name} className="size-11" />
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

      <Dialog open={!!notice} onOpenChange={(open) => !open && setNotice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{notice?.title}</DialogTitle>
            <DialogDescription>{notice?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setNotice(null)}>Okay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
