"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Scale,
  Plus,
  Search,
  BookOpen,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Eye,
  Loader2,
  Sparkles,
  Printer,
  AlertCircle,
  Mail,
  UserCheck,
  ClipboardList,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Criterion, DEFAULT_CRITERIA, buildFallbackCriteria } from "@/lib/judge-criteria"

interface Judge {
  id: string
  name: string
  email: string
  phone?: string | null
  created_at: string
  assigned_programmes_count?: number
  evaluations_count?: number
}

interface AssignedProgramme {
  id: string
  judge_id: string
  event_id: string
  rule_criterion_1: string
  rule_criterion_2: string
  rule_criterion_3: string
  rule_criterion_4: string
  criteria?: Criterion[]
  overall_remarks?: string | null
  created_at: string
  event?: {
    id: string
    name: string
    event_code: string | null
    category: string
  }
}

interface Evaluation {
  id: string
  assignment_id: string | null
  judge_id: string
  event_id: string
  chest_no: string
  student_name: string | null
  team_name: string | null
  mark_criterion_1: number
  mark_criterion_2: number
  mark_criterion_3: number
  mark_criterion_4: number
  marks_breakdown?: Record<string, number>
  total_marks: number
  grade: string
  positive_remarks: string | null
  negative_remarks: string | null
  created_at: string
}

