"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { EventFormDialog } from "@/components/admin/events/event-form-dialog"
import { EventsCsvUpload } from "@/components/admin/events/events-csv-upload"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import {
  AlertTriangle,
  CalendarDays,
  Edit2,
  Filter,
  LayoutGrid,
  Loader2,
  Music2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react"

interface Event {
  id: string
  name: string
  event_code: string
  category: 'OFF STAGE' | 'ON STAGE' | 'GENERAL' | 'SPECIAL'
  max_participants_per_team: number
  description: string | null
  grade_type: 'A' | 'B' | 'C' | 'D'
  applicable_section: string[]
}

function categoryClass(category: Event["category"]) {
  if (category === "ON STAGE") return "border-gold/35 bg-gold/16 text-navy"
  if (category === "OFF STAGE") return "border-deepblue/15 bg-deepblue/10 text-deepblue"
  if (category === "GENERAL") return "border-success/20 bg-success/10 text-success"
  return "border-destructive/20 bg-destructive/10 text-destructive"
}

function gradeClass(grade: Event["grade_type"]) {
  if (grade === "A") return "border-gold/35 bg-gold/16 text-navy"
  if (grade === "B") return "border-navy/12 bg-navy/7 text-navy"
  if (grade === "C") return "border-[#c98743]/30 bg-[#c98743]/12 text-[#8a5525]"
  return "border-destructive/20 bg-destructive/10 text-destructive"
}

export default function AdminEvents() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])

  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterGrade, setFilterGrade] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  const supabase = createClient()

  async function loadEvents() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_code', { ascending: true })

      if (error) throw error
      setEvents(data as unknown as Event[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    setIsAddOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const { error } = await supabase.from('events').delete().eq('id', deleteId)
      if (error) throw error
      setEvents(prev => prev.filter(e => e.id !== deleteId))
    } catch (err) {
      alert("Failed to delete")
    } finally {
      setDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      setEvents([])
      setIsBulkDeleteOpen(false)
    } catch (err) {
      alert("Failed to delete all events")
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesCategory = filterCategory === "all" || e.category === filterCategory
      const matchesSection = !e.applicable_section || e.applicable_section.length === 0 || e.applicable_section.includes("Senior")
      const matchesGrade = filterGrade === "all" || e.grade_type === filterGrade
      const search = searchQuery.toLowerCase()
      const matchesSearch = e.name.toLowerCase().includes(search) || e.event_code?.toLowerCase().includes(search)

      return matchesCategory && matchesSection && matchesGrade && matchesSearch
    })
  }, [events, filterCategory, filterGrade, searchQuery])

  const clearFilters = () => {
    setFilterCategory("all")
    setFilterGrade("all")
    setSearchQuery("")
  }

  const hasActiveFilters = filterCategory !== "all" || filterGrade !== "all" || searchQuery !== ""
  const onStageCount = events.filter(event => event.category === "ON STAGE").length
  const offStageCount = events.filter(event => event.category === "OFF STAGE").length
  const generalCount = events.filter(event => event.category === "GENERAL").length
  const specialCount = events.filter(event => event.category === "SPECIAL").length
  const totalCapacity = events.reduce((sum, event) => sum + (event.max_participants_per_team || 0), 0)

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="surface-panel flex items-center gap-3 rounded-3xl px-6 py-5 text-navy">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold">Loading event catalogue</span>
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
              Event Management
            </div>
            <h1 className="text-display mt-5 text-4xl text-ivory sm:text-5xl">Curate every competition.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-ivory/62 sm:text-base">
              Create Senior event codes, grade types, and participant limits while keeping the full event catalogue searchable.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:w-[30rem]">
            <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
              <div className="text-title text-2xl text-ivory">{events.length}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Total Events</div>
            </div>
            <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
              <div className="text-title text-2xl text-ivory">{onStageCount}/{offStageCount}/{generalCount}/{specialCount}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Stage Mix</div>
            </div>
            <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
              <div className="text-title text-2xl text-ivory">{totalCapacity}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Team Slots</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <div className="surface-elevated sticky top-20 z-20 rounded-[1.75rem] p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
              <Input
                placeholder="Search by event name or code"
                className="h-12 pl-11"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-12 w-[9.5rem] rounded-xl border-navy/12 bg-ivory/70">
                  <Filter className="mr-2 size-4 text-slatebrand" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ON STAGE">On Stage</SelectItem>
                  <SelectItem value="OFF STAGE">Off Stage</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="SPECIAL">Special</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="h-12 w-[9rem] rounded-xl border-navy/12 bg-ivory/70">
                  <Filter className="mr-2 size-4 text-slatebrand" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="A">Grade A</SelectItem>
                  <SelectItem value="B">Grade B</SelectItem>
                  <SelectItem value="C">Grade C</SelectItem>
                  <SelectItem value="D">Grade D</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button onClick={() => { setEditingEvent(null); setIsAddOpen(true); }}>
            <Plus className="size-4" />
            New Event
          </Button>
          <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
            <Upload className="size-4" />
            Import CSV
          </Button>
          {events.length > 0 && (
            <Button variant="destructive" onClick={() => setIsBulkDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Reset
            </Button>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <Music2 className="size-4 text-gold" />
            On-stage events
          </div>
          <div className="text-title text-3xl text-navy">{onStageCount}</div>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <LayoutGrid className="size-4 text-gold" />
            Filtered view
          </div>
          <div className="text-title text-3xl text-navy">{filteredEvents.length}</div>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <Users className="size-4 text-gold" />
            Max per team total
          </div>
          <div className="text-title text-3xl text-navy">{totalCapacity}</div>
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[2rem] border border-navy/10 bg-ivory/60 shadow-premium backdrop-blur-xl md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-navy/10 bg-navy text-ivory hover:bg-navy">
              <TableHead className="h-12 pl-5 text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Code</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Event Name</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Category</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Section</TableHead>
              <TableHead className="text-center text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Grade</TableHead>
              <TableHead className="text-center text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Max</TableHead>
              <TableHead className="pr-5 text-right text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 text-slatebrand">
                    <Search className="size-9 opacity-35" />
                    <p className="text-sm font-semibold">No events found matching your filters.</p>
                    {hasActiveFilters && <Button variant="link" onClick={clearFilters}>Clear all filters</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => (
                <TableRow key={event.id} className="border-navy/8 transition hover:bg-gold/8">
                  <TableCell className="pl-5 font-mono text-xs font-bold text-slatebrand">{event.event_code || '-'}</TableCell>
                  <TableCell>
                    <div className="font-bold text-navy">{event.name}</div>
                    {event.description && <div className="mt-1 max-w-md truncate text-xs text-slatebrand">{event.description}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={categoryClass(event.category)}>{event.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {event.applicable_section?.map(sec => (
                        <span key={sec} className="rounded-full border border-navy/10 bg-navy/6 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slatebrand">
                          {sec}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={gradeClass(event.grade_type)}>Grade {event.grade_type}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm font-bold text-slatebrand">{event.max_participants_per_team}</TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(event)} aria-label={`Edit ${event.name}`}>
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="hover:text-destructive" onClick={() => setDeleteId(event.id)} aria-label={`Delete ${event.name}`}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <section className="grid gap-3 md:hidden">
        {filteredEvents.length === 0 ? (
          <div className="surface-panel rounded-3xl p-8 text-center">
            <Search className="mx-auto mb-3 size-9 text-slatebrand/40" />
            <p className="text-sm font-semibold text-slatebrand">No events found.</p>
            {hasActiveFilters && <Button variant="link" onClick={clearFilters}>Clear filters</Button>}
          </div>
        ) : (
          filteredEvents.map((event) => (
            <article key={event.id} className="surface-elevated rounded-3xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-slatebrand">{event.event_code || 'No code'}</div>
                  <h2 className="text-title mt-2 text-xl text-navy">{event.name}</h2>
                </div>
                <Badge variant="outline" className={gradeClass(event.grade_type)}>Grade {event.grade_type}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className={categoryClass(event.category)}>{event.category}</Badge>
                <span className="inline-flex items-center gap-1 rounded-full border border-navy/10 bg-navy/6 px-3 py-1 text-xs font-bold text-slatebrand">
                  <Users className="size-3" />
                  Max {event.max_participants_per_team}
                </span>
                {event.applicable_section?.map(sec => (
                  <span key={sec} className="rounded-full border border-navy/10 bg-ivory/70 px-3 py-1 text-xs font-bold text-slatebrand">
                    {sec}
                  </span>
                ))}
              </div>
              {event.description && <p className="mt-4 text-sm leading-6 text-slatebrand">{event.description}</p>}
              <div className="mt-5 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleEdit(event)}>
                  <Edit2 className="size-4" />
                  Edit
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(event.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </article>
          ))
        )}
      </section>

      <EventFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        event={editingEvent}
        onSuccess={loadEvents}
      />
      <EventsCsvUpload
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={loadEvents}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the event and all associated student results and participations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Delete all events?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This is extremely destructive. It will wipe all events and scoring data. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
