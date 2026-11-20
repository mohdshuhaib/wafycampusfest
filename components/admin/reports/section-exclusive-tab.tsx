"use client"

import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mic2, UserX, Wand2, Download, Loader2, Sparkles, FileText } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toast } from "sonner"

export function SectionExclusiveTab({
  students,
  filterTeam,
  search,
}: {
  students: any[]
  filterTeam: string
  search: string
}) {
  const getList = (category: string) => {
    return students.filter((student) => {
      if (student.participations.length === 0) return false
      const isTeamMatch = filterTeam === "all" || student.team_id === filterTeam
      const isSearchMatch =
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        (student.chest_no && student.chest_no.toLowerCase().includes(search.toLowerCase())) ||
        (student.class_grade && student.class_grade.toLowerCase().includes(search.toLowerCase()))
      const allMatch = student.participations.every((p: any) => p.events?.category === category)
      return isTeamMatch && isSearchMatch && allMatch
    })
  }

  const offStageList = getList("OFF STAGE")
  const onStageList = getList("ON STAGE")

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
      <ExclusivePanel
        title="Only OFF STAGE"
        helper="Students registered only in off-stage events (not in on-stage)."
        tone="blue"
        count={offStageList.length}
        students={offStageList}
        icon={Wand2}
      />
      <ExclusivePanel
        title="Only ON STAGE"
        helper="Students registered only in on-stage events (not in off-stage)."
        tone="gold"
        count={onStageList.length}
        students={onStageList}
        icon={Mic2}
      />
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
  const [exporting, setExporting] = useState(false)
  const toneClass = tone === "blue" ? "bg-deepblue text-ivory" : "bg-gold/14 text-gold"

  // Sort students in order of class (e.g. USRA 1, USRA 2...), then chest_no or name
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const classA = (a.class_grade || a.section || "").trim()
      const classB = (b.class_grade || b.section || "").trim()
      const classComp = classA.localeCompare(classB, undefined, { numeric: true, sensitivity: "base" })
      if (classComp !== 0) return classComp

      const chestA = parseInt(a.chest_no) || 999999
      const chestB = parseInt(b.chest_no) || 999999
      if (chestA !== chestB) return chestA - chestB

      return (a.name || "").localeCompare(b.name || "")
    })
  }, [students])

  // PDF Export
  const handleExportPDF = async () => {
    if (sortedStudents.length === 0) {
      toast.error("No students to export")
      return
    }

    try {
      setExporting(true)
      const doc = new jsPDF("p", "mm", "a4")
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15

      // 1. Top Left Logo (using pre-optimized logo-sm.png)
      let logoDataUrl = ""
      try {
        const res = await fetch("/logo-sm.png")
        if (res.ok) {
          const blob = await res.blob()
          logoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(String(reader.result || ""))
            reader.readAsDataURL(blob)
          })
        }
      } catch (e) {
        console.warn("Could not load logo for PDF", e)
      }

      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, "PNG", margin, 12, 18, 22.5)
        } catch {}
      }

      // 2. Header Text
      doc.setFontSize(15)
      doc.setFont("helvetica", "bold")
      doc.text("WAFY CAMPUS KALIKAVU ARTS FEST 2026-27", pageWidth / 2, 18, { align: "center" })

      doc.setFontSize(13)
      doc.setFont("helvetica", "bold")
      doc.text(`SECTION EXCLUSIVE REPORT - ${title.toUpperCase()}`, pageWidth / 2, 26, { align: "center" })

      doc.setFontSize(8.5)
      doc.setFont("helvetica", "normal")
      doc.text(
        `Total: ${sortedStudents.length} Students • Class-wise Order (e.g. USRA 1, USRA 2...) • Date: ${new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}`,
        pageWidth / 2,
        32,
        { align: "center" }
      )

      // Divider Line
      doc.setDrawColor(210, 210, 210)
      doc.setLineWidth(0.3)
      doc.line(margin, 36, pageWidth - margin, 36)

      // 3. Table Rows with Class Section Dividers
      const tableBody: any[] = []
      let currentClass = ""
      let slNo = 1

      for (const student of sortedStudents) {
        const studentClass = (student.class_grade || student.section || "General").trim()
        if (studentClass !== currentClass) {
          currentClass = studentClass
          const countInClass = sortedStudents.filter(
            (s) => (s.class_grade || s.section || "General").trim() === currentClass
          ).length

          tableBody.push([
            {
              content: `CLASS: ${currentClass} (${countInClass} Students)`,
              colSpan: 4,
              styles: {
                fillColor: [240, 244, 248],
                textColor: [10, 29, 44],
                fontStyle: "bold",
                halign: "left",
                fontSize: 9,
                minCellHeight: 8,
              },
            },
          ])
        }

        const studentName = student.chest_no
          ? `${student.name} (${student.chest_no})`
          : student.name
        const teamName = student.teams?.name || "-"

        tableBody.push([
          slNo.toString(),
          studentName,
          teamName,
          studentClass,
        ])
        slNo++
      }

      autoTable(doc, {
        startY: 40,
        head: [["SL NO", "NAME OF THE STUDENT", "TEAM", "CLASS"]],
        body: tableBody,
        theme: "grid",
        headStyles: {
          fillColor: [10, 29, 44],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9.5,
          halign: "center",
          valign: "middle",
          minCellHeight: 9,
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [15, 23, 42],
          valign: "middle",
          minCellHeight: 7.5,
        },
        columnStyles: {
          0: { cellWidth: 16, halign: "center", fontStyle: "bold" },
          1: { cellWidth: 80, halign: "left", fontStyle: "bold" },
          2: { cellWidth: 44, halign: "center" },
          3: { cellWidth: 40, halign: "center", fontStyle: "bold" },
        },
        didDrawPage: (data) => {
          const currentPage = data.pageNumber
          doc.setFontSize(8)
          doc.setTextColor(120, 120, 120)
          doc.text(
            `Wafy Campus Kalikavu Arts Fest • ${title}`,
            margin,
            pageHeight - 8
          )
          doc.text(
            `Page ${currentPage}`,
            pageWidth - margin,
            pageHeight - 8,
            { align: "right" }
          )
        },
      })

      const safeFileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_report.pdf`
      doc.save(safeFileName)
      toast.success(`${title} PDF exported successfully!`)
    } catch (err: any) {
      console.error("Error generating PDF:", err)
      toast.error("Failed to generate PDF: " + err.message)
    } finally {
      setExporting(false)
    }
  }

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

          <div className="flex items-center gap-2">
            <Badge variant={tone === "gold" ? "gold" : "outline"} className="h-8 px-3 font-bold">
              {count}
            </Badge>

            <Button
              size="sm"
              variant="outline"
              disabled={exporting || students.length === 0}
              onClick={handleExportPDF}
              className="h-8 gap-1.5 border-navy/15 text-xs font-bold text-navy hover:bg-navy/5"
            >
              {exporting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5 text-gold" />
              )}
              Export PDF
            </Button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <SimpleTable students={sortedStudents} />
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
          <TableHead className="w-12 text-center font-black text-slatebrand">#</TableHead>
          <TableHead className="font-black text-slatebrand">Student Name</TableHead>
          <TableHead className="font-black text-slatebrand text-center">Class</TableHead>
          <TableHead className="font-black text-slatebrand text-center">Team</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student, idx) => (
          <TableRow key={student.id} className="border-navy/8 hover:bg-gold/6">
            <TableCell className="text-center font-bold text-slatebrand text-xs">
              {idx + 1}
            </TableCell>
            <TableCell>
              <div className="font-bold text-navy">{student.name}</div>
              <div className="text-xs font-semibold text-slatebrand">
                {student.chest_no ? `Chest: ${student.chest_no}` : "No chest"}
              </div>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="outline" className="font-bold bg-navy/5 text-navy border-navy/15 text-xs">
                {student.class_grade || student.section || "-"}
              </Badge>
            </TableCell>
            <TableCell className="text-center">
              <Badge
                variant="outline"
                style={{
                  color: student.teams?.color_hex || "#1e3a8a",
                  borderColor: `${student.teams?.color_hex || "#1e3a8a"}44`,
                  backgroundColor: `${student.teams?.color_hex || "#1e3a8a"}12`,
                }}
              >
                {student.teams?.name || "-"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