export default function AdminJudgesPage() {
  const [judges, setJudges] = useState<Judge[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null)
  const [judgeAssignments, setJudgeAssignments] = useState<AssignedProgramme[]>([])
  const [judgeEvaluations, setJudgeEvaluations] = useState<Evaluation[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<AssignedProgramme | null>(null)

  // Add Judge Modal state
  const [isAddJudgeOpen, setIsAddJudgeOpen] = useState(false)
  const [newJudgeName, setNewJudgeName] = useState("")
  const [newJudgeEmail, setNewJudgeEmail] = useState("")
  const [newJudgePassword, setNewJudgePassword] = useState("")
  const [newJudgePhone, setNewJudgePhone] = useState("")
  const [creatingJudge, setCreatingJudge] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Assign Programme Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assignMode, setAssignMode] = useState<"existing" | "manual">("existing")
  const [assignEventId, setAssignEventId] = useState("")

  // Manual Event Creation Fields
  const [manualEventName, setManualEventName] = useState("")
  const [manualEventCode, setManualEventCode] = useState("")
  const [manualEventCategory, setManualEventCategory] = useState("ON STAGE")
  const [manualEventGrade, setManualEventGrade] = useState("A")

  // Dynamic Criteria State (Default 4 Criteria, expandable to 5, 6, etc.)
  const [criteria, setCriteria] = useState<Criterion[]>([
    { id: "c1", name: "Content & Structure (Max 30)", maxMarks: 30 },
    { id: "c2", name: "Clarity & Expression (Max 30)", maxMarks: 30 },
    { id: "c3", name: "Timing & Discipline (Max 20)", maxMarks: 20 },
    { id: "c4", name: "Overall Impact & Accuracy (Max 20)", maxMarks: 20 },
  ])

  const [assigningProgramme, setAssigningProgramme] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  const supabase = createClient()

  // Calculate live total max marks configured
  const totalMaxMarks = useMemo(() => {
    return criteria.reduce((sum, c) => sum + (Number(c.maxMarks) || 0), 0)
  }, [criteria])

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch judges from API
      const res = await fetch("/api/admin/judges")
      const data = await res.json()
      if (data.judges) {
        setJudges(data.judges)
        if (selectedJudge) {
          const updated = data.judges.find((j: Judge) => j.id === selectedJudge.id)
          if (updated) setSelectedJudge(updated)
        }
      }

      // 2. Fetch events list for assigning
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, name, event_code, category")
        .order("name", { ascending: true })

      if (eventsData) setEvents(eventsData)
    } catch (err) {
      console.error("Failed to load judges data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // When a judge is selected, fetch their detailed assignments & evaluations
  const handleSelectJudge = async (judge: Judge) => {
    setSelectedJudge(judge)
    setSelectedAssignment(null)
    try {
      const res = await fetch(`/api/admin/judges/${judge.id}`)
      const data = await res.json()
      if (data.assignments) {
        setJudgeAssignments(data.assignments)
      }
      if (data.evaluations) {
        setJudgeEvaluations(data.evaluations)
      }
    } catch (err) {
      console.error("Failed to fetch judge details:", err)
    }
  }

  // Handle Add Judge
  const handleAddJudge = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!newJudgeName.trim() || !newJudgeEmail.trim() || !newJudgePassword.trim()) {
      setFormError("Please fill in Name, Email, and Password.")
      return
    }

    if (newJudgePassword.length < 6) {
      setFormError("Password must be at least 6 characters.")
      return
    }

    setCreatingJudge(true)
    try {
      const res = await fetch("/api/admin/judges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newJudgeName,
          email: newJudgeEmail,
          password: newJudgePassword,
          phone: newJudgePhone,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create judge.")
      }

      setIsAddJudgeOpen(false)
      setNewJudgeName("")
      setNewJudgeEmail("")
      setNewJudgePassword("")
      setNewJudgePhone("")
      await fetchData()
      if (data.judge) {
        handleSelectJudge(data.judge)
      }
    } catch (err: any) {
      setFormError(err.message || "An error occurred while creating judge.")
    } finally {
      setCreatingJudge(false)
    }
  }

  // Criteria manipulation handlers
  const handleAddCriterion = () => {
    const nextNum = criteria.length + 1
    setCriteria((prev) => [
      ...prev,
      {
        id: `c${nextNum}`,
        name: `Criterion ${nextNum} Rule (Max 10)`,
        maxMarks: 10,
      },
    ])
  }

  const handleRemoveCriterion = (idx: number) => {
    if (criteria.length <= 1) return
    setCriteria((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleUpdateCriterion = (idx: number, field: "name" | "maxMarks", val: any) => {
    setCriteria((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c))
    )
  }

  // Handle Assign Programme
  const handleAssignProgramme = async (e: React.FormEvent) => {
    e.preventDefault()
    setAssignError(null)

    if (!selectedJudge) return

    if (assignMode === "existing" && !assignEventId) {
      setAssignError("Please choose an existing programme / event.")
      return
    }

    if (assignMode === "manual" && !manualEventName.trim()) {
      setAssignError("Please enter the name for the manual event.")
      return
    }

    if (criteria.length === 0) {
      setAssignError("Please configure at least one evaluation criterion.")
      return
    }

    for (let i = 0; i < criteria.length; i++) {
      if (!criteria[i].name?.trim()) {
        setAssignError(`Please enter a rule / description for Criterion ${i + 1}.`)
        return
      }
      if (criteria[i].maxMarks <= 0) {
        setAssignError(`Max marks for Criterion ${i + 1} must be greater than 0.`)
        return
      }
    }

    setAssigningProgramme(true)
    try {
      const payload: any = {
        judge_id: selectedJudge.id,
        criteria,
      }

      if (assignMode === "manual") {
        payload.manual_event = {
          name: manualEventName.trim(),
          event_code: manualEventCode.trim() || undefined,
          category: manualEventCategory,
          grade_type: manualEventGrade,
        }
      } else {
        payload.event_id = assignEventId
      }

      const res = await fetch("/api/admin/judge-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to assign programme.")
      }

      setIsAssignModalOpen(false)
      setAssignEventId("")
      setManualEventName("")
      setManualEventCode("")
      setCriteria([
        { id: "c1", name: "Content & Structure (Max 30)", maxMarks: 30 },
        { id: "c2", name: "Clarity & Expression (Max 30)", maxMarks: 30 },
        { id: "c3", name: "Timing & Discipline (Max 20)", maxMarks: 20 },
        { id: "c4", name: "Overall Impact & Accuracy (Max 20)", maxMarks: 20 },
      ])
      // Refresh assignments
      await handleSelectJudge(selectedJudge)
      await fetchData()
    } catch (err: any) {
      setAssignError(err.message || "An error occurred while assigning.")
    } finally {
      setAssigningProgramme(false)
    }
  }

  // Handle Remove Assignment
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to remove this assigned programme and its scores?")) return
    try {
      const res = await fetch(`/api/admin/judge-assignments?id=${assignmentId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to remove assignment")
      if (selectedAssignment?.id === assignmentId) {
        setSelectedAssignment(null)
      }
      if (selectedJudge) {
        await handleSelectJudge(selectedJudge)
      }
      await fetchData()
    } catch (err) {
      alert("Error removing assignment: " + err)
    }
  }

  // Handle Delete Judge
  const handleDeleteJudge = async (judgeId: string) => {
    if (!confirm("Are you sure you want to permanently delete this judge account, their assignments, and scores?")) return
    try {
      const res = await fetch(`/api/admin/judges/${judgeId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      if (selectedJudge?.id === judgeId) {
        setSelectedJudge(null)
        setSelectedAssignment(null)
      }
      await fetchData()
    } catch (err) {
      alert("Error deleting judge: " + err)
    }
  }

  // Filtered judges
  const filteredJudges = useMemo(() => {
    return judges.filter(
      (j) =>
        j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [judges, searchQuery])

  // Filtered evaluations for selected assignment
  const assignmentEvaluations = useMemo(() => {
    if (!selectedAssignment) return []
    return judgeEvaluations.filter(
      (e) =>
        e.assignment_id === selectedAssignment.id ||
        (e.judge_id === selectedAssignment.judge_id && e.event_id === selectedAssignment.event_id)
    )
  }, [judgeEvaluations, selectedAssignment])

  // Criteria for currently selected assignment
  const activeAssignmentCriteria = useMemo(() => {
    if (!selectedAssignment) return []
    if (selectedAssignment.criteria && selectedAssignment.criteria.length > 0) {
      return selectedAssignment.criteria
    }
    return buildFallbackCriteria(selectedAssignment)
  }, [selectedAssignment])

  const activeTotalMaxMarks = useMemo(() => {
    return activeAssignmentCriteria.reduce((sum, c) => sum + (Number(c.maxMarks) || 0), 0)
  }, [activeAssignmentCriteria])

  // Export Judge Scores PDF
  const handleExportPDF = () => {
    if (!selectedAssignment || !selectedJudge) return

    const criteriaList = activeAssignmentCriteria
    const doc = new jsPDF("p", "mm", "a4")
    const progTitle = `${selectedAssignment.event?.event_code || ""} - ${selectedAssignment.event?.name || "Programme"}`

    // Header Banner
    doc.setFillColor(10, 29, 44) // #0A1D2C
    doc.rect(0, 0, 210, 28, "F")

    doc.setTextColor(212, 175, 55) // #D4AF37 Gold
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("WAFY CAMPUS KALIKKAV ARTS FEST 2026-27", 105, 12, { align: "center" })

    doc.setTextColor(246, 242, 232)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("OFFICIAL JUDGE EVALUATION & SCORE SHEET", 105, 19, { align: "center" })

    // Details Box
    doc.setTextColor(27, 33, 39)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text(`Programme: ${progTitle}`, 14, 36)
    doc.setFont("helvetica", "normal")
    doc.text(`Category: ${selectedAssignment.event?.category || "Standard"}`, 14, 42)

    doc.setFont("helvetica", "bold")
    doc.text(`Judge: ${selectedJudge.name}`, 130, 36)
    doc.setFont("helvetica", "normal")
    doc.text(`Email: ${selectedJudge.email}`, 130, 42)

    // Rubric / Criteria Box
    const boxHeight = Math.max(18, 6 + Math.ceil(criteriaList.length / 2) * 6)
    doc.setFillColor(245, 248, 250)
    doc.roundedRect(14, 46, 182, boxHeight, 2, 2, "F")
    doc.setFontSize(7.5)
    doc.setTextColor(90, 109, 126)

    criteriaList.forEach((c, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = col === 0 ? 18 : 105
      const y = 52 + row * 6
      const label = `Crit ${i + 1} (Max ${c.maxMarks}): ${c.name}`
      doc.text(label.length > 55 ? label.slice(0, 52) + "..." : label, x, y)
    })

    const startTableY = 48 + boxHeight + 4

    // Dynamic Table Headers & Data
    const headRow = [
      "Sl",
      "Chest",
      "Student",
      "Team",
      ...criteriaList.map((c, i) => `C${i + 1}(${c.maxMarks})`),
      `Tot(${activeTotalMaxMarks})`,
      "Grd",
      "Positive Remarks",
      "Negative Remarks",
    ]

    const tableData = assignmentEvaluations.map((ev, idx) => {
      const criteriaCols = criteriaList.map((c, cIdx) => {
        return ev.marks_breakdown?.[c.id] ?? (ev as any)[`mark_criterion_${cIdx + 1}`] ?? 0
      })

      return [
        idx + 1,
        ev.chest_no,
        ev.student_name || "—",
        ev.team_name || "—",
        ...criteriaCols,
        ev.total_marks,
        ev.grade,
        ev.positive_remarks || "—",
        ev.negative_remarks || "—",
      ]
    })

    autoTable(doc, {
      startY: startTableY,
      head: [headRow],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [18, 59, 79],
        textColor: [255, 255, 255],
        fontSize: 7,
        halign: "center",
      },
      styles: {
        fontSize: 6.5,
        textColor: [27, 33, 39],
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 7 },
        1: { halign: "center", fontStyle: "bold", cellWidth: 12 },
      },
    })

    // Overall Programme Remarks
    const finalY = (doc as any).lastAutoTable?.finalY || 160
    if (selectedAssignment.overall_remarks) {
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(18, 59, 79)
      doc.text("Judge's Overall Programme Remarks:", 14, finalY + 10)

      doc.setFont("helvetica", "italic")
      doc.setFontSize(8.5)
      doc.setTextColor(60, 60, 60)
      const splitRemarks = doc.splitTextToSize(selectedAssignment.overall_remarks, 182)
      doc.text(splitRemarks, 14, finalY + 16)
    }

    // Signatures
    const sigY = Math.max(finalY + 36, 260)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(90, 109, 126)
    doc.text("Judge Signature: _______________________", 14, sigY)
    doc.text("Fest Convenor / Verification: _______________________", 120, sigY)

    doc.save(`Judge_${selectedJudge.name.replace(/\s+/g, "_")}_${selectedAssignment.event?.event_code || "Scores"}.pdf`)
  }

  return (
    <div className="space-y-6 font-['Anek_Malayalam',sans-serif]">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-navy">
            <Sparkles className="size-3.5 text-gold" />
            Arts Fest Official Evaluation Panel
          </div>
          <h1 className="mt-1 text-2xl font-black text-navy sm:text-3xl">
            Judges & Programme Evaluation
          </h1>
          <p className="text-xs sm:text-sm text-slatebrand">
            Create judge accounts, assign programmes with customized multi-criteria rules, and view submitted participant scores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setFormError(null)
              setIsAddJudgeOpen(true)
            }}
            className="bg-[#0A1D2C] hover:bg-[#123B4F] text-white shadow font-bold text-xs sm:text-sm"
          >
            <Plus className="mr-1.5 size-4" />
            Add New Judge
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Judges Directory, Right Judge Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Judges List */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border border-navy/10 bg-white/90 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slatebrand flex items-center gap-1.5">
                  <Scale className="size-4 text-gold" />
                  Judges Directory ({judges.length})
                </CardTitle>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/70 border-navy/15 text-sm"
                />
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-1 space-y-2 max-h-[620px] overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slatebrand">
                  <Loader2 className="size-6 animate-spin text-gold" />
                  <span className="mt-2 text-xs">Loading judges...</span>
                </div>
              ) : filteredJudges.length === 0 ? (
                <div className="py-10 text-center text-sm text-slatebrand">
                  No judges found. Click <strong>Add New Judge</strong> above to create one.
                </div>
              ) : (
                filteredJudges.map((judge) => {
                  const isSelected = selectedJudge?.id === judge.id
                  return (
                    <div
                      key={judge.id}
                      onClick={() => handleSelectJudge(judge)}
                      className={`group relative flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                        isSelected
                          ? "border-gold bg-gold/10 shadow-sm ring-1 ring-gold/40"
                          : "border-navy/10 bg-white/80 hover:border-navy/20 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                            isSelected
                              ? "bg-navy text-gold"
                              : "bg-navy/5 text-navy group-hover:bg-navy group-hover:text-white"
                          }`}
                        >
                          <Scale className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-navy">{judge.name}</h3>
                          <p className="truncate text-xs text-slatebrand">{judge.email}</p>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slatebrand">
                            <span className="inline-flex items-center gap-1 rounded bg-navy/5 px-1.5 py-0.5 font-medium">
                              <BookOpen className="size-3 text-gold" />
                              {judge.assigned_programmes_count || 0} programmes
                            </span>
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                              <CheckCircle2 className="size-3" />
                              {judge.evaluations_count || 0} scores
                            </span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight
                        className={`size-4 shrink-0 transition-transform ${
                          isSelected ? "rotate-90 text-navy" : "text-slatebrand/50 group-hover:text-navy"
                        }`}
                      />
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Selected Judge Workspace */}
        <div className="lg:col-span-7 space-y-5">
          {!selectedJudge ? (
            <Card className="flex flex-col items-center justify-center border-dashed border-2 border-navy/15 bg-white/50 p-12 text-center">
              <Scale className="size-12 text-navy/20" />
              <h3 className="mt-3 text-base font-bold text-navy">No Judge Selected</h3>
              <p className="mt-1 max-w-sm text-xs text-slatebrand">
                Select a judge from the left directory to view their assigned programmes, criteria rules, and submitted scores.
              </p>
            </Card>
          ) : (
            <div className="space-y-5">
              {/* Judge Profile Card */}
              <Card className="border border-navy/10 bg-ivory/80 shadow-sm">
                <CardHeader className="p-4 sm:p-5 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-navy text-gold shadow">
                        <UserCheck className="size-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-black text-navy">{selectedJudge.name}</h2>
                          <Badge variant="outline" className="border-gold/40 bg-gold/10 text-gold text-[10px]">
                            Judge Portal Active
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slatebrand mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="size-3.5" />
                            {selectedJudge.email}
                          </span>
                          {selectedJudge.phone && <span>• Phone: {selectedJudge.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setAssignError(null)
                          setAssignEventId("")
                          setManualEventName("")
                          setManualEventCode("")
                          setAssignMode("existing")
                          setIsAssignModalOpen(true)
                        }}
                        className="bg-[#0A1D2C] hover:bg-[#123B4F] text-white text-xs h-8 font-bold"
                      >
                        <Plus className="mr-1.5 size-3.5" />
                        Assign Programme
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteJudge(selectedJudge.id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 px-2"
                        title="Delete Judge"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 pt-0">
                  <div className="mt-2 text-xs text-slatebrand">
                    Judges can log into the fest portal with their email and password to submit scores.
                  </div>
                </CardContent>
              </Card>

              {/* Assigned Programmes Header & List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slatebrand flex items-center gap-2">
                    <BookOpen className="size-4 text-gold" />
                    Assigned Programmes ({judgeAssignments.length})
                  </h3>
                  <span className="text-xs text-slatebrand">
                    Click a programme below to inspect submitted scores
                  </span>
                </div>

                {judgeAssignments.length === 0 ? (
                  <Card className="border border-dashed border-navy/15 bg-white/60 p-8 text-center">
                    <BookOpen className="mx-auto size-8 text-slatebrand/30" />
                    <p className="mt-2 text-xs text-slatebrand">
                      No programmes assigned to this judge yet.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAssignModalOpen(true)}
                      className="mt-3 text-xs bg-white text-navy border-gold hover:bg-gold/10 font-bold"
                    >
                      <Plus className="mr-1 size-3" />
                      Assign a Programme
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {judgeAssignments.map((assignment) => {
                      const isProgSelected = selectedAssignment?.id === assignment.id
                      const evals = judgeEvaluations.filter(
                        (e) =>
                          e.assignment_id === assignment.id ||
                          (e.judge_id === assignment.judge_id && e.event_id === assignment.event_id)
                      )

                      const progCriteria = assignment.criteria && assignment.criteria.length > 0
                        ? assignment.criteria
                        : buildFallbackCriteria(assignment)

                      return (
                        <div
                          key={assignment.id}
                          className={`rounded-2xl border p-4 transition-all ${
                            isProgSelected
                              ? "border-navy bg-navy/5 shadow-sm ring-1 ring-navy/20"
                              : "border-navy/10 bg-white/90 hover:border-navy/25"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div
                              onClick={() => setSelectedAssignment(assignment)}
                              className="cursor-pointer flex-1 min-w-0"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-gold bg-navy px-2 py-0.5 rounded">
                                  {assignment.event?.event_code || "EVENT"}
                                </span>
                                <h4 className="text-base font-bold text-navy truncate">
                                  {assignment.event?.name}
                                </h4>
                                <Badge variant="secondary" className="text-[10px]">
                                  {assignment.event?.category}
                                </Badge>
                              </div>

                              {/* Rubrics Preview with Dynamic Criteria */}
                              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slatebrand">
                                {progCriteria.map((c, idx) => (
                                  <div
                                    key={c.id || idx}
                                    className="rounded bg-navy/5 px-2 py-1 flex items-center gap-1"
                                    title={c.name}
                                  >
                                    <span className="font-bold text-navy">C{idx + 1} ({c.maxMarks}m):</span>
                                    <span className="truncate max-w-[120px] block">{c.name}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-2 flex items-center gap-3 text-xs text-slatebrand">
                                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                                  <CheckCircle2 className="size-3.5" />
                                  {evals.length} Participants Evaluated
                                </span>
                                <span>•</span>
                                <span className="text-[11px]">
                                  {progCriteria.length} Criteria Configured
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center">
                              <Button
                                size="sm"
                                variant={isProgSelected ? "default" : "outline"}
                                onClick={() => setSelectedAssignment(assignment)}
                                className={`text-xs h-8 ${
                                  isProgSelected
                                    ? "bg-navy text-gold"
                                    : "bg-white text-navy border-navy/20 hover:bg-navy/5 font-semibold"
                                }`}
                              >
                                <Eye className="mr-1.5 size-3.5" />
                                {isProgSelected ? "Viewing" : "View Results"}
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveAssignment(assignment.id)}
                                className="text-red-500 hover:bg-red-50 h-8 px-2"
                                title="Unassign Programme"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Selected Assignment: Results & Remarks Panel */}
              {selectedAssignment && (
                <Card className="border border-navy/20 bg-white shadow-md animate-premium-in">
                  <CardHeader className="p-4 sm:p-5 border-b border-navy/10 bg-ivory/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-navy text-gold font-mono text-xs">
                            {selectedAssignment.event?.event_code}
                          </Badge>
                          <CardTitle className="text-lg font-bold text-navy">
                            {selectedAssignment.event?.name} — Results by {selectedJudge.name}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-xs text-slatebrand mt-0.5">
                          Viewing all participant marks, criteria scores, grades, and remarks submitted by this judge.
                        </CardDescription>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleExportPDF}
                        disabled={assignmentEvaluations.length === 0}
                        className="bg-[#0A1D2C] hover:bg-[#123B4F] text-white text-xs h-8 shadow font-bold"
                      >
                        <Printer className="mr-1.5 size-3.5" />
                        Export Score Sheet (PDF)
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Overall Programme Remarks by Judge */}
                    <div className="rounded-xl border border-navy/10 bg-mist/60 p-4">
                      <div className="flex items-center gap-2 font-bold text-xs text-navy">
                        <MessageSquare className="size-4 text-gold" />
                        Judge's Overall Remarks for this Programme:
                      </div>
                      <p className="mt-1.5 text-xs text-slatebrand italic whitespace-pre-wrap">
                        {selectedAssignment.overall_remarks?.trim()
                          ? `"${selectedAssignment.overall_remarks}"`
                          : "No overall remarks provided yet by the judge."}
                      </p>
                    </div>

                    {/* Evaluated Participants Table */}
                    {assignmentEvaluations.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slatebrand">
                        No participant evaluations submitted yet for this programme.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-navy/10">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-navy text-white text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="py-2.5 px-3 text-center">Sl</th>
                              <th className="py-2.5 px-3">Chest</th>
                              <th className="py-2.5 px-3">Participant</th>
                              {activeAssignmentCriteria.map((c, idx) => (
                                <th
                                  key={c.id || idx}
                                  className="py-2.5 px-2 text-center"
                                  title={c.name}
                                >
                                  C{idx + 1} ({c.maxMarks})
                                </th>
                              ))}
                              <th className="py-2.5 px-2 text-center font-bold">Total ({activeTotalMaxMarks})</th>
                              <th className="py-2.5 px-2 text-center font-bold">Grade</th>
                              <th className="py-2.5 px-3">Positive Remarks</th>
                              <th className="py-2.5 px-3">Negative Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-navy/5 bg-white text-navy font-medium">
                            {assignmentEvaluations.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-mist/80 transition-colors">
                                <td className="py-2.5 px-3 text-center font-bold text-slatebrand">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-navy">
                                  {item.chest_no}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-bold">{item.student_name || "—"}</div>
                                  <div className="text-[10px] text-slatebrand">{item.team_name || ""}</div>
                                </td>
                                {activeAssignmentCriteria.map((c, cIdx) => {
                                  const val =
                                    item.marks_breakdown?.[c.id] ??
                                    (item as any)[`mark_criterion_${cIdx + 1}`] ??
                                    0
                                  return (
                                    <td key={c.id || cIdx} className="py-2.5 px-2 text-center font-mono">
                                      {val}
                                    </td>
                                  )
                                })}
                                <td className="py-2.5 px-2 text-center font-mono font-bold text-navy">
                                  {item.total_marks}
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${
                                      item.grade === "A+"
                                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                                        : item.grade === "A"
                                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                        : item.grade === "B"
                                        ? "bg-blue-100 text-blue-900 border border-blue-300"
                                        : item.grade === "C"
                                        ? "bg-purple-100 text-purple-900 border border-purple-300"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {item.grade}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 max-w-[160px] truncate text-[11px] text-emerald-700">
                                  {item.positive_remarks ? (
                                    <span className="flex items-center gap-1" title={item.positive_remarks}>
                                      <ThumbsUp className="size-3 shrink-0" />
                                      {item.positive_remarks}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="py-2.5 px-3 max-w-[160px] truncate text-[11px] text-red-600">
                                  {item.negative_remarks ? (
                                    <span className="flex items-center gap-1" title={item.negative_remarks}>
                                      <ThumbsDown className="size-3 shrink-0" />
                                      {item.negative_remarks}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Add New Judge */}
      <Dialog open={isAddJudgeOpen} onOpenChange={setIsAddJudgeOpen}>
        <DialogContent className="w-[95vw] max-w-md font-['Anek_Malayalam',sans-serif] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy text-lg">
              <Scale className="size-5 text-gold" />
              Add New Judge Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slatebrand">
              Create credentials for an arts fest judge. They can sign in on the fest portal with this email and password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddJudge} className="space-y-3.5 py-2">
            {formError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Full Name *</label>
              <Input
                type="text"
                placeholder="e.g. Prof. Abdul Rasheed"
                value={newJudgeName}
                onChange={(e) => setNewJudgeName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Email Address *</label>
              <Input
                type="email"
                placeholder="e.g. judge1@wafyfest.in"
                value={newJudgeEmail}
                onChange={(e) => setNewJudgeEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Password * (Min 6 chars)</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newJudgePassword}
                onChange={(e) => setNewJudgePassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Phone (Optional)</label>
              <Input
                type="tel"
                placeholder="+91 9876543210"
                value={newJudgePhone}
                onChange={(e) => setNewJudgePhone(e.target.value)}
              />
            </div>

            <DialogFooter className="mt-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddJudgeOpen(false)}
                disabled={creatingJudge}
                className="bg-white text-navy border-navy/20 hover:bg-navy/5 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingJudge}
                className="bg-[#0A1D2C] hover:bg-[#123B4F] text-white font-bold"
              >
                {creatingJudge ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Judge Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Assign Programme to Judge with Dynamic Criteria & Manual Creation */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto font-['Anek_Malayalam',sans-serif] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy text-lg">
              <BookOpen className="size-5 text-gold" />
              Assign Programme to {selectedJudge?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slatebrand">
              Choose an existing programme or create a custom event manually, then configure multi-criteria rules (add 5th, 6th criteria as needed).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignProgramme} className="space-y-4 py-2">
            {assignError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="size-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            {/* Mode Switch: Existing Programme vs Manual Creation */}
            <div className="flex items-center gap-2 p-1 bg-navy/5 rounded-xl border border-navy/10">
              <button
                type="button"
                onClick={() => setAssignMode("existing")}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${
                  assignMode === "existing"
                    ? "bg-navy text-gold shadow-sm"
                    : "text-slatebrand hover:text-navy"
                }`}
              >
                Select Existing Programme
              </button>
              <button
                type="button"
                onClick={() => setAssignMode("manual")}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${
                  assignMode === "manual"
                    ? "bg-navy text-gold shadow-sm"
                    : "text-slatebrand hover:text-navy"
                }`}
              >
                + Add Event Manually
              </button>
            </div>

            {/* Existing Programme Selection */}
            {assignMode === "existing" ? (
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Select Programme / Event *</label>
                <Select value={assignEventId} onValueChange={setAssignEventId}>
                  <SelectTrigger className="bg-white w-full max-w-full">
                    <SelectValue placeholder="Choose a programme..." />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    align="start"
                    className="max-h-64 max-w-[calc(100vw-2.5rem)] w-full overflow-y-auto"
                  >
                    {events.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id} className="max-w-full">
                        <span className="font-mono font-bold text-navy shrink-0">{ev.event_code || "—"}</span>
                        <span className="truncate">{ev.name} ({ev.category})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              /* Manual Event Creation Form */
              <div className="space-y-3 rounded-2xl border border-navy/15 bg-ivory/50 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                    <Sparkles className="size-4 text-gold" />
                    Manually Create Programme
                  </span>
                  <Badge className="bg-gold/20 text-navy font-bold text-[10px]">New Event</Badge>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">Programme / Event Name *</label>
                  <Input
                    value={manualEventName}
                    onChange={(e) => setManualEventName(e.target.value)}
                    placeholder="e.g. Malayalam Elocution, Mappilappattu, etc."
                    className="bg-white text-xs h-9"
                    required={assignMode === "manual"}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-navy">Event Code (Optional)</label>
                    <Input
                      value={manualEventCode}
                      onChange={(e) => setManualEventCode(e.target.value)}
                      placeholder="e.g. EV-105"
                      className="bg-white font-mono uppercase text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-navy">Category</label>
                    <Select value={manualEventCategory} onValueChange={setManualEventCategory}>
                      <SelectTrigger className="bg-white text-xs h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" align="start" className="max-w-[calc(100vw-2.5rem)]">
                        <SelectItem value="ON STAGE">ON STAGE</SelectItem>
                        <SelectItem value="OFF STAGE">OFF STAGE</SelectItem>
                        <SelectItem value="GENERAL">GENERAL</SelectItem>
                        <SelectItem value="SPECIAL">SPECIAL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-navy">Grade Type</label>
                    <Select value={manualEventGrade} onValueChange={setManualEventGrade}>
                      <SelectTrigger className="bg-white text-xs h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" align="start" className="max-w-[calc(100vw-2.5rem)]">
                        <SelectItem value="A">Grade A</SelectItem>
                        <SelectItem value="B">Grade B</SelectItem>
                        <SelectItem value="C">Grade C</SelectItem>
                        <SelectItem value="D">Grade D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Evaluation Criteria Builder */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-1.5">
                    <ClipboardList className="size-4 text-gold" />
                    Configure Criteria Rules ({criteria.length} Criteria)
                  </label>
                  <p className="text-[11px] text-slatebrand">
                    Set specific rules and maximum marks. Add extra criteria (5, 6, etc.) as required.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    className={`font-mono text-xs font-bold ${
                      totalMaxMarks === 100
                        ? "bg-emerald-600 text-white"
                        : "bg-navy text-gold"
                    }`}
                  >
                    Total: {totalMaxMarks} Marks
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCriterion}
                    className="bg-[#0A1D2C] hover:bg-[#123B4F] text-gold text-xs h-7 px-2.5 font-bold shadow-xs"
                  >
                    <Plus className="mr-1 size-3.5" />
                    Add Criterion
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1 border rounded-xl border-navy/10 bg-ivory/30">
                {criteria.map((crit, idx) => (
                  <div
                    key={crit.id || idx}
                    className="rounded-xl border border-navy/15 bg-white p-3 space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-navy">Criterion {idx + 1}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slatebrand font-semibold">Max:</span>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={crit.maxMarks}
                          onChange={(e) =>
                            handleUpdateCriterion(idx, "maxMarks", Math.max(1, parseInt(e.target.value) || 0))
                          }
                          className="w-16 h-6 text-center font-mono font-bold text-xs bg-ivory/50 p-0"
                        />
                        {criteria.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCriterion(idx)}
                            className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 ml-1"
                            title="Remove Criterion"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <Input
                      value={crit.name}
                      onChange={(e) => handleUpdateCriterion(idx, "name", e.target.value)}
                      placeholder={`e.g. Criterion ${idx + 1} Rule`}
                      className="text-xs bg-white h-8"
                      required
                    />
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignModalOpen(false)}
                disabled={assigningProgramme}
                className="bg-white text-navy border-navy/20 hover:bg-navy/5 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assigningProgramme || (assignMode === "existing" && !assignEventId)}
                className="bg-[#0A1D2C] hover:bg-[#123B4F] text-white font-bold"
              >
                {assigningProgramme ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Confirm & Assign Programme"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
