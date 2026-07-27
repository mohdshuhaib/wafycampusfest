"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StudentPhoto } from "@/components/student-photo"
import { Filter, GraduationCap, IdCard, Loader2, Search, Sparkles, Users, X } from "lucide-react"

interface Profile {
  team_id: string | null
}

interface Student {
  id: string
  name: string
  chest_no: string | null
  class_grade: string | null
  image_link: string | null
  team_role: "member" | "manager" | "assistant_manager"
  team_id: string
  teams?: { name: string; color_hex: string } | null
}

function chestSortValue(chestNo: string | null) {
  const numeric = Number(chestNo)
  return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER
}

function teamRoleRank(role?: Student["team_role"]) {
  if (role === "manager") return 0
  if (role === "assistant_manager") return 1
  return 2
}

function teamRoleLabel(role?: Student["team_role"]) {
  if (role === "manager") return "M"
  if (role === "assistant_manager") return "AM"
  return null
}

export default function CaptainParticipantsPage() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState("")
  const [filterClass, setFilterClass] = useState("all")
  const supabase = createClient()

  useEffect(() => {
    async function loadStudents() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("team_id")
          .eq("id", user.id)
          .single()

        if (profileError) throw profileError
        const profile = profileData as Profile
        if (!profile?.team_id) return

        const { data, error } = await supabase
          .from("students")
          .select("id, name, chest_no, class_grade, image_link, team_role, team_id, teams ( name, color_hex )")
          .eq("team_id", profile.team_id)
          .order("chest_no", { ascending: true })

        if (error) throw error
        setStudents((data || []) as unknown as Student[])
      } catch (error) {
        console.error("Failed to load participants:", error)
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [])

  const availableClasses = useMemo(() => {
    const classes = new Set(students.map((student) => student.class_grade).filter(Boolean))
    return Array.from(classes).sort()
  }, [students])

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = students.filter((student) => {
      const matchesSearch = !query ||
        student.name.toLowerCase().includes(query) ||
        student.chest_no?.toLowerCase().includes(query)
      const matchesClass = filterClass === "all" || student.class_grade === filterClass
      return matchesSearch && matchesClass
    })

    return [...list].sort((a, b) => {
      const roleDiff = teamRoleRank(a.team_role) - teamRoleRank(b.team_role)
      if (roleDiff !== 0) return roleDiff
      const chestDiff = chestSortValue(a.chest_no) - chestSortValue(b.chest_no)
      if (chestDiff !== 0) return chestDiff
      return a.name.localeCompare(b.name)
    })
  }, [students, search, filterClass])

  const clearFilters = () => {
    setSearch("")
    setFilterClass("all")
  }

  const hasActiveFilters = search !== "" || filterClass !== "all"
  const teamName = students[0]?.teams?.name || "Your Team"

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <div className="surface-elevated flex items-center gap-3 rounded-3xl px-5 py-4">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold text-navy">Loading participants</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-4">
      <section className="surface-dark relative overflow-hidden rounded-[2rem] p-6 sm:p-7">
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-gold">
              <Sparkles className="size-3.5" />
              Participants
            </div>
            <h1 className="text-display mt-5 text-4xl text-ivory sm:text-5xl">Your team roster.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-ivory/62 sm:text-base">
              Search and filter participant details for {teamName}.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:w-[30rem]">
            <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
              <div className="text-title text-2xl text-ivory">{students.length}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Participants</div>
            </div>
            <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
              <div className="text-title text-2xl text-ivory">{availableClasses.length}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Classes</div>
            </div>
            <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
              <div className="text-title text-2xl text-ivory">{filteredStudents.length}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Showing</div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-elevated sticky top-20 z-20 rounded-[1.75rem] p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
            <Input
              placeholder="Search by name or chest number"
              className="h-12 pl-11"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="h-12 w-full rounded-xl border-navy/12 bg-ivory/70 sm:w-[12rem]">
                <Filter className="mr-2 size-4 text-slatebrand" />
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {availableClasses.map((className) => (
                  <SelectItem key={className as string} value={className as string}>{className}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <Users className="size-4 text-gold" />
            Filtered roster
          </div>
          <div className="text-title text-3xl text-navy">{filteredStudents.length}</div>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <Users className="size-4 text-gold" />
            Total participants
          </div>
          <div className="text-title text-3xl text-navy">{students.length}</div>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <GraduationCap className="size-4 text-gold" />
            Classes
          </div>
          <div className="text-title text-3xl text-navy">{availableClasses.length}</div>
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[2rem] border border-navy/10 bg-ivory/60 shadow-premium backdrop-blur-xl md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-navy/10 bg-navy text-ivory hover:bg-navy">
              <TableHead className="h-12 pl-5 text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Chest</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Participant</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Class</TableHead>
              <TableHead className="pr-5 text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Team</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 text-slatebrand">
                    <Search className="size-9 opacity-35" />
                    <p className="text-sm font-semibold">No participants found matching your filters.</p>
                    {hasActiveFilters && <Button variant="link" onClick={clearFilters}>Clear all filters</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id} className="border-navy/8 transition hover:bg-gold/8">
                  <TableCell className="pl-5 font-mono text-sm font-black text-navy">{student.chest_no || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <StudentPhoto imageLink={student.image_link} name={student.name} className="size-10" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate font-bold text-navy">{student.name}</div>
                          {teamRoleLabel(student.team_role) && (
                            <Badge variant="outline" className="h-5 border-gold/30 bg-gold/12 px-2 text-[10px] text-navy">
                              {teamRoleLabel(student.team_role)}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slatebrand">ID {student.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-slatebrand">{student.class_grade || "-"}</TableCell>
                  <TableCell className="pr-5">
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: `${student.teams?.color_hex || "#123B4F"}55`,
                        color: student.teams?.color_hex || "#123B4F",
                        backgroundColor: `${student.teams?.color_hex || "#123B4F"}12`,
                      }}
                    >
                      {student.teams?.name || "Team"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <section className="grid gap-3 md:hidden">
        {filteredStudents.length === 0 ? (
          <div className="surface-panel rounded-3xl p-8 text-center">
            <Search className="mx-auto mb-3 size-9 text-slatebrand/40" />
            <p className="text-sm font-semibold text-slatebrand">No participants found.</p>
            {hasActiveFilters && <Button variant="link" onClick={clearFilters}>Clear filters</Button>}
          </div>
        ) : (
          filteredStudents.map((student) => (
            <article key={student.id} className="surface-elevated rounded-3xl p-5">
              <div className="flex items-start gap-4">
                <StudentPhoto imageLink={student.image_link} name={student.name} className="size-12" />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-slatebrand">
                    Chest {student.chest_no || "-"}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="text-title text-xl text-navy">{student.name}</h2>
                    {teamRoleLabel(student.team_role) && (
                      <Badge variant="outline" className="h-6 border-gold/30 bg-gold/12 px-2 text-[10px] text-navy">
                        {teamRoleLabel(student.team_role)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-navy/10 bg-navy/6 px-3 py-1 text-xs font-bold text-slatebrand">
                  <IdCard className="size-3" />
                  {student.class_grade || "No class"}
                </span>
                <span
                  className="rounded-full border px-3 py-1 text-xs font-bold"
                  style={{
                    borderColor: `${student.teams?.color_hex || "#123B4F"}55`,
                    color: student.teams?.color_hex || "#123B4F",
                    backgroundColor: `${student.teams?.color_hex || "#123B4F"}12`,
                  }}
                >
                  {student.teams?.name || "Team"}
                </span>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
