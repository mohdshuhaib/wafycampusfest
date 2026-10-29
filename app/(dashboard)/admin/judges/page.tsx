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
  Users,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Eye,
  Loader2,
  Sparkles,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  Mail,
  Lock,
  UserCheck,
  ClipboardList,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

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
  const [assignEventId, setAssignEventId] = useState("")
  const [rule1, setRule1] = useState("Content & Structure (Max 30)")
  const [rule2, setRule2] = useState("Clarity & Expression (Max 30)")
  const [rule3, setRule3] = useState("Timing & Discipline (Max 20)")
  const [rule4, setRule4] = useState("Overall Impact & Accuracy (Max 20)")
  const [assigningProgramme, setAssigningProgramme] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  const supabase = createClient()

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

  // Handle Assign Programme
  const handleAssignProgramme = async (e: React.FormEvent) => {
    e.preventDefault()
    setAssignError(null)

    if (!selectedJudge) return
    if (!assignEventId) {
      setAssignError("Please select a programme / event.")
      return
    }

    setAssigningProgramme(true)
    try {
      const res = await fetch("/api/admin/judge-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judge_id: selectedJudge.id,
          event_id: assignEventId,
          rule_criterion_1: rule1,
          rule_criterion_2: rule2,
          rule_criterion_3: rule3,
          rule_criterion_4: rule4,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to assign programme.")
      }

      setIsAssignModalOpen(false)
      setAssignEventId("")
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
      if (!res.ok) throw new Error("Failed to remove")
      if (selectedAssignment?.id === assignmentId) {
        setSelectedAssignment(null)
      }
      if (selectedJudge) {
        await handleSelectJudge(selectedJudge)
        await fetchData()
      }
    } catch (err) {
      alert("Error removing assignment: " + err)
    }
  }

  // Handle Delete Judge
  const handleDeleteJudge = async (judgeId: string) => {
    if (!confirm("Are you sure you want to delete this judge account completely?")) return
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

  // Export Judge Scores PDF
  const handleExportPDF = () => {
    if (!selectedAssignment || !selectedJudge) return

    const doc = new jsPDF("p", "mm", "a4")
    const progTitle = `${selectedAssignment.event?.event_code || ""} - ${selectedAssignment.event?.name || "Programme"}`

    // Header Banner
    doc.setFillColor(10, 29, 44) // #0A1D2C
    doc.rect(0, 0, 210, 28, "F")

    doc.setTextColor(212, 175, 55) // #D4AF37 Gold
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("WAFY CAMPUS KALIKKAV ARTS FEST 2026", 105, 12, { align: "center" })

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
    doc.setFillColor(245, 248, 250)
    doc.roundedRect(14, 46, 182, 18, 2, 2, "F")
    doc.setFontSize(8)
    doc.setTextColor(90, 109, 126)
    doc.text(`Crit 1 (Max 30): ${selectedAssignment.rule_criterion_1}`, 18, 52)
    doc.text(`Crit 2 (Max 30): ${selectedAssignment.rule_criterion_2}`, 18, 58)
    doc.text(`Crit 3 (Max 20): ${selectedAssignment.rule_criterion_3}`, 110, 52)
    doc.text(`Crit 4 (Max 20): ${selectedAssignment.rule_criterion_4}`, 110, 58)

    // Table
    const tableData = assignmentEvaluations.map((ev, idx) => [
      idx + 1,
      ev.chest_no,
      ev.student_name || "—",
      ev.team_name || "—",
      ev.mark_criterion_1,
      ev.mark_criterion_2,
      ev.mark_criterion_3,
      ev.mark_criterion_4,
      ev.total_marks,
      ev.grade,
      ev.positive_remarks || "—",
      ev.negative_remarks || "—",
    ])

    autoTable(doc, {
      startY: 68,
      head: [
        [
          "Sl",
          "Chest",
          "Student",
          "Team",
          "C1(30)",
          "C2(30)",
          "C3(20)",
          "C4(20)",
          "Tot(100)",
          "Grd",
          "Positive Remarks",
          "Negative Remarks",
        ],
      ],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [18, 59, 79],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        halign: "center",
      },
      styles: {
        fontSize: 7,
        textColor: [27, 33, 39],
        cellPadding: 2,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "center", fontStyle: "bold", cellWidth: 14 },
        4: { halign: "center", cellWidth: 12 },
        5: { halign: "center", cellWidth: 12 },
        6: { halign: "center", cellWidth: 12 },
        7: { halign: "center", cellWidth: 12 },
        8: { halign: "center", fontStyle: "bold", cellWidth: 14 },
        9: { halign: "center", fontStyle: "bold", cellWidth: 10 },
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
    <div className="space-y-6 font-['Anek_Malayalam',sans-serif] text-navy">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
            <Scale className="size-3.5" />
            Judges Command Center
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-navy sm:text-3xl">
            Judges & Scoring Portals
          </h1>
          <p className="mt-0.5 text-sm text-slatebrand">
            Manage festival judges, assign programmes with 4-criterion rubrics, and view live results.
          </p>
        </div>

        <Button
          onClick={() => {
            setFormError(null)
            setIsAddJudgeOpen(true)
          }}
          className="bg-[#0A1D2C] hover:bg-[#123B4F] text-white shadow-md transition-all hover:scale-[1.02] font-bold"
        >
          <Plus className="mr-2 size-4" />
          Add New Judge
        </Button>
      </div>

      {/* Main Grid: Left = Judges List, Right = Selected Judge View */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Judges List */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border border-navy/10 bg-ivory/80 shadow-sm backdrop-blur">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="size-4 text-gold" />
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

                              {/* Rubrics Preview */}
                              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slatebrand">
                                <div className="rounded bg-navy/5 p-1.5">
                                  <span className="font-bold text-navy">1 (30m):</span>{" "}
                                  <span className="truncate block">{assignment.rule_criterion_1}</span>
                                </div>
                                <div className="rounded bg-navy/5 p-1.5">
                                  <span className="font-bold text-navy">2 (30m):</span>{" "}
                                  <span className="truncate block">{assignment.rule_criterion_2}</span>
                                </div>
                                <div className="rounded bg-navy/5 p-1.5">
                                  <span className="font-bold text-navy">3 (20m):</span>{" "}
                                  <span className="truncate block">{assignment.rule_criterion_3}</span>
                                </div>
                                <div className="rounded bg-navy/5 p-1.5">
                                  <span className="font-bold text-navy">4 (20m):</span>{" "}
                                  <span className="truncate block">{assignment.rule_criterion_4}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              <Badge
                                variant={evals.length > 0 ? "default" : "outline"}
                                className={`text-xs ${
                                  evals.length > 0
                                    ? "bg-emerald-600 text-white"
                                    : "border-slatebrand/30 text-slatebrand"
                                }`}
                              >
                                {evals.length} Evaluated
                              </Badge>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedAssignment(assignment)}
                                className={`text-xs h-8 font-bold ${
                                  isProgSelected
                                    ? "bg-[#0A1D2C] text-white border-[#0A1D2C]"
                                    : "bg-white text-navy border-navy/20 hover:bg-navy/5"
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
                              <th className="py-2.5 px-2 text-center" title={selectedAssignment.rule_criterion_1}>
                                C1 (30)
                              </th>
                              <th className="py-2.5 px-2 text-center" title={selectedAssignment.rule_criterion_2}>
                                C2 (30)
                              </th>
                              <th className="py-2.5 px-2 text-center" title={selectedAssignment.rule_criterion_3}>
                                C3 (20)
                              </th>
                              <th className="py-2.5 px-2 text-center" title={selectedAssignment.rule_criterion_4}>
                                C4 (20)
                              </th>
                              <th className="py-2.5 px-2 text-center font-bold">Total (100)</th>
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
                                <td className="py-2.5 px-2 text-center font-mono">{item.mark_criterion_1}</td>
                                <td className="py-2.5 px-2 text-center font-mono">{item.mark_criterion_2}</td>
                                <td className="py-2.5 px-2 text-center font-mono">{item.mark_criterion_3}</td>
                                <td className="py-2.5 px-2 text-center font-mono">{item.mark_criterion_4}</td>
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
                                    <span className="flex items-center gap-1">
                                      <ThumbsUp className="size-3 shrink-0" />
                                      {item.positive_remarks}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="py-2.5 px-3 max-w-[160px] truncate text-[11px] text-red-600">
                                  {item.negative_remarks ? (
                                    <span className="flex items-center gap-1">
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
        <DialogContent className="max-w-md font-['Anek_Malayalam',sans-serif]">
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

      {/* MODAL: Assign Programme to Judge with 4-criterion rules */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-2xl font-['Anek_Malayalam',sans-serif]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy text-lg">
              <BookOpen className="size-5 text-gold" />
              Assign Programme to {selectedJudge?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slatebrand">
              Select the programme and configure the 4 specific criteria rules for the marks distribution (30, 30, 20, 20).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignProgramme} className="space-y-4 py-2">
            {assignError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="size-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            {/* Programme Selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Select Programme / Event *</label>
              <Select value={assignEventId} onValueChange={setAssignEventId}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Choose a programme..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {events.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      <span className="font-mono font-bold text-navy">{ev.event_code || "—"}</span> —{" "}
                      {ev.name} ({ev.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4 Rubric Columns */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-1.5">
                  <ClipboardList className="size-4 text-gold" />
                  Configure 4-Criteria Rules for Marks (30 + 30 + 20 + 20 = 100)
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Criterion 1 */}
                <div className="rounded-xl border border-navy/15 bg-ivory/60 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-navy">Criterion 1 Rule</span>
                    <Badge className="bg-navy text-gold text-[10px] font-bold">Max 30 Marks</Badge>
                  </div>
                  <Input
                    value={rule1}
                    onChange={(e) => setRule1(e.target.value)}
                    placeholder="e.g. Structure, Plot & Narrative flow"
                    className="text-xs bg-white"
                    required
                  />
                  <span className="text-[10px] text-slatebrand">
                    Judge will check participant's compliance with this rule.
                  </span>
                </div>

                {/* Criterion 2 */}
                <div className="rounded-xl border border-navy/15 bg-ivory/60 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-navy">Criterion 2 Rule</span>
                    <Badge className="bg-navy text-gold text-[10px] font-bold">Max 30 Marks</Badge>
                  </div>
                  <Input
                    value={rule2}
                    onChange={(e) => setRule2(e.target.value)}
                    placeholder="e.g. Language, Expression & Vocabulary"
                    className="text-xs bg-white"
                    required
                  />
                  <span className="text-[10px] text-slatebrand">
                    Judge will check language and expression standard.
                  </span>
                </div>

                {/* Criterion 3 */}
                <div className="rounded-xl border border-navy/15 bg-ivory/60 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-navy">Criterion 3 Rule</span>
                    <Badge className="bg-navy text-gold text-[10px] font-bold">Max 20 Marks</Badge>
                  </div>
                  <Input
                    value={rule3}
                    onChange={(e) => setRule3(e.target.value)}
                    placeholder="e.g. Time adherence & Discipline"
                    className="text-xs bg-white"
                    required
                  />
                  <span className="text-[10px] text-slatebrand">
                    Punctuality, time limits, and rule obedience.
                  </span>
                </div>

                {/* Criterion 4 */}
                <div className="rounded-xl border border-navy/15 bg-ivory/60 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-navy">Criterion 4 Rule</span>
                    <Badge className="bg-navy text-gold text-[10px] font-bold">Max 20 Marks</Badge>
                  </div>
                  <Input
                    value={rule4}
                    onChange={(e) => setRule4(e.target.value)}
                    placeholder="e.g. Stage presence / Neatness & Accuracy"
                    className="text-xs bg-white"
                    required
                  />
                  <span className="text-[10px] text-slatebrand">
                    Presentation standard, formatting, and overall impact.
                  </span>
                </div>
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
                disabled={assigningProgramme || !assignEventId}
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
