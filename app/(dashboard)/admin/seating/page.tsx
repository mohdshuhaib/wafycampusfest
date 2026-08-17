"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Plus,
  Search,
  LayoutGrid,
  Trash2,
  Loader2,
  Sparkles,
  Check,
  FileDown,
  AlertTriangle,
  Grid,
  Shuffle,
  Save,
} from "lucide-react"
import jsPDF from "jspdf"

interface ProgrammeEvent {
  id: string
  name: string
  event_code: string | null
  category: string
}

interface SeatItem {
  seatNo: number
  rowIdx: number
  colIdx: number
  studentId: string
  studentName: string
  chestNo: string
  teamName: string
  teamColor: string
  eventCode: string
  eventName: string
}

interface SeatingArrangementRecord {
  id: string
  title: string
  programme_ids: string[]
  seats_per_row: number
  layout_grid: SeatItem[]
  created_at?: string
  programmes_summary?: string
}

// --- 2D CONSTRAINT-AWARE MIXED SHUFFLE ALGORITHM ---
// Penalizes horizontal, vertical column, and diagonal matches of team or programme
function compute2DPenalty(grid: SeatItem[], seatsPerRow: number): number {
  let penalty = 0
  for (let i = 0; i < grid.length; i++) {
    const r = Math.floor(i / seatsPerRow)
    const c = i % seatsPerRow

    // Left neighbor (same row)
    if (c > 0) {
      const left = grid[i - 1]
      if (left.teamName === grid[i].teamName) penalty += 10
      if (left.eventCode === grid[i].eventCode) penalty += 4
    }

    // Top neighbor (previous row, SAME COLUMN) -> High Penalty!
    if (r > 0) {
      const top = grid[i - seatsPerRow]
      if (top.teamName === grid[i].teamName) penalty += 25
      if (top.eventCode === grid[i].eventCode) penalty += 8
    }

    // Top-left diagonal
    if (r > 0 && c > 0) {
      const topLeft = grid[i - seatsPerRow - 1]
      if (topLeft.teamName === grid[i].teamName) penalty += 3
    }

    // Top-right diagonal
    if (r > 0 && c < seatsPerRow - 1) {
      const topRight = grid[i - seatsPerRow + 1]
      if (topRight.teamName === grid[i].teamName) penalty += 3
    }
  }
  return penalty
}

function generateMixed2DLayout(items: any[], seatsPerRow: number): SeatItem[] {
  if (items.length === 0) return []

  let bestGrid: SeatItem[] = []
  let bestPenalty = Infinity

  // Evaluate 500 candidate permutations
  for (let iter = 0; iter < 500; iter++) {
    const shuffled = [...items]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    const candidateGrid: SeatItem[] = shuffled.map((p, idx) => ({
      seatNo: idx + 1,
      rowIdx: Math.floor(idx / seatsPerRow),
      colIdx: idx % seatsPerRow,
      studentId: p.studentId,
      studentName: p.studentName,
      chestNo: p.chestNo,
      teamName: p.teamName,
      teamColor: p.teamColor,
      eventCode: p.eventCode,
      eventName: p.eventName,
    }))

    const p = compute2DPenalty(candidateGrid, seatsPerRow)
    if (p < bestPenalty) {
      bestPenalty = p
      bestGrid = candidateGrid
      if (p === 0) break // Perfect 2D separation
    }
  }

  return bestGrid
}

