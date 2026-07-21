"use client"

import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, Clock, Filter, Search, UserMinus, UserX } from "lucide-react"

interface Participation {
  id: string
  attendance_status: string | null
  points_earned?: number | null
  event: { name: string; category: string; event_code: string; grade_type?: string | null }
  student: { name: string; chest_no: string | null; class_grade: string | null }
}

export function EventStatusTab({ participations }: { participations: Participation[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const processedData = useMemo(() => {
    let totalDeduction = 0

    const rows = participations.map((participation) => {
      const isAbsent = participation.attendance_status === "absent"
      const isPresent = participation.attendance_status === "present"
      const penalty = isAbsent ? Math.abs(participation.points_earned || 0) : 0
      totalDeduction += penalty

      let statusDisplay = {
        key: "pending",
        label: "Pending",
        subLabel: "Not yet verified",
        color: "border-navy/10 bg-navy/6 text-slatebrand",
        icon: Clock,
      }

      if (isAbsent) {
        statusDisplay = {
          key: "absent",
          label: "Absent",
          subLabel: `-${penalty} Marks`,
          color: "border-destructive/20 bg-destructive/10 text-destructive",
          icon: UserX,
        }
      }
      if (isPresent) {
        statusDisplay = {
          key: "present",
          label: "Present",
          subLabel: "Good",
          color: "border-success/20 bg-success/10 text-success",
          icon: CheckCircle,
        }
      }

      return { ...participation, penalty, statusDisplay }
    })

    const filtered = rows.filter((row) => {
      const matchesSearch = row.event.name.toLowerCase().includes(search.toLowerCase()) ||
        row.student.name.toLowerCase().includes(search.toLowerCase()) ||
        (row.student.chest_no && row.student.chest_no.includes(search))
      const matchesStatus = statusFilter === "all" || row.statusDisplay.key === statusFilter
      return matchesSearch && matchesStatus
    })

    return { rows: filtered, totalDeduction }
  }, [participations, search, statusFilter])

  return (
    <div className="space-y-5">
      <div className="surface-elevated rounded-[2rem] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <UserMinus className="size-6" />
            </div>
            <div>
              <p className="eyebrow text-destructive">Attendance Penalty</p>
              <p className="text-sm font-semibold text-slatebrand">Total deduction for absent students</p>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-4xl font-black text-navy">-{processedData.totalDeduction}</p>
            <span className="text-sm font-black text-destructive">pts</span>
          </div>
        </div>
      </div>

      <div className="surface-panel rounded-[2rem] p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
            <Input placeholder="Search by event name or student" className="h-11 rounded-2xl pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-full rounded-2xl bg-ivory sm:w-[210px]">
              <Filter className="mr-2 size-4 text-slatebrand" />
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent className="surface-elevated rounded-2xl border-navy/10">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="surface-elevated overflow-hidden rounded-[2rem]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-mist">
              <TableRow className="border-navy/10">
                <TableHead className="w-[35%] font-black text-slatebrand">Event Details</TableHead>
                <TableHead className="w-[30%] font-black text-slatebrand">Participant</TableHead>
                <TableHead className="hidden font-black text-slatebrand md:table-cell">Class</TableHead>
                <TableHead className="pr-6 text-right font-black text-slatebrand">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.rows.map((row) => {
                const Icon = row.statusDisplay.icon
                return (
                  <TableRow key={row.id} className="border-navy/8 transition-colors hover:bg-gold/6">
                    <TableCell>
                      <div className="font-bold text-navy">{row.event.name}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant={row.event.category === "ON STAGE" ? "gold" : "outline"}>{row.event.category}</Badge>
                        <span className="rounded-full bg-navy/7 px-2 py-0.5 font-mono text-xs font-bold text-slatebrand">{row.event.event_code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-navy">{row.student.name}</div>
                      <div className="mt-0.5 font-mono text-xs font-semibold text-slatebrand">#{row.student.chest_no || "N/A"}</div>
                    </TableCell>
                    <TableCell className="hidden font-semibold text-slatebrand md:table-cell">{row.student.class_grade || "-"}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${row.statusDisplay.color}`}>
                          <Icon className="size-3.5" />
                          {row.statusDisplay.label}
                        </span>
                        {row.statusDisplay.subLabel && <span className="text-[10px] font-semibold text-slatebrand">{row.statusDisplay.subLabel}</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {processedData.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-56 text-center text-sm font-bold text-slatebrand">
                    {statusFilter !== "all" ? `No ${statusFilter} records found.` : "No attendance records found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
