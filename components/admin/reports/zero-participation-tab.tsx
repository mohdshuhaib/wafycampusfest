"use client"

import { useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { UserX } from "lucide-react"

export function ZeroParticipationTab({ students, filterTeam, search }: { students: any[], filterTeam: string, search: string }) {
  const filteredList = useMemo(() => {
    return students.filter((student) => {
      const isTeamMatch = filterTeam === "all" || student.team_id === filterTeam
      const isZero = student.participations.length === 0
      const isSearchMatch = student.name.toLowerCase().includes(search.toLowerCase()) || (student.chest_no && student.chest_no.includes(search))
      return isTeamMatch && isZero && isSearchMatch
    })
  }, [students, filterTeam, search])

  return (
    <div className="surface-elevated flex h-full flex-col overflow-hidden rounded-[2rem]">
      <div className="shrink-0 border-b border-navy/10 bg-ivory/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <UserX className="size-5" />
            </div>
            <div>
              <h3 className="text-title text-lg text-navy">Inactive Students</h3>
              <p className="text-xs font-semibold text-slatebrand">Students with zero registered events.</p>
            </div>
          </div>
          <Badge variant="destructive" className="h-8 px-3">{filteredList.length}</Badge>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredList.map((student) => (
              <TableRow key={student.id} className="border-navy/8 hover:bg-gold/6">
                <TableCell className="font-mono font-black text-navy">{student.chest_no || "-"}</TableCell>
                <TableCell className="font-bold text-navy">{student.name}</TableCell>
                <TableCell className="font-semibold text-slatebrand">{student.class_grade || "-"}</TableCell>
                <TableCell><Badge variant="outline">{student.section}</Badge></TableCell>
                <TableCell>
                  <span style={{ color: student.teams.color_hex, borderColor: `${student.teams.color_hex}44`, backgroundColor: `${student.teams.color_hex}12` }} className="rounded-full border px-2 py-1 text-xs font-black">
                    {student.teams.name}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {filteredList.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-56 text-center text-sm font-bold text-slatebrand">
                  No inactive students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
