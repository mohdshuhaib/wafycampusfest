"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  Filter,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react"

interface ParticipationDetail {
  id: string
  status: string
  created_at: string
  students: {
    name: string
    chest_no: string | null
    section: string
  } | null
  events: {
    name: string
    category: string
  } | null
  teams: {
    name: string
    color_hex: string
  } | null
}

interface Team {
  id: string
  name: string
}

function statusClass(status: string) {
  if (status === "registered") return "border-success/20 bg-success/12 text-success"
  if (status === "completed") return "border-gold/35 bg-gold/16 text-navy"
  if (status === "disqualified") return "border-destructive/20 bg-destructive/10 text-destructive"
  return "border-navy/12 bg-navy/7 text-navy"
}

function categoryClass(category?: string) {
  return category === "ON STAGE"
    ? "border-gold/35 bg-gold/16 text-navy"
    : "border-deepblue/15 bg-deepblue/10 text-deepblue"
}

export default function AdminParticipations() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ParticipationDetail[]>([])
  const [teams, setTeams] = useState<Team[]>([])

  const [search, setSearch] = useState("")
  const [filterTeam, setFilterTeam] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const supabase = createClient()

  async function loadData() {
    try {
      setLoading(true)

      const { data: teamsData } = await supabase.from('teams').select('id, name').order('name')
      if (teamsData) setTeams(teamsData as unknown as Team[])

      const { data: partsData, error } = await supabase
        .from('participations')
        .select(`
          id,
          status,
          created_at,
          students ( name, chest_no, section ),
          events ( name, category ),
          teams ( name, color_hex )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setData(partsData as unknown as ParticipationDetail[])
    } catch (err) {
      console.error("Error loading participations:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      setDeletingId(deleteId)
      const { error } = await supabase.from('participations').delete().eq('id', deleteId)
      if (error) throw error

      setData(prev => prev.filter(p => p.id !== deleteId))
      setDeleteId(null)
    } catch (err) {
      console.error(err)
      alert("Failed to delete entry")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredData = useMemo(() => {
    const query = search.toLowerCase()
    return data.filter(item => {
      const matchesSearch =
        item.students?.name.toLowerCase().includes(query) ||
        item.students?.chest_no?.toLowerCase().includes(query) ||
        item.events?.name.toLowerCase().includes(query)

      const matchesTeam = filterTeam === "all" || item.teams?.name === filterTeam
      const matchesCategory = filterCategory === "all" || item.events?.category === filterCategory

      return matchesSearch && matchesTeam && matchesCategory
    })
  }, [data, filterCategory, filterTeam, search])

  const clearFilters = () => {
    setSearch("")
    setFilterTeam("all")
    setFilterCategory("all")
  }

  const hasActiveFilters = search !== "" || filterTeam !== "all" || filterCategory !== "all"
  const onStageCount = data.filter(item => item.events?.category === "ON STAGE").length
  const offStageCount = data.filter(item => item.events?.category === "OFF STAGE").length
  const uniqueTeams = new Set(data.map(item => item.teams?.name).filter(Boolean)).size

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="surface-panel flex items-center gap-3 rounded-3xl px-6 py-5 text-navy">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold">Loading registration ledger</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="surface-dark relative overflow-hidden rounded-[2rem] p-6 sm:p-7">

        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-gold">
              <Sparkles className="size-3.5" />
              Registration Ledger
            </div>
            <h1 className="text-display mt-5 text-4xl text-ivory sm:text-5xl">Track every entry.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-ivory/62 sm:text-base">
              Review student participations across teams and events, filter by category, and remove incorrect entries when needed.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:w-[30rem]">
            <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
              <div className="text-title text-2xl text-ivory">{data.length}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Entries</div>
            </div>
            <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
              <div className="text-title text-2xl text-ivory">{onStageCount}/{offStageCount}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Stage Mix</div>
            </div>
            <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
              <div className="text-title text-2xl text-ivory">{uniqueTeams}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Teams Active</div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-elevated sticky top-20 z-20 rounded-[1.75rem] p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
            <Input
              placeholder="Search student, chest number, or event"
              className="h-12 pl-11"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
              <select
                className="focus-premium h-12 w-full rounded-xl border border-navy/12 bg-ivory/70 pl-9 pr-8 text-sm font-semibold text-navy sm:w-[13rem]"
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
              >
                <option value="all">All Teams</option>
                {teams.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
              <select
                className="focus-premium h-12 w-full rounded-xl border border-navy/12 bg-ivory/70 pl-9 pr-8 text-sm font-semibold text-navy sm:w-[13rem]"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="OFF STAGE">Off Stage</option>
                <option value="ON STAGE">On Stage</option>
              </select>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <Activity className="size-4 text-gold" />
            Filtered entries
          </div>
          <div className="text-title text-3xl text-navy">{filteredData.length}</div>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <Trophy className="size-4 text-gold" />
            On stage
          </div>
          <div className="text-title text-3xl text-navy">{onStageCount}</div>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <CalendarCheck className="size-4 text-gold" />
            Off stage
          </div>
          <div className="text-title text-3xl text-navy">{offStageCount}</div>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <Users className="size-4 text-gold" />
            Active teams
          </div>
          <div className="text-title text-3xl text-navy">{uniqueTeams}</div>
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[2rem] border border-navy/10 bg-ivory/60 shadow-premium backdrop-blur-xl md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-navy/10 bg-navy text-ivory hover:bg-navy">
              <TableHead className="h-12 pl-5 text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Student</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Team</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Event</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Category</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Status</TableHead>
              <TableHead className="pr-5 text-right text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 text-slatebrand">
                    <Search className="size-9 opacity-35" />
                    <p className="text-sm font-semibold">No registration records found.</p>
                    {hasActiveFilters && <Button variant="link" onClick={clearFilters}>Clear filters</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => (
                <TableRow key={row.id} className="border-navy/8 transition hover:bg-gold/8">
                  <TableCell className="pl-5">
                    <div className="font-bold text-navy">{row.students?.name || "Unknown student"}</div>
                    <div className="mt-1 text-xs font-semibold text-slatebrand">
                      Chest {row.students?.chest_no || "-"} · {row.students?.section || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: `${row.teams?.color_hex || "#123B4F"}55`,
                        color: row.teams?.color_hex || "#123B4F",
                        backgroundColor: `${row.teams?.color_hex || "#123B4F"}12`,
                      }}
                    >
                      {row.teams?.name || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-semibold text-navy">{row.events?.name || "Unknown event"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={categoryClass(row.events?.category)}>{row.events?.category || "-"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusClass(row.status)}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="hover:text-destructive"
                      onClick={() => setDeleteId(row.id)}
                      disabled={deletingId === row.id}
                      aria-label="Delete participation"
                    >
                      {deletingId === row.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <section className="grid gap-3 md:hidden">
        {filteredData.length === 0 ? (
          <div className="surface-panel rounded-3xl p-8 text-center">
            <Search className="mx-auto mb-3 size-9 text-slatebrand/40" />
            <p className="text-sm font-semibold text-slatebrand">No registration records found.</p>
            {hasActiveFilters && <Button variant="link" onClick={clearFilters}>Clear filters</Button>}
          </div>
        ) : (
          filteredData.map((row) => (
            <article key={row.id} className="surface-elevated rounded-3xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-slatebrand">
                    Chest {row.students?.chest_no || "-"}
                  </div>
                  <h2 className="text-title mt-1 text-xl text-navy">{row.students?.name || "Unknown student"}</h2>
                  <p className="mt-2 text-sm font-semibold text-slatebrand">{row.events?.name || "Unknown event"}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setDeleteId(row.id)}
                  disabled={deletingId === row.id}
                >
                  {deletingId === row.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className={categoryClass(row.events?.category)}>{row.events?.category || "-"}</Badge>
                <Badge variant="outline" className={statusClass(row.status)}>{row.status}</Badge>
                <span
                  className="rounded-full border px-3 py-1 text-xs font-bold"
                  style={{
                    borderColor: `${row.teams?.color_hex || "#123B4F"}55`,
                    color: row.teams?.color_hex || "#123B4F",
                    backgroundColor: `${row.teams?.color_hex || "#123B4F"}12`,
                  }}
                >
                  {row.teams?.name || "Unknown"}
                </span>
              </div>
            </article>
          ))
        )}
      </section>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Remove registration?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the selected participation entry. The student and event records will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
