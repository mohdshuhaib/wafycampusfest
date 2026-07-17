"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AlertCircle, Check, Info, Loader2, Lock, Search, Sparkles, Users } from "lucide-react"
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

interface Profile { team_id: string | null }
interface Team { id: string; access_override: boolean | null }
interface AppConfig { registration_open: boolean }
interface SectionLimit { section: string; category: string; limit_count: number }

const TABS = [
  { id: "SENIOR_ON", label: "Senior On", section: "Senior", cat: "ON STAGE" },
  { id: "SENIOR_OFF", label: "Senior Off", section: "Senior", cat: "OFF STAGE" },
]

export default function MatrixRegistration() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [lockReason, setLockReason] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [limits, setLimits] = useState<SectionLimit[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profileData } = await supabase.from("profiles").select("team_id").eq("id", user.id).single()
        const profile = profileData as unknown as Profile
        if (!profile?.team_id) return
        setTeamId(profile.team_id)

        const [stuRes, evtRes, partRes, limitRes, configRes, teamRes] = await Promise.all([
          supabase.from("students").select("*").eq("team_id", profile.team_id).order("name"),
          supabase.from("events").select("*").order("name"),
          supabase.from("participations").select("*").eq("team_id", profile.team_id),
          supabase.from("section_limits").select("*"),
          supabase.from("app_config").select("*").single(),
          supabase.from("teams").select("access_override").eq("id", profile.team_id).single(),
        ])

        if (stuRes.data) setStudents(stuRes.data as unknown as Student[])
        if (evtRes.data) setEvents(evtRes.data as unknown as Event[])
        if (partRes.data) setParticipations(partRes.data as unknown as Participation[])
        if (limitRes.data) setLimits(limitRes.data as unknown as SectionLimit[])

        const config = configRes.data as unknown as AppConfig
        const team = teamRes.data as unknown as Team
        const globalOpen = config?.registration_open ?? false
        const teamOverride = team?.access_override

        let access = false
        if (teamOverride === true) access = true
        else if (teamOverride === false) access = false
        else access = globalOpen

        if (!access) {
          setIsLocked(true)
          setLockReason(teamOverride === false ? "Your team's registration has been locked by Admin." : "Registration is currently closed.")
        } else {
          setIsLocked(false)
        }
      } catch (e) {
        console.error("Load error", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredStudents = useMemo(() => {
    let list = students

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((student) =>
        student.name.toLowerCase().includes(q) ||
        (student.chest_no && student.chest_no.toLowerCase().includes(q))
      )
    }

    return list.filter((student) => student.section === "Senior")
  }, [students, activeTab, searchQuery])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (event.category !== activeTab.cat) return false
      if (!event.applicable_section || event.applicable_section.length === 0) return false
      return event.applicable_section.includes(activeTab.section)
    })
  }, [events, activeTab])

  const getLimitStatus = (student: Student) => {
    const limitRule = limits.find((limit) => limit.section === activeTab.section && limit.category === activeTab.cat)
    const limit = limitRule ? limitRule.limit_count : 100

    const count = participations.filter((participation) => {
      const event = events.find((item) => item.id === participation.event_id)
      if (!event) return false
      const isTabSectionEvent = event.applicable_section?.includes(activeTab.section)
      return participation.student_id === student.id && isTabSectionEvent && event.category === activeTab.cat
    }).length

    return { count, limit, isFull: count >= limit, remaining: limit - count }
  }

  const handleToggle = async (studentId: string, eventId: string, isChecked: boolean) => {
    if (!teamId) return

    if (isLocked) {
      alert(`Action Blocked: ${lockReason}`)
      return
    }

    if (!isChecked) {
      setParticipations((prev) => prev.filter((p) => !(p.student_id === studentId && p.event_id === eventId)))
      await supabase.from("participations").delete().match({ student_id: studentId, event_id: eventId, team_id: teamId })
      return
    }

    const student = students.find((item) => item.id === studentId)
    const event = events.find((item) => item.id === eventId)
    if (!student || !event) return

    const { isFull, limit } = getLimitStatus(student)

    if (isFull) {
      alert(`Limit Reached! Maximum ${limit} events allowed for ${activeTab.section} ${activeTab.cat}.`)
      return
    }

    const eventTeamCount = participations.filter((p) => p.event_id === eventId).length
    if (eventTeamCount >= event.max_participants_per_team) {
      alert(`Event Limit Reached! Max ${event.max_participants_per_team} participants allowed.`)
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
      alert("Error adding: " + error.message)
    } else {
      setParticipations((prev) => prev.map((p) => p.id === tempId ? inserted : p))
    }
  }

  const getCellColor = (isRegistered: boolean, isDisabled: boolean) => {
    if (isRegistered) return "border-gold bg-gold text-navy shadow-[inset_0_0_0_1px_rgba(10,29,44,.18)]"
    if (isDisabled) return "cursor-not-allowed border-navy/8 bg-navy/5 opacity-60"
    return "border-navy/8 bg-ivory hover:border-gold/30 hover:bg-gold/10"
  }

  const getLimitBadgeColor = (isFull: boolean) => {
    return isFull
      ? "border-success/20 bg-success/10 text-success"
      : "border-navy/10 bg-ivory text-slatebrand"
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <div className="surface-elevated flex items-center gap-3 rounded-3xl px-5 py-4">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold text-navy">Loading registration matrix</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-5 overflow-hidden pb-20 md:pb-4">
      <section className="surface-dark relative shrink-0 overflow-hidden rounded-[2rem] p-5 sm:p-6">

        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <Badge variant={isLocked ? "destructive" : "gold"} className="h-8 gap-2 px-3">
              {isLocked ? <Lock className="size-3.5" /> : <Sparkles className="size-3.5" />}
              {isLocked ? "Registration Locked" : "Registration Matrix"}
            </Badge>
            <h1 className="text-display mt-4 text-3xl text-ivory sm:text-4xl">Build your team entries.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/62">
              Search Senior students and select event cells while staying inside programme limits.
            </p>
          </div>

          <div className="rounded-3xl border border-ivory/10 bg-ivory/8 p-4">
            <div className="flex items-center gap-3">
              <Users className="size-5 text-gold" />
              <div>
                <p className="text-2xl font-black text-ivory">{filteredStudents.length}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ivory/48">Visible students</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isLocked && (
        <div className="surface-panel flex shrink-0 items-center gap-3 rounded-2xl border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
          <Lock className="size-4" />
          {lockReason}
        </div>
      )}

      <section className="surface-panel shrink-0 rounded-[2rem] p-3">
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
            <span>Gold cells are selected. Muted cells are full or unavailable.</span>
          </div>
        </div>
      </section>

      <div className="shrink-0 overflow-x-auto pb-1 scrollbar-none">
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

      <section className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-navy/10 bg-ivory shadow-sm", isLocked && "opacity-70 grayscale")}>
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
                          <div className="max-h-32 text-[11px] font-black tracking-wide text-navy" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
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
                        const isDisabled = !isRegistered && (isFull || isEventFull || isLocked)

                        return (
                          <td key={`${student.id}-${event.id}`} className="relative border-b border-l border-navy/8 p-0 align-middle">
                            <label className={cn("absolute inset-0 flex cursor-pointer items-center justify-center border transition-all duration-200", isDisabled && "cursor-not-allowed", getCellColor(isRegistered, isDisabled))}>
                              <input
                                type="checkbox"
                                checked={isRegistered}
                                disabled={isDisabled}
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
      </section>
    </div>
  )
}
