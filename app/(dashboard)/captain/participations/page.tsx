"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertCircle, Calendar, ChevronDown, FileDown, Loader2, Printer, Search, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { StudentPhoto } from "@/components/student-photo"
import { getImageFormatFromDataUrl, imageUrlToDataUrl } from "@/lib/student-images"

interface RawParticipation {
  id: string
  status: string
  created_at: string
  students: {
    id: string
    name: string
    section: string
    chest_no: string | null
    class_grade: string | null
    image_link: string | null
  }
  events: {
    name: string
    category: string
    event_code: string | null
    grade_type: string | null
  }
  teams: {
    name: string
  } | null
}

interface GroupedParticipant {
  studentId: string
  student: RawParticipation["students"]
  teamName: string
  events: RawParticipation["events"][]
  status: string
}

interface Profile { team_id: string }

export default function CaptainParticipations() {
  const [groupedData, setGroupedData] = useState<GroupedParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const supabase = createClient()

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", user.id)
        .single()

      const profile = profileData as unknown as Profile
      if (!profile?.team_id) return

      const { data: participations, error } = await supabase
        .from("participations")
        .select(`
          id,
          status,
          created_at,
          teams ( name ),
          students ( id, name, section, chest_no, class_grade, image_link ),
          events ( name, category, event_code, grade_type )
        `)
        .eq("team_id", profile.team_id)
        .order("created_at", { ascending: false })

      if (error) throw error

      processGroupedData(participations as any as RawParticipation[])

      const { data: assetData } = await (supabase.from("site_assets") as any)
        .select("value")
        .eq("key", "admit_card_header")
        .single()

      if (assetData) setHeaderImageUrl(assetData.value)
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }

  const processGroupedData = (rows: RawParticipation[]) => {
    const map = new Map<string, GroupedParticipant>()

    rows.forEach((row) => {
      if (!row.students || !row.events) return
      if (row.events.grade_type === "C" || row.events.grade_type === "D") return

      const key = row.students.id

      if (!map.has(key)) {
        map.set(key, {
          studentId: row.students.id,
          student: row.students,
          teamName: row.teams?.name || "Team",
          events: [],
          status: row.status,
        })
      }
      const group = map.get(key)
      if (group && group.events.length < 6) group.events.push(row.events)
    })

    setGroupedData(Array.from(map.values()).sort((a, b) => {
      const chestA = parseInt(a.student.chest_no || "99999", 10) || 99999
      const chestB = parseInt(b.student.chest_no || "99999", 10) || 99999
      return chestA - chestB
    }))
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredData = useMemo(() => {
    return groupedData.filter((item) => {
      const q = searchQuery.toLowerCase()
      return item.student.name.toLowerCase().includes(q) || item.student.chest_no?.toLowerCase().includes(q)
    })
  }, [groupedData, searchQuery])

  const generatePDF = async (itemsToPrint: GroupedParticipant[]) => {
    if (itemsToPrint.length === 0) return alert("No data to print")

    setIsGeneratingPdf(true)

    try {
      const doc = new jsPDF()
      let headerBase64 = ""

      if (headerImageUrl) {
        headerBase64 = await imageUrlToDataUrl(headerImageUrl)
      }

      let isFirstPage = true

      for (let index = 0; index < itemsToPrint.length; index++) {
        const item = itemsToPrint[index]
        if (!isFirstPage) doc.addPage()
        isFirstPage = false

        const margin = 14
        const pageWidth = doc.internal.pageSize.width
        const pageHeight = doc.internal.pageSize.height

        if (headerBase64) {
          doc.addImage(headerBase64, getImageFormatFromDataUrl(headerBase64), margin, 10, pageWidth - margin * 2, 34)
        } else {
          doc.setFillColor(10, 29, 44)
          doc.roundedRect(margin, 10, pageWidth - margin * 2, 34, 3, 3, "F")
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(20)
          doc.setFont("helvetica", "bold")
          doc.text("WAFY CAMPUS KALIKKAV", pageWidth / 2, 23, { align: "center" })
          doc.setFontSize(10)
          doc.text("ARTS FEST PORTAL", pageWidth / 2, 31, { align: "center" })
        }

        doc.setTextColor(10, 29, 44)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(15)
        doc.text("ADMIT CARD", pageWidth / 2, 55, { align: "center" })

        const photoData = await imageUrlToDataUrl(item.student.image_link)
        const profileY = 64
        const photoSize = 34
        doc.setDrawColor(10, 29, 44, 0.18)
        doc.setFillColor(246, 242, 232)
        doc.roundedRect(margin, profileY, pageWidth - margin * 2, 46, 3, 3, "FD")

        if (photoData) {
          doc.addImage(photoData, getImageFormatFromDataUrl(photoData), margin + 6, profileY + 6, photoSize, photoSize)
        } else {
          doc.setFillColor(10, 29, 44)
          doc.roundedRect(margin + 6, profileY + 6, photoSize, photoSize, 3, 3, "F")
          doc.setTextColor(212, 175, 55)
          doc.setFontSize(18)
          doc.text("ID", margin + 23, profileY + 27, { align: "center" })
        }

        autoTable(doc, {
          startY: profileY + 6,
          margin: { left: margin + 46, right: margin + 6 },
          body: [
            ["Chest No", item.student.chest_no || "N/A"],
            ["Name", item.student.name],
            ["Group", item.teamName],
            ["Class", item.student.class_grade || "-"],
          ],
          theme: "grid",
          styles: { fontSize: 9.5, cellPadding: 2.2, lineColor: [210, 198, 169], lineWidth: 0.15, textColor: [10, 29, 44] },
          columnStyles: {
            0: { cellWidth: 28, fontStyle: "bold", fillColor: [237, 231, 217], textColor: [90, 109, 126] },
            1: { cellWidth: "auto", fontStyle: "bold" },
          },
        })

        doc.setFont("helvetica", "bold")
        doc.setFontSize(12)
        doc.setTextColor(10, 29, 44)
        doc.text("Events", margin, 121)
        autoTable(doc, {
          startY: 126,
          margin: { left: margin, right: margin },
          head: [["Sl No", "Code", "Name", "Category", "Grade"]],
          body: item.events.slice(0, 6).map((event, i) => [
            i + 1,
            event.event_code || "-",
            event.name,
            event.category,
            event.grade_type || "-",
          ]),
          theme: "grid",
          headStyles: {
            fillColor: [10, 29, 44],
            textColor: 255,
            fontSize: 10,
            fontStyle: "bold",
            halign: "center",
          },
          columnStyles: {
            0: { cellWidth: 16, halign: "center" },
            1: { cellWidth: 26, halign: "center", fontStyle: "bold" },
            2: { cellWidth: 82 },
            3: { cellWidth: 36, halign: "center" },
            4: { cellWidth: 18, halign: "center", fontStyle: "bold" },
          },
          styles: {
            fontSize: 10,
            cellPadding: 4,
            lineColor: [210, 198, 169],
            lineWidth: 0.15,
            textColor: [10, 29, 44],
          },
          alternateRowStyles: {
            fillColor: [246, 242, 232],
          },
        })

        const now = new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })

        doc.setFontSize(8)
        doc.setTextColor(90, 109, 126)
        doc.setFont("helvetica", "italic")
        doc.text(`Printed on ${now}`, margin, pageHeight - 12)
        doc.text("© Wafy Campus Kalikkav Arts Fest Portal", pageWidth / 2, pageHeight - 12, { align: "center" })
        doc.text(`Page ${index + 1} of ${itemsToPrint.length}`, pageWidth - margin, pageHeight - 12, { align: "right" })
      }

      doc.save(`AdmitCards_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e) {
      console.error("PDF Generation failed", e)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleBulkPrint = (category: string) => {
    const listToPrint = filteredData.filter((item) => item.events.some((event) => event.category === category))
    if (listToPrint.length === 0) {
      alert(`No participants found for ${category} in the current view.`)
      return
    }
    generatePDF(listToPrint)
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="surface-elevated flex items-center gap-3 rounded-3xl px-5 py-4">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold text-navy">Loading admit cards</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-20 md:pb-4">
      <section className="surface-dark relative overflow-hidden rounded-[2rem] p-5 sm:p-6">

        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <Badge variant="gold" className="h-8 gap-2 px-3">
              <Sparkles className="size-3.5" />
              Admit Card Desk
            </Badge>
            <h1 className="text-display mt-4 text-3xl text-ivory sm:text-4xl">Download registered entries.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/62">
              Review student registrations and generate one A4 admit card per participant.
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isGeneratingPdf} className="border-ivory/15 bg-ivory/8 text-ivory hover:bg-ivory/14">
                {isGeneratingPdf ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
                {isGeneratingPdf ? "Generating..." : "Print All"}
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="surface-elevated rounded-2xl border-navy/10 p-2">
              <DropdownMenuItem onClick={() => generatePDF(filteredData)}>All Admit Cards</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkPrint("ON STAGE")}>Students with On Stage</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkPrint("OFF STAGE")}>Students with Off Stage</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <section className="surface-panel rounded-[2rem] p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
            <Input
              placeholder="Search student or chest no"
              className="h-11 rounded-2xl pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="ml-auto rounded-full border border-navy/10 bg-ivory px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-slatebrand">
            Showing {filteredData.length} grouped records
          </div>
        </div>
      </section>

      <section className="surface-elevated overflow-hidden rounded-[2rem]">
        <div className="border-b border-navy/10 bg-ivory/70 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-navy text-gold">
              <Calendar className="size-5" />
            </div>
            <div>
              <h2 className="text-title text-lg text-navy">Participants List</h2>
            <p className="text-xs font-semibold text-slatebrand">One card per student. Grade C and D programmes are excluded.</p>
            </div>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-slatebrand">
            <AlertCircle className="size-12 opacity-30" />
            <p className="text-sm font-bold text-navy">No participants found.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-mist">
                <TableRow className="border-navy/10 hover:bg-transparent">
                  <TableHead className="w-[280px] pl-6 font-black text-slatebrand">Student Details</TableHead>
                  <TableHead className="font-black text-slatebrand">Section</TableHead>
                  <TableHead className="font-black text-slatebrand">Group</TableHead>
                  <TableHead className="font-black text-slatebrand">Events Count</TableHead>
                  <TableHead className="pr-6 text-right font-black text-slatebrand">Admit Card</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row) => (
                  <TableRow key={row.studentId} className="border-navy/8 transition-colors hover:bg-gold/6">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <StudentPhoto imageLink={row.student.image_link} name={row.student.name} className="size-12" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-bold text-navy">{row.student.name}</span>
                          <span className="mt-0.5 font-mono text-xs font-semibold text-slatebrand">
                            {row.student.chest_no ? `#${row.student.chest_no}` : "No Chest No"}
                            {row.student.class_grade && ` - Class ${row.student.class_grade}`}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.student.section}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold text-navy">{row.teamName}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-sm font-black text-navy">{row.events.length} Events</span>
                        {Array.from(new Set(row.events.map((event) => event.category))).map((category) => (
                          <Badge
                            key={category}
                            variant={category === "ON STAGE" ? "gold" : "outline"}
                            className={cn(category === "OFF STAGE" && "border-deepblue/20 bg-deepblue/10 text-deepblue")}
                          >
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button variant="outline" size="sm" className="h-9 rounded-2xl" onClick={() => generatePDF([row])} disabled={isGeneratingPdf}>
                        <FileDown className="mr-2 size-3.5" /> Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
