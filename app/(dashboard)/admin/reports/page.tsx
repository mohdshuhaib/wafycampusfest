"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, Filter, Layers, Loader2, Search, Sparkles, UserX, Users } from "lucide-react"
import { ZeroParticipationTab } from "@/components/admin/reports/zero-participation-tab"
import { SectionExclusiveTab } from "@/components/admin/reports/section-exclusive-tab"
import { EventCallSheetTab } from "@/components/admin/reports/event-call-sheet-tab"
import { StudentSheetTab } from "@/components/admin/reports/student-sheet-tab"

interface Team { id: string; name: string; color_hex: string }
interface Event { id: string; name: string; event_code: string; category: string; max_participants_per_team: number }

const reportTabs = [
  { value: "event", label: "Event Call Sheet", icon: FileText },
  { value: "student", label: "Student Sheet", icon: Users },
  { value: "zero", label: "Zero Participation", icon: UserX },
  { value: "section", label: "Section Exclusive", icon: Layers },
]

export default function AdminReports() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const supabase = createClient()

  useEffect(() => {
    async function loadBaseData() {
      try {
        setLoading(true)
        const { data: teamsData } = await supabase.from("teams").select("*").order("name")
        if (teamsData) setTeams(teamsData as any)

        const { data: eventsData } = await supabase.from("events").select("*").order("name")
        if (eventsData) setEvents(eventsData as any)

        const { data: studentsData, error } = await supabase
          .from("students")
          .select(`
            *,
            teams ( name, color_hex ),
            participations (
              events ( category )
            )
          `)
          .order("name")

        if (error) throw error
        setAllStudents(studentsData as any)
      } catch (err) {
        console.error("Error loading reports data:", err)
      } finally {
        setLoading(false)
      }
    }
    loadBaseData()
  }, [])

  const reportStats = useMemo(() => {
    const zero = allStudents.filter((s) => s.participations.length === 0).length
    const active = allStudents.length - zero
    return { zero, active, events: events.length, teams: teams.length }
  }, [allStudents, events, teams])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <div className="surface-elevated flex items-center gap-3 rounded-3xl px-5 py-4">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold text-navy">Preparing report studio</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-5 overflow-hidden pb-20 md:pb-4">
      <section className="surface-dark relative shrink-0 overflow-hidden rounded-[2rem] p-5 sm:p-6">

        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <Badge variant="gold" className="h-8 gap-2 px-3">
              <Sparkles className="size-3.5" />
              Report Studio
            </Badge>
            <h1 className="text-display mt-4 text-3xl text-ivory sm:text-4xl">Generate operational reports.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/62">
              Build call sheets, student registries, inactive lists, and section-only participation views.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[520px]">
            <MiniStat label="Events" value={reportStats.events} />
            <MiniStat label="Teams" value={reportStats.teams} />
            <MiniStat label="Active" value={reportStats.active} />
            <MiniStat label="Inactive" value={reportStats.zero} />
          </div>
        </div>
      </section>

      <section className="surface-panel shrink-0 rounded-[2rem] p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-navy text-gold">
              <Filter className="size-4" />
            </div>
            <div>
              <p className="text-sm font-black text-navy">Global report filters</p>
              <p className="text-xs font-semibold text-slatebrand">Applies to inactive and section-exclusive reports.</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
              <Input
                placeholder="Search students..."
                className="h-11 rounded-2xl pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="h-11 w-full rounded-2xl bg-ivory sm:w-[190px]">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent className="surface-elevated rounded-2xl border-navy/10">
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Tabs defaultValue="event" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 overflow-x-auto pb-2 scrollbar-none">
          <TabsList className="h-auto w-max gap-1 rounded-2xl bg-navy/6 p-1">
            {reportTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-xl px-4 py-2 text-xs font-black text-slatebrand data-[state=active]:bg-navy data-[state=active]:text-ivory"
                >
                  <Icon className="mr-2 size-4" />
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        <div className="min-h-0 flex-1">
          <TabsContent value="event" className="m-0 h-full data-[state=inactive]:hidden">
            <EventCallSheetTab events={events} />
          </TabsContent>
          <TabsContent value="student" className="m-0 h-full data-[state=inactive]:hidden">
            <StudentSheetTab students={allStudents} teams={teams} />
          </TabsContent>
          <TabsContent value="zero" className="m-0 h-full data-[state=inactive]:hidden">
            <ZeroParticipationTab students={allStudents} filterTeam={selectedTeam} search={searchQuery} />
          </TabsContent>
          <TabsContent value="section" className="m-0 h-full data-[state=inactive]:hidden">
            <SectionExclusiveTab students={allStudents} filterTeam={selectedTeam} search={searchQuery} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-ivory/48">{label}</p>
      <p className="mt-1 text-2xl font-black text-ivory">{value}</p>
    </div>
  )
}
