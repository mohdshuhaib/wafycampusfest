"use client"

import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Filter, Search, Users } from "lucide-react"
import { StudentReportModal } from "./student-report-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Student {
  id: string
  name: string
  chest_no: string | null
  class_grade: string | null
  section: string
  team_id: string
  teams: { name: string; color_hex: string }
  participations: any[]
}

interface Props {
  students: Student[]
  teams: { id: string; name: string }[]
}

export function StudentSheetTab({ students, teams }: Props) {
  const [search, setSearch] = useState("")
  const [filterTeam, setFilterTeam] = useState("all")
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase()) ||
        (student.chest_no && student.chest_no.includes(search))
      const matchesTeam = filterTeam === "all" || student.team_id === filterTeam
      return matchesSearch && matchesTeam
    })
  }, [students, search, filterTeam])

  return (
    <div className="surface-elevated flex h-full flex-col overflow-hidden rounded-[2rem]">
      <div className="shrink-0 border-b border-navy/10 bg-ivory/70 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-navy text-gold">
              <Users className="size-5" />
            </div>
            <div>
              <h3 className="text-title text-lg text-navy">All Students Registry</h3>
              <p className="text-xs font-semibold text-slatebrand">Searchable student participation index.</p>
            </div>
            <Badge variant="outline" className="h-7 px-3">{filteredStudents.length}</Badge>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
              <Input
                placeholder="Search name or chest no"
                className="h-10 rounded-2xl pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="h-10 w-full rounded-2xl bg-ivory sm:w-[160px]">
                <Filter className="mr-2 size-3.5 text-slatebrand" />
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent className="surface-elevated rounded-2xl border-navy/10">
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-mist shadow-sm">
            <TableRow className="border-navy/10">
              <TableHead className="w-[110px] font-black text-slatebrand">Chest No</TableHead>
              <TableHead className="font-black text-slatebrand">Name</TableHead>
              <TableHead className="font-black text-slatebrand">Class</TableHead>
              <TableHead className="font-black text-slatebrand">Section</TableHead>
              <TableHead className="font-black text-slatebrand">Team</TableHead>
              <TableHead className="text-center font-black text-slatebrand">Events</TableHead>
              <TableHead className="pr-6 text-right font-black text-slatebrand">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-56 text-center text-sm font-bold text-slatebrand">
                  No students found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id} className="border-navy/8 hover:bg-gold/6">
                  <TableCell className="bg-navy/4 font-mono font-black text-navy">{student.chest_no || "-"}</TableCell>
                  <TableCell className="font-bold text-navy">{student.name}</TableCell>
                  <TableCell className="font-semibold text-slatebrand">{student.class_grade || "-"}</TableCell>
                  <TableCell><Badge variant="outline">{student.section}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full" style={{ backgroundColor: student.teams.color_hex }} />
                      <span className="text-sm font-bold text-navy">{student.teams.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={student.participations.length > 0 ? "gold" : "outline"}>
                      {student.participations.length}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button variant="ghost" size="icon" className="size-9 rounded-2xl" onClick={() => setSelectedStudentId(student.id)}>
                      <Eye className="size-4 text-navy" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <StudentReportModal
        studentId={selectedStudentId}
        open={!!selectedStudentId}
        onOpenChange={(open) => !open && setSelectedStudentId(null)}
      />
    </div>
  )
}
