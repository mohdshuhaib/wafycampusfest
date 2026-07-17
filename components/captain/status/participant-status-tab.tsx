"use client"

import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2, Filter, Search, Trophy, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Student {
  id: string
  name: string
  chest_no: string | null
  section: string
  class_grade: string | null
  participations: {
    attendance_status: string
    events: {
      category: string
      max_participants_per_team: number
    }
  }[]
}

export function ParticipantStatusTab({ students }: { students: Student[] }) {
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")

  const processedData = useMemo(() => {
    let totalPenalty = 0

    const rows = students.map((student) => {
      const validParts = student.participations.filter((p) => p.attendance_status !== "absent")
      const countingParts = validParts.filter((p) => {
        const maxP = p.events?.max_participants_per_team ?? 1
        return maxP <= 5
      })

      const hasOnStage = countingParts.some((p) => p.events?.category === "ON STAGE")
      const hasOffStage = countingParts.some((p) => p.events?.category === "OFF STAGE")
      const isCompliant = hasOnStage && hasOffStage
      const penalty = isCompliant ? 0 : 10
      totalPenalty += penalty

      let statusLabel = "Good"
      let statusColor = "border-success/20 bg-success/10 text-success"

      if (!hasOnStage && !hasOffStage) {
        statusLabel = "No Valid Events"
        statusColor = "border-destructive/20 bg-destructive/10 text-destructive"
      } else if (!hasOnStage) {
        statusLabel = "Missing On-Stage"
        statusColor = "border-[#c98743]/25 bg-[#c98743]/10 text-[#a56529]"
      } else if (!hasOffStage) {
        statusLabel = "Missing Off-Stage"
        statusColor = "border-deepblue/20 bg-deepblue/10 text-deepblue"
      }

      return { ...student, hasOnStage, hasOffStage, isCompliant, penalty, statusLabel, statusColor }
    })

    const filtered = rows.filter((row) => {
      const matchesSearch = row.name.toLowerCase().includes(search.toLowerCase()) ||
        (row.chest_no && row.chest_no.includes(search))
      const matchesFilter = filterStatus === "all" ? true : filterStatus === "good" ? row.isCompliant : !row.isCompliant
      return matchesSearch && matchesFilter
    })

    return { rows: filtered, allRows: rows, totalPenalty }
  }, [students, search, filterStatus])

  const compliantCount = processedData.allRows.filter((row) => row.isCompliant).length
  const actionCount = processedData.allRows.length - compliantCount

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label="Compliance Penalty" value={`-${processedData.totalPenalty}`} helper="Potential deduction" icon={AlertCircle} tone="danger" />
        <Metric label="Action Needed" value={actionCount} helper="Students to review" icon={XCircle} tone="warning" />
        <Metric label="Fully Completed" value={compliantCount} helper="Students compliant" icon={Trophy} tone="success" />
      </div>

      <div className="surface-panel rounded-[2rem] p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
            <Input
              placeholder="Search by name or chest no"
              className="h-11 rounded-2xl pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-11 w-full rounded-2xl bg-ivory sm:w-[210px]">
              <Filter className="mr-2 size-4 text-slatebrand" />
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent className="surface-elevated rounded-2xl border-navy/10">
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="good">Compliant Only</SelectItem>
              <SelectItem value="bad">Non-Compliant Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="surface-elevated overflow-hidden rounded-[2rem]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-mist">
              <TableRow className="border-navy/10">
                <TableHead className="w-[110px] font-black text-slatebrand">Chest No</TableHead>
                <TableHead className="font-black text-slatebrand">Student Name</TableHead>
                <TableHead className="hidden font-black text-slatebrand md:table-cell">Class</TableHead>
                <TableHead className="hidden font-black text-slatebrand md:table-cell">Section</TableHead>
                <TableHead className="text-center font-black text-slatebrand">On-Stage</TableHead>
                <TableHead className="text-center font-black text-slatebrand">Off-Stage</TableHead>
                <TableHead className="pr-6 text-right font-black text-slatebrand">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.rows.map((student) => (
                <TableRow key={student.id} className="border-navy/8 transition-colors hover:bg-gold/6">
                  <TableCell className="bg-navy/4 font-mono font-black text-navy">{student.chest_no || "-"}</TableCell>
                  <TableCell><div className="font-bold text-navy">{student.name}</div></TableCell>
                  <TableCell className="hidden font-semibold text-slatebrand md:table-cell">{student.class_grade || "-"}</TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="outline">{student.section}</Badge></TableCell>
                  <TableCell className="text-center">{student.hasOnStage ? <CheckCircle2 className="mx-auto size-5 text-success" /> : <div className="mx-auto size-2 rounded-full bg-navy/15" />}</TableCell>
                  <TableCell className="text-center">{student.hasOffStage ? <CheckCircle2 className="mx-auto size-5 text-success" /> : <div className="mx-auto size-2 rounded-full bg-navy/15" />}</TableCell>
                  <TableCell className="pr-6 text-right">
                    {student.isCompliant ? (
                      <Badge className="border-success/20 bg-success/10 text-success">Good</Badge>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className={cn("border font-bold", student.statusColor)}>{student.statusLabel}</Badge>
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-black text-destructive">-10 pts</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {processedData.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-56 text-center text-sm font-bold text-slatebrand">No participants found matching your criteria.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="surface-panel flex items-start gap-3 rounded-2xl border-gold/20 bg-gold/10 p-4 text-xs font-semibold text-navy">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-gold" />
        <p>
          <strong>Important Rule:</strong> To avoid the -10 point compliance penalty, a student must participate in at least one On-Stage and one Off-Stage event. Large group events with max participants above 5 are excluded from this requirement count.
        </p>
      </div>
    </div>
  )
}

function Metric({ label, value, helper, icon: Icon, tone }: { label: string; value: string | number; helper: string; icon: typeof Trophy; tone: "danger" | "warning" | "success" }) {
  const toneClasses = {
    danger: "bg-destructive/10 text-destructive",
    warning: "bg-[#c98743]/10 text-[#a56529]",
    success: "bg-success/10 text-success",
  }

  return (
    <div className="surface-elevated rounded-[2rem] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-slatebrand">{label}</p>
          <div className="mt-2 text-3xl font-black text-navy">{value}</div>
          <p className="mt-1 text-xs font-semibold text-slatebrand">{helper}</p>
        </div>
        <div className={`flex size-11 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  )
}