export default function AdminSeatingPage() {
  const [events, setEvents] = useState<ProgrammeEvent[]>([])
  const [arrangements, setArrangements] = useState<SeatingArrangementRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Active viewing arrangement
  const [activeArrangement, setActiveArrangement] = useState<SeatingArrangementRecord | null>(null)
  const [hasUnsavedShuffle, setHasUnsavedShuffle] = useState(false)
  const [savingShuffle, setSavingShuffle] = useState(false)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [selectedProgrammeIds, setSelectedProgrammeIds] = useState<string[]>([])
  const [seatsPerRow, setSeatsPerRow] = useState<2 | 3 | 4>(3)
  const [programmeSearch, setProgrammeSearch] = useState("")
  const [generating, setGenerating] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  // Delete State
  const [deleteRecord, setDeleteRecord] = useState<SeatingArrangementRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [dbTableMissing, setDbTableMissing] = useState(false)

  const supabase = createClient()

  // Fetch Events and Existing Seating Arrangements
  const fetchData = async () => {
    setLoading(true)
    setDbTableMissing(false)

    // 1. Fetch Events
    const { data: eventsData } = await (supabase.from("events") as any)
      .select("id, name, event_code, category")
      .order("event_code", { ascending: true })

    const eventsList = (eventsData as ProgrammeEvent[]) || []
    setEvents(eventsList)

    const eventsMap = new Map<string, ProgrammeEvent>()
    eventsList.forEach((e) => eventsMap.set(e.id, e))

    // 2. Fetch Seating Arrangements
    const { data: arrangementsData, error } = await (supabase.from("seating_arrangements") as any)
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Could not query seating_arrangements table:", error)
      setDbTableMissing(true)
      setArrangements([])
    } else if (arrangementsData) {
      const records: SeatingArrangementRecord[] = (arrangementsData as any[]).map((r) => {
        const progNames = (r.programme_ids || [])
          .map((pId: string) => {
            const ev = eventsMap.get(pId)
            return ev ? `${ev.event_code ? ev.event_code + " - " : ""}${ev.name}` : null
          })
          .filter(Boolean)
          .join(", ")

        return {
          ...r,
          programmes_summary: progNames || "Events",
        }
      })

      setArrangements(records)
      if (records.length > 0 && !activeArrangement) {
        setActiveArrangement(records[0])
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Open Modal for New Seating Arrangement
  const handleOpenModal = () => {
    setTitle("")
    setSelectedProgrammeIds([])
    setSeatsPerRow(3)
    setProgrammeSearch("")
    setIsModalOpen(true)
  }

  // Toggle Programme Selection
  const toggleProgrammeSelection = (eventId: string) => {
    setSelectedProgrammeIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    )
  }

  // Generate 2D Mixed Seating Layout
  const handleGenerateLayout = async () => {
    if (selectedProgrammeIds.length === 0) {
      toast.error("Please select at least one programme")
      return
    }

    setGenerating(true)

    // Fetch participations for selected programmes
    const { data: participationsData, error } = await (supabase.from("participations") as any)
      .select(`
        id,
        event_id,
        team_id,
        students ( id, name, chest_no, class_grade, section ),
        teams ( id, name, color_hex ),
        events ( id, name, event_code )
      `)
      .in("event_id", selectedProgrammeIds)

    if (error || !participationsData) {
      toast.error("Failed to fetch participant data for selected programmes")
      setGenerating(false)
      return
    }

    const rawList = (participationsData as any[]).map((p) => ({
      studentId: p.students?.id || p.id,
      studentName: p.students?.name || "Participant",
      chestNo: p.students?.chest_no || "N/A",
      teamId: p.teams?.id || p.team_id || "unknown",
      teamName: p.teams?.name || "Team",
      teamColor: p.teams?.color_hex || "#1e3a8a",
      eventCode: p.events?.event_code || "EVT",
      eventName: p.events?.name || "Programme",
    }))

    if (rawList.length === 0) {
      toast.error("No participants registered for the selected programmes")
      setGenerating(false)
      return
    }

    // Generate 2D Mixed Grid
    const layoutGrid = generateMixed2DLayout(rawList, seatsPerRow)

    // Summary of selected programme names
    const selectedEvents = events.filter((e) => selectedProgrammeIds.includes(e.id))
    const progSummary = selectedEvents.map((e) => `${e.event_code || "EVT"} - ${e.name}`).join(", ")

    const autoTitle = title.trim() || `Seating: ${progSummary}`

    const payload = {
      title: autoTitle,
      programme_ids: selectedProgrammeIds,
      seats_per_row: seatsPerRow,
      layout_grid: layoutGrid,
      updated_at: new Date().toISOString(),
    }

    const { data: insertedData, error: insertError } = await (supabase.from("seating_arrangements") as any)
      .insert(payload)
      .select("*")
      .single()

    if (insertError) {
      if (insertError.message?.includes("table") || insertError.code === "42P01") {
        toast.error("Database table 'seating_arrangements' missing. Run migration script 20260816010000_create_seating_arrangements.sql")
        setDbTableMissing(true)
      } else {
        toast.error("Failed to save seating arrangement: " + insertError.message)
      }
    } else if (insertedData) {
      const newRecord: SeatingArrangementRecord = {
        ...insertedData,
        programmes_summary: progSummary,
      }
      toast.success("2D Mixed Seating arrangement generated successfully!")
      setIsModalOpen(false)
      setActiveArrangement(newRecord)
      setHasUnsavedShuffle(false)
      fetchData()
    }

    setGenerating(false)
  }

  // SHUFFLE LAYOUT IN SAVED ARRANGEMENT
  const handleShuffleLayout = () => {
    if (!activeArrangement || !activeArrangement.layout_grid) return

    const currentSeats = activeArrangement.layout_grid
    const seatsPerRowVal = activeArrangement.seats_per_row || 3

    // Run 2D Mixed Shuffler on existing seats
    const shuffledGrid = generateMixed2DLayout(currentSeats, seatsPerRowVal)

    setActiveArrangement({
      ...activeArrangement,
      layout_grid: shuffledGrid,
    })
    setHasUnsavedShuffle(true)
    toast.success("Seating layout shuffled into new 2D mixed arrangement! Click 'Save Shuffled Layout' to persist.")
  }

  // SAVE SHUFFLED LAYOUT TO DATABASE
  const handleSaveShuffledLayout = async () => {
    if (!activeArrangement) return

    setSavingShuffle(true)

    const { error } = await (supabase.from("seating_arrangements") as any)
      .update({
        layout_grid: activeArrangement.layout_grid,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeArrangement.id)

    if (error) {
      toast.error("Failed to save shuffled layout: " + error.message)
    } else {
      toast.success("Shuffled seating layout saved successfully!")
      setHasUnsavedShuffle(false)
      fetchData()
    }

    setSavingShuffle(false)
  }

  // Delete Seating Arrangement
  const handleDeleteArrangement = async () => {
    if (!deleteRecord) return
    setDeleting(true)

    const { error } = await (supabase.from("seating_arrangements") as any)
      .delete()
      .eq("id", deleteRecord.id)

    if (error) {
      toast.error("Failed to delete record: " + error.message)
    } else {
      toast.success("Seating arrangement deleted")
      if (activeArrangement?.id === deleteRecord.id) {
        setActiveArrangement(null)
      }
      setDeleteRecord(null)
      fetchData()
    }
    setDeleting(false)
  }

  // PDF EXPORT FUNCTIONALITY
  const exportPDF = async (recordToPrint: SeatingArrangementRecord) => {
    if (!recordToPrint || !recordToPrint.layout_grid || recordToPrint.layout_grid.length === 0) {
      toast.error("No seating layout grid data to export")
      return
    }

    setExportingPdf(true)

    try {
      const doc = new jsPDF("p", "mm", "a4")
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 14
      let yPos = 14

      // 1. Heading (Centered): "WAFY CAMPUS kalikavu ARTS FEST 2026"
      doc.setFillColor(10, 29, 44)
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 22, 3, 3, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("WAFY CAMPUS KALIKAVU ARTS FEST 2026", pageWidth / 2, yPos + 9, { align: "center" })

      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text("OFFICIAL SEATING ARRANGEMENT & EXAM HALL REGISTER", pageWidth / 2, yPos + 16, { align: "center" })
      yPos += 28

      // 2. Subheading (Centered Middle Aligned): "Seating Arrangement for {Programme Names}"
      doc.setTextColor(10, 29, 44)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      const subHeadingText = `Seating Arrangement for ${recordToPrint.programmes_summary || "Selected Programmes"}`

      const splitSub = doc.splitTextToSize(subHeadingText, pageWidth - margin * 2)
      doc.text(splitSub, pageWidth / 2, yPos, { align: "center" })
      yPos += splitSub.length * 6 + 4

      // Meta info bar
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(
        `Layout: ${recordToPrint.seats_per_row} Seats per Row  |  Total Seats: ${recordToPrint.layout_grid.length}`,
        pageWidth / 2,
        yPos,
        { align: "center" }
      )
      yPos += 8

      // 3. Draw Grid Boxes (Row & Column Layout)
      const seatsPerRow = recordToPrint.seats_per_row || 3
      const grid = recordToPrint.layout_grid
      const totalSeats = grid.length

      const gap = 4
      const boxWidth = (pageWidth - margin * 2 - (seatsPerRow - 1) * gap) / seatsPerRow
      const boxHeight = 28

      const totalRows = Math.ceil(totalSeats / seatsPerRow)

      for (let r = 0; r < totalRows; r++) {
        if (yPos + boxHeight > pageHeight - 15) {
          doc.addPage()
          yPos = 15
        }

        for (let c = 0; c < seatsPerRow; c++) {
          const seatIdx = r * seatsPerRow + c
          if (seatIdx >= totalSeats) break

          const seat = grid[seatIdx]
          const x = margin + c * (boxWidth + gap)

          // Draw Seat Box Container
          doc.setDrawColor(10, 29, 44)
          doc.setLineWidth(0.3)
          doc.setFillColor(248, 246, 240)
          doc.roundedRect(x, yPos, boxWidth, boxHeight, 2, 2, "FD")

          // Box Header Bar: Seat # Left, Chest No Right
          doc.setFillColor(10, 29, 44)
          doc.rect(x, yPos, boxWidth, 6, "F")
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(7.5)
          doc.setFont("helvetica", "bold")
          doc.text(`SEAT #${seat.seatNo}`, x + 2.5, yPos + 4.2)
          doc.text(`#${seat.chestNo}`, x + boxWidth - 2.5, yPos + 4.2, { align: "right" })

          // Student Name (Bold)
          doc.setTextColor(10, 29, 44)
          doc.setFontSize(9)
          doc.setFont("helvetica", "bold")
          const truncatedName =
            seat.studentName.length > 20
              ? seat.studentName.slice(0, 18) + "..."
              : seat.studentName
          doc.text(truncatedName, x + 3, yPos + 12)

          // Group / Team Name
          doc.setFontSize(8)
          doc.setFont("helvetica", "bold")
          doc.setTextColor(90, 109, 126)
          doc.text(`Group: ${seat.teamName}`, x + 3, yPos + 18)

          // Programme Code
          doc.setFontSize(7.5)
          doc.setFont("helvetica", "normal")
          doc.setTextColor(10, 29, 44)
          doc.text(`Prog: ${seat.eventCode || "EVT"}`, x + 3, yPos + 24)
        }

        yPos += boxHeight + gap
      }

      doc.save(`Seating_Arrangement_${recordToPrint.id.slice(0, 8)}.pdf`)
      toast.success("PDF exported successfully!")
    } catch (err) {
      console.error("PDF export error:", err)
      toast.error("Failed to export seating PDF")
    } finally {
      setExportingPdf(false)
    }
  }

  const filteredArrangements = arrangements.filter((r) => {
    const q = searchQuery.toLowerCase()
    return (
      r.title.toLowerCase().includes(q) ||
      (r.programmes_summary && r.programmes_summary.toLowerCase().includes(q))
    )
  })

  const filteredModalEvents = events.filter((e) => {
    const q = programmeSearch.toLowerCase()
    return (
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.event_code && e.event_code.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6 font-sans">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy flex items-center gap-2">
            <LayoutGrid className="size-6 text-gold" />
            Seating Arrangements
          </h1>
          <p className="text-sm text-slatebrand mt-1">
            Create 2D mixed seating layouts, interleave teams & programmes across rows/columns, shuffle layouts, and export PDF grid plans.
          </p>
        </div>

        <Button
          onClick={handleOpenModal}
          className="bg-navy hover:bg-navy/90 text-ivory gap-2 shadow-premium rounded-xl px-5 h-11 cursor-pointer font-bold shrink-0"
        >
          <Plus className="size-4 text-gold" />
          <span>+ Create Seating Arrangement</span>
        </Button>
      </div>

      {/* Database Missing Notice */}
      {dbTableMissing && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-950 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-navy">Database Migration Required</p>
              <p className="text-slatebrand font-medium">
                Run migration script <code className="font-mono bg-amber-500/15 px-1 py-0.5 rounded text-navy font-bold">20260816010000_create_seating_arrangements.sql</code> in Supabase.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout: Left List + Right Active Layout Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Saved Arrangements List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
            <Input
              placeholder="Search arrangements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-ivory/80 border-navy/10 focus:border-gold rounded-xl text-xs"
            />
          </div>

          <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 scrollbar-thin">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 bg-ivory/60 rounded-2xl text-slatebrand">
                <Loader2 className="size-6 animate-spin text-gold mb-2" />
                <p className="text-xs font-medium">Loading seating lists...</p>
              </div>
            ) : filteredArrangements.length === 0 ? (
              <div className="p-6 text-center bg-ivory/60 rounded-2xl border border-navy/10">
                <p className="text-xs font-bold text-navy">No Seating Arrangements</p>
                <p className="text-[11px] text-slatebrand mt-1">
                  Click "+ Create Seating Arrangement" to generate your first seating plan.
                </p>
              </div>
            ) : (
              filteredArrangements.map((arr) => {
                const isSelected = activeArrangement?.id === arr.id

                return (
                  <div
                    key={arr.id}
                    onClick={() => {
                      setActiveArrangement(arr)
                      setHasUnsavedShuffle(false)
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "bg-navy text-ivory border-2 border-gold ring-2 ring-gold/30 shadow-md"
                        : "bg-white/80 border-navy/10 text-navy hover:border-gold/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-extrabold ${isSelected ? "bg-gold text-navy" : "bg-navy/8 text-navy"}`}>
                        {arr.seats_per_row} Seats/Row
                      </span>
                      <span className={`text-[10px] font-bold ${isSelected ? "text-ivory/70" : "text-slatebrand"}`}>
                        {arr.layout_grid?.length || 0} Seats Total
                      </span>
                    </div>

                    <h4 className="font-bold text-sm leading-snug line-clamp-2">
                      {arr.title}
                    </h4>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className={isSelected ? "text-gold font-bold" : "text-slatebrand font-medium"}>
                        {arr.programmes_summary}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteRecord(arr)
                        }}
                        className={`size-6 p-0 ${isSelected ? "text-red-300 hover:bg-white/10" : "text-destructive hover:bg-destructive/10"}`}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Seating Layout On-Screen Grid & PDF Export */}
        <div className="lg:col-span-8 space-y-4">
          {!activeArrangement ? (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-ivory/60 rounded-3xl border border-navy/10 min-h-[400px]">
              <div className="size-16 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-4">
                <Grid className="size-8" />
              </div>
              <h3 className="text-lg font-bold text-navy">No Arrangement Selected</h3>
              <p className="text-sm text-slatebrand max-w-sm mt-1">
                Select an existing arrangement from the left list or create a new seating layout.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-navy/10 bg-ivory/80 p-5 sm:p-6 shadow-xs space-y-6">
              {/* Header Bar with Shuffle & Export Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-navy bg-gold/20 px-2.5 py-0.5 rounded-full border border-gold/30">
                      {activeArrangement.seats_per_row} Seats per Row
                    </span>
                    <span className="text-xs font-bold text-slatebrand">
                      ({activeArrangement.layout_grid.length} Total Seats)
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-navy mt-1">
                    {activeArrangement.title}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* SHUFFLE BUTTON */}
                  <Button
                    onClick={handleShuffleLayout}
                    variant="outline"
                    className="border-gold/30 bg-gold/10 text-navy hover:bg-gold/20 gap-2 rounded-xl h-11 px-4 font-extrabold cursor-pointer"
                  >
                    <Shuffle className="size-4 text-gold" />
                    <span>Shuffle Layout</span>
                  </Button>

                  {/* SAVE SHUFFLED LAYOUT BUTTON */}
                  {hasUnsavedShuffle && (
                    <Button
                      onClick={handleSaveShuffledLayout}
                      disabled={savingShuffle}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl h-11 px-4 font-bold cursor-pointer shadow-md animate-pulse"
                    >
                      {savingShuffle ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      <span>Save Shuffled Layout</span>
                    </Button>
                  )}

                  {/* EXPORT PDF BUTTON */}
                  <Button
                    onClick={() => exportPDF(activeArrangement)}
                    disabled={exportingPdf}
                    className="bg-navy hover:bg-navy/90 text-ivory gap-2 rounded-xl h-11 px-4 font-bold cursor-pointer shadow-premium shrink-0"
                  >
                    {exportingPdf ? (
                      <Loader2 className="size-4 animate-spin text-gold" />
                    ) : (
                      <FileDown className="size-4 text-gold" />
                    )}
                    <span>Export Seating PDF</span>
                  </Button>
                </div>
              </div>

              {/* Subheading Badge */}
              <div className="p-3.5 rounded-2xl bg-navy/4 border border-navy/8 text-center space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slatebrand block">
                  Middle Aligned Subheading
                </span>
                <p className="text-sm font-black text-navy">
                  Seating Arrangement for {activeArrangement.programmes_summary}
                </p>
              </div>

              {/* Dynamic Grid Seats Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                    2D Mixed Seating Grid Layout ({activeArrangement.seats_per_row} Columns)
                  </Label>

                  {hasUnsavedShuffle && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Sparkles className="size-3.5" /> Shuffled (Unsaved)
                    </span>
                  )}
                </div>

                <div
                  className={`grid gap-3 ${
                    activeArrangement.seats_per_row === 4
                      ? "grid-cols-2 sm:grid-cols-4"
                      : activeArrangement.seats_per_row === 3
                      ? "grid-cols-1 sm:grid-cols-3"
                      : "grid-cols-1 sm:grid-cols-2"
                  }`}
                >
                  {activeArrangement.layout_grid.map((seat) => (
                    <div
                      key={seat.seatNo}
                      className="p-3.5 rounded-2xl bg-white border border-navy/15 shadow-xs space-y-2 relative hover:border-gold/50 transition-all"
                    >
                      {/* Seat Top Bar */}
                      <div className="flex items-center justify-between border-b border-navy/8 pb-1.5">
                        <span className="font-mono text-[10px] font-extrabold bg-navy text-ivory px-2 py-0.5 rounded">
                          Seat #{seat.seatNo}
                        </span>
                        <span className="font-mono text-xs font-black text-navy">
                          #{seat.chestNo}
                        </span>
                      </div>

                      {/* Participant Name */}
                      <h4 className="font-bold text-navy text-sm leading-snug truncate">
                        {seat.studentName}
                      </h4>

                      {/* Team & Event Badges */}
                      <div className="flex items-center justify-between gap-1 pt-1 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="size-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: seat.teamColor || "#1e3a8a" }}
                          />
                          <span className="font-semibold text-slatebrand truncate">
                            {seat.teamName}
                          </span>
                        </div>

                        <span className="font-mono text-[10px] font-extrabold bg-navy/8 text-navy px-1.5 py-0.5 rounded shrink-0">
                          {seat.eventCode}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Seating Arrangement Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-ivory border border-navy/10 shadow-2xl rounded-3xl p-6 sm:p-8 scrollbar-thin">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-black text-navy flex items-center gap-2">
              <Sparkles className="size-5 text-gold" />
              Create Seating Arrangement
            </DialogTitle>
            <DialogDescription className="text-slatebrand text-sm">
              Select one or multiple programmes, pick row width (2, 3, or 4), and generate 2D mixed team seats.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Title / Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                Arrangement Title (Optional)
              </Label>
              <Input
                placeholder="e.g. Hall A - Morning Session"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 bg-white border-navy/15 rounded-xl text-sm"
              />
            </div>

            {/* 1. SELECT PROGRAMMES (Multi-Select Checklist) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                  Select Programmes ({selectedProgrammeIds.length} Selected)
                </Label>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
                <Input
                  placeholder="Search programmes by code or name..."
                  value={programmeSearch}
                  onChange={(e) => setProgrammeSearch(e.target.value)}
                  className="pl-9 h-10 bg-white border-navy/15 rounded-xl text-sm"
                />
              </div>

              <div className="max-h-44 overflow-y-auto rounded-2xl border border-navy/15 bg-white p-1.5 space-y-1 scrollbar-thin">
                {filteredModalEvents.length === 0 ? (
                  <p className="p-3 text-xs text-center text-slatebrand">
                    No programmes found matching search.
                  </p>
                ) : (
                  filteredModalEvents.map((evt) => {
                    const isSelected = selectedProgrammeIds.includes(evt.id)

                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => toggleProgrammeSelection(evt.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-navy text-ivory border-2 border-gold font-black shadow-xs"
                            : "hover:bg-navy/6 text-navy font-medium bg-white/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span
                            className={`font-mono text-[11px] px-2 py-0.5 rounded font-extrabold shrink-0 ${
                              isSelected ? "bg-gold text-navy font-black" : "bg-navy/8 text-navy"
                            }`}
                          >
                            {evt.event_code || "N/A"}
                          </span>
                          <span className="truncate">{evt.name}</span>
                        </div>

                        {isSelected && <Check className="size-4 text-gold stroke-[3] shrink-0" />}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* 2. SEATS PER ROW OPTIONS (Minimum 2, Maximum 4) */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                Seats Per Row Layout (Col Width)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((count) => {
                  const isActive = seatsPerRow === count
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setSeatsPerRow(count as 2 | 3 | 4)}
                      className={`p-3 rounded-2xl border text-center font-black text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isActive
                          ? "bg-navy text-ivory border-2 border-gold ring-2 ring-gold/40 shadow-md"
                          : "bg-white/80 border-navy/15 text-navy hover:bg-navy/6"
                      }`}
                    >
                      <span>{count} / Row</span>
                      {isActive && <Check className="size-3.5 text-gold stroke-[3]" />}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-slatebrand font-medium text-center">
                Example: 9 participants with 3/row = <span className="font-bold text-navy">3x3 Grid</span>. 10 participants with 2/row = <span className="font-bold text-navy">5x2 Grid</span>.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-navy/15 text-navy hover:bg-navy/5 rounded-xl h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateLayout}
              disabled={generating || selectedProgrammeIds.length === 0}
              className="bg-navy hover:bg-navy/90 text-ivory gap-2 rounded-xl h-11 px-6 shadow-premium cursor-pointer font-bold"
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin text-gold" />
                  Generating...
                </>
              ) : (
                <>
                  <Check className="size-4 text-gold" />
                  Generate & Save Layout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteRecord} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <DialogContent className="max-w-md bg-ivory border border-navy/10 shadow-2xl rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-black text-navy flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Remove Seating Arrangement
            </DialogTitle>
            <DialogDescription className="text-slatebrand text-sm">
              Are you sure you want to remove <span className="font-bold text-navy">{deleteRecord?.title}</span>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteRecord(null)}
              className="border-navy/15 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteArrangement}
              disabled={deleting}
              className="rounded-xl gap-2 cursor-pointer font-bold"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Remove Arrangement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
