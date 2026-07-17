"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { StudentFormDialog } from "@/components/admin/students/student-form-dialog"
import { CsvUploadDialog } from "@/components/admin/students/csv-upload-dialog"
import { LimitSettingsDialog } from "@/components/admin/students/limit-settings-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import {
  AlertTriangle,
  Edit2,
  Filter,
  GraduationCap,
  IdCard,
  Loader2,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react"

interface Team {
  id: string
  name: string
  slug: string
  color_hex: string
}

interface Student {
  id: string
  name: string
  chest_no: string | null
  class_grade: string | null
  section: 'Senior' | 'Junior' | 'Sub-Junior'
  team_id: string
  teams?: { name: string; color_hex: string }
}

function sectionTone(section: Student["section"]) {
  if (section === "Senior") return "border-gold/35 bg-gold/16 text-navy"
  if (section === "Junior") return "border-deepblue/15 bg-deepblue/10 text-deepblue"
  return "border-navy/12 bg-navy/7 text-navy"
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("") || "ST"
}

export default function AdminStudents() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [teams, setTeams] = useState<Team[]>([])

  const [search, setSearch] = useState("")
  const [filterTeam, setFilterTeam] = useState<string>("all")
  const [filterSection, setFilterSection] = useState<string>("all")
  const [filterClass, setFilterClass] = useState<string>("all")

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isLimitsOpen, setIsLimitsOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  const supabase = createClient()

  async function loadData() {
    try {
      setLoading(true)
      const { data: teamsData } = await supabase.from('teams').select('*').order('name')
      if (teamsData) setTeams(teamsData as unknown as Team[])

      const { data: studentsData, error } = await supabase
        .from('students')
        .select(`*, teams ( name, color_hex )`)
        .order('chest_no', { ascending: true })

      if (error) throw error
      setStudents(studentsData as unknown as Student[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setIsAddOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const { error } = await supabase.from('students').delete().eq('id', deleteId)
      if (error) throw error
      setStudents(prev => prev.filter(s => s.id !== deleteId))
    } catch (err) {
      alert("Failed to delete")
    } finally {
      setDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      setStudents([])
      setIsBulkDeleteOpen(false)
    } catch (err) {
      alert("Bulk delete failed")
    }
  }

  const availableClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.class_grade).filter(Boolean))
    return Array.from(classes).sort()
  }, [students])

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase()
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(query) ||
        (s.chest_no && s.chest_no.toLowerCase().includes(query))
      const matchesTeam = filterTeam === "all" || s.team_id === filterTeam
      const matchesSection = filterSection === "all" || s.section === filterSection
      const matchesClass = filterClass === "all" || s.class_grade === filterClass
      return matchesSearch && matchesTeam && matchesSection && matchesClass
    })
  }, [students, search, filterTeam, filterSection, filterClass])

  const clearFilters = () => {
    setSearch("")
    setFilterTeam("all")
    setFilterSection("all")
    setFilterClass("all")
  }

  const hasActiveFilters = search !== "" || filterTeam !== "all" || filterSection !== "all" || filterClass !== "all"
  const seniorCount = students.filter(s => s.section === "Senior").length
  const juniorCount = students.filter(s => s.section === "Junior").length
  const subJuniorCount = students.filter(s => s.section === "Sub-Junior").length
  const assignedTeams = new Set(students.map(s => s.team_id)).size

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="surface-panel flex items-center gap-3 rounded-3xl px-6 py-5 text-navy">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold">Loading student directory</span>
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
              Student Directory
            </div>
            <h1 className="text-display mt-5 text-4xl text-ivory sm:text-5xl">Organize every participant.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-ivory/62 sm:text-base">
              Search, import, classify, and manage student profiles across teams, sections, classes, and chest numbers.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:w-[30rem]">
            <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
              <div className="text-title text-2xl text-ivory">{students.length}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Students</div>
            </div>
            <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
              <div className="text-title text-2xl text-ivory">{assignedTeams}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Active Teams</div>
            </div>
            <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
              <div className="text-title text-2xl text-ivory">{availableClasses.length}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Classes</div>
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
                placeholder="Search by name or chest number"
                className="h-12 pl-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="h-12 w-full rounded-xl border-navy/12 bg-ivory/70 sm:w-[13rem]">
                  <Filter className="mr-2 size-4 text-slatebrand" />
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger className="h-12 w-[10rem] rounded-xl border-navy/12 bg-ivory/70">
                  <Filter className="mr-2 size-4 text-slatebrand" />
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Sub-Junior">Sub-Junior</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="h-12 w-[10rem] rounded-xl border-navy/12 bg-ivory/70">
                  <Filter className="mr-2 size-4 text-slatebrand" />
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {availableClasses.map(cls => <SelectItem key={cls as string} value={cls as string}>{cls}</SelectItem>)}
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
          <Button variant="outline" onClick={() => setIsLimitsOpen(true)}>
            <Settings2 className="size-4" />
            Limits
          </Button>
          <Button onClick={() => { setEditingStudent(null); setIsAddOpen(true); }}>
            <Plus className="size-4" />
            Add Student
          </Button>
          <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
            <Upload className="size-4" />
            Import CSV
          </Button>
          {students.length > 0 && (
            <Button variant="destructive" onClick={() => setIsBulkDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete All
            </Button>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <Users className="size-4 text-gold" />
            Filtered roster
          </div>
          <div className="text-title text-3xl text-navy">{filteredStudents.length}</div>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <GraduationCap className="size-4 text-gold" />
            Senior
          </div>
          <div className="text-title text-3xl text-navy">{seniorCount}</div>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <GraduationCap className="size-4 text-gold" />
            Junior
          </div>
          <div className="text-title text-3xl text-navy">{juniorCount}</div>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <GraduationCap className="size-4 text-gold" />
            Sub-Junior
          </div>
          <div className="text-title text-3xl text-navy">{subJuniorCount}</div>
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[2rem] border border-navy/10 bg-ivory/60 shadow-premium backdrop-blur-xl md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-navy/10 bg-navy text-ivory hover:bg-navy">
              <TableHead className="h-12 pl-5 text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Chest</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Student</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Class</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Section</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Team</TableHead>
              <TableHead className="pr-5 text-right text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 text-slatebrand">
                    <Search className="size-9 opacity-35" />
                    <p className="text-sm font-semibold">No students found matching your filters.</p>
                    {hasActiveFilters && <Button variant="link" onClick={clearFilters}>Clear all filters</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id} className="border-navy/8 transition hover:bg-gold/8">
                  <TableCell className="pl-5 font-mono text-sm font-black text-navy">{student.chest_no || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="grid size-10 place-items-center rounded-2xl text-sm font-black text-ivory shadow-premium"
                        style={{ backgroundColor: student.teams?.color_hex || "#0A1D2C" }}
                      >
                        {initials(student.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-navy">{student.name}</div>
                        <div className="mt-1 text-xs font-semibold text-slatebrand">ID {student.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-slatebrand">{student.class_grade || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={sectionTone(student.section)}>{student.section}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: `${student.teams?.color_hex || "#123B4F"}55`,
                        color: student.teams?.color_hex || "#123B4F",
                        backgroundColor: `${student.teams?.color_hex || "#123B4F"}12`,
                      }}
                    >
                      {student.teams?.name || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(student)} aria-label={`Edit ${student.name}`}>
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="hover:text-destructive" onClick={() => setDeleteId(student.id)} aria-label={`Delete ${student.name}`}>
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
        {filteredStudents.length === 0 ? (
          <div className="surface-panel rounded-3xl p-8 text-center">
            <Search className="mx-auto mb-3 size-9 text-slatebrand/40" />
            <p className="text-sm font-semibold text-slatebrand">No students found.</p>
            {hasActiveFilters && <Button variant="link" onClick={clearFilters}>Clear filters</Button>}
          </div>
        ) : (
          filteredStudents.map((student) => (
            <article key={student.id} className="surface-elevated rounded-3xl p-5">
              <div className="flex items-start gap-4">
                <div
                  className="grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-black text-ivory shadow-premium"
                  style={{ backgroundColor: student.teams?.color_hex || "#0A1D2C" }}
                >
                  {initials(student.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-slatebrand">
                    Chest {student.chest_no || '-'}
                  </div>
                  <h2 className="text-title mt-1 text-xl text-navy">{student.name}</h2>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(student.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className={sectionTone(student.section)}>{student.section}</Badge>
                <span className="inline-flex items-center gap-1 rounded-full border border-navy/10 bg-navy/6 px-3 py-1 text-xs font-bold text-slatebrand">
                  <IdCard className="size-3" />
                  {student.class_grade || 'No class'}
                </span>
                <span
                  className="rounded-full border px-3 py-1 text-xs font-bold"
                  style={{
                    borderColor: `${student.teams?.color_hex || "#123B4F"}55`,
                    color: student.teams?.color_hex || "#123B4F",
                    backgroundColor: `${student.teams?.color_hex || "#123B4F"}12`,
                  }}
                >
                  {student.teams?.name || "Unknown"}
                </span>
              </div>

              <div className="mt-5">
                <Button variant="outline" className="w-full" onClick={() => handleEdit(student)}>
                  <Edit2 className="size-4" />
                  Edit Student
                </Button>
              </div>
            </article>
          ))
        )}
      </section>

      <StudentFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        student={editingStudent}
        teams={teams}
        onSuccess={loadData}
      />

      <CsvUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        teams={teams}
        onSuccess={loadData}
      />

      <LimitSettingsDialog
        open={isLimitsOpen}
        onOpenChange={setIsLimitsOpen}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the student and their event participations.
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
              Delete all students?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure? This will delete <strong>ALL {students.length} students</strong> from the database.
              This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete everything</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
