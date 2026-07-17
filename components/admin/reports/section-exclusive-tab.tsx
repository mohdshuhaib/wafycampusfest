"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Mic2, UserX, Wand2 } from "lucide-react"

export function SectionExclusiveTab({ students, filterTeam, search }: { students: any[], filterTeam: string, search: string }) {
  const getList = (category: string) => {
    return students.filter((student) => {
      if (student.participations.length === 0) return false
      const isTeamMatch = filterTeam === "all" || student.team_id === filterTeam
      const isSearchMatch = student.name.toLowerCase().includes(search.toLowerCase())
      const allMatch = student.participations.every((p: any) => p.events?.category === category)
      return isTeamMatch && isSearchMatch && allMatch
    })
  }

  const offStageList = getList("OFF STAGE")
  const onStageList = getList("ON STAGE")

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
      <ExclusivePanel title="Only OFF STAGE" helper="Students registered only in off-stage events." tone="blue" count={offStageList.length} students={offStageList} icon={Wand2} />
      <ExclusivePanel title="Only ON STAGE" helper="Students registered only in on-stage events." tone="gold" count={onStageList.length} students={onStageList} icon={Mic2} />
    </div>
  )
}

function ExclusivePanel({
  title,
  helper,
  tone,
  count,
  students,
  icon: Icon,
}: {
  title: string
  helper: string
  tone: "blue" | "gold"
  count: number
  students: any[]
  icon: typeof Mic2
}) {
  const toneClass = tone === "blue" ? "bg-deepblue text-ivory" : "bg-gold/14 text-gold"

  return (
    <div className="surface-elevated flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem]">
      <div className="shrink-0 border-b border-navy/10 bg-ivory/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex size-10 items-center justify-center rounded-2xl ${toneClass}`}>
              <Icon className="size-5" />
            </div>
            <div>
              <h3 className="text-title text-lg text-navy">{title}</h3>
              <p className="text-xs font-semibold text-slatebrand">{helper}</p>
            </div>
          </div>
          <Badge variant={tone === "gold" ? "gold" : "outline"} className="h-8 px-3">{count}</Badge>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <SimpleTable students={students} />
      </div>
    </div>
  )
}

function SimpleTable({ students }: { students: any[] }) {
  if (students.length === 0) {
    return (
      <div className="flex h-full min-h-56 items-center justify-center gap-2 p-8 text-sm font-bold text-slatebrand">
        <UserX className="size-8 opacity-35" />
        No students found.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-mist">
        <TableRow className="border-navy/10">
          <TableHead className="font-black text-slatebrand">Name</TableHead>
          <TableHead className="font-black text-slatebrand">Team</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student) => (
          <TableRow key={student.id} className="border-navy/8 hover:bg-gold/6">
            <TableCell>
              <div className="font-bold text-navy">{student.name}</div>
              <div className="text-xs font-semibold text-slatebrand">{student.chest_no || "No chest"}</div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" style={{ color: student.teams.color_hex, borderColor: `${student.teams.color_hex}44`, backgroundColor: `${student.teams.color_hex}12` }}>
                {student.teams.name}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
