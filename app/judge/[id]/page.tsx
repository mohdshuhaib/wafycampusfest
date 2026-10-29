"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Scale,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Award,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react"

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
    grade_type?: string
  }
}

interface Evaluation {
  id: string
  assignment_id: string | null
  judge_id: string
  event_id: string
  chest_no: string
  student_id: string | null
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

// Automatic Grade Calculation according to the fest rules
function calculateGrade(total: number): string {
  if (total >= 90) return "A+"
  if (total >= 80) return "A"
  if (total >= 70) return "B"
  if (total >= 60) return "C"
  return "None"
}

export default function JudgeScoringPage() {
  const params = useParams()
  const router = useRouter()
  const assignmentId = params?.id as string

  const [assignment, setAssignment] = useState<AssignedProgramme | null>(null)
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [savingEvaluation, setSavingEvaluation] = useState(false)
  const [savingRemarks, setSavingRemarks] = useState(false)
  const [overallRemarks, setOverallRemarks] = useState("")
  const [remarksSuccess, setRemarksSuccess] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Current Evaluation Form State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [chestNo, setChestNo] = useState("")
  const [mark1, setMark1] = useState<string>("")
  const [mark2, setMark2] = useState<string>("")
  const [mark3, setMark3] = useState<string>("")
  const [mark4, setMark4] = useState<string>("")
  const [positiveRemarks, setPositiveRemarks] = useState("")
  const [negativeRemarks, setNegativeRemarks] = useState("")

  const chestInputRef = useRef<HTMLInputElement>(null)

  // Fetch assignment & evaluations
  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch assignment details
      const res = await fetch(`/api/judge/assignments?id=${assignmentId}`)
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to load programme")
      }

      setAssignment(data.assignment)
      setOverallRemarks(data.assignment?.overall_remarks || "")

      // 2. Fetch existing evaluations
      const evalRes = await fetch(`/api/judge/evaluations?assignment_id=${assignmentId}`)
      const evalData = await evalRes.json()
      if (evalData.evaluations) {
        setEvaluations(evalData.evaluations)
      }
    } catch (err: any) {
      console.error("Error loading programme evaluation:", err)
      setFormError(err.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (assignmentId) {
      loadData()
    }
  }, [assignmentId])

  // Handle chest number change
  const handleChestNoChange = (val: string) => {
    setChestNo(val.trim().toUpperCase())
  }

  // Calculate live total and grade
  const num1 = Math.min(30, Math.max(0, parseFloat(mark1) || 0))
  const num2 = Math.min(30, Math.max(0, parseFloat(mark2) || 0))
  const num3 = Math.min(20, Math.max(0, parseFloat(mark3) || 0))
  const num4 = Math.min(20, Math.max(0, parseFloat(mark4) || 0))

  const totalMarks = Number((num1 + num2 + num3 + num4).toFixed(2))
  const liveGrade = calculateGrade(totalMarks)

  // Reset current form
  const handleResetForm = () => {
    setEditingId(null)
    setChestNo("")
    setMark1("")
    setMark2("")
    setMark3("")
    setMark4("")
    setPositiveRemarks("")
    setNegativeRemarks("")
    setFormError(null)
  }

  // Submit evaluation (with option to add next mark)
  const handleSubmitEvaluation = async (addNext: boolean = false) => {
    setFormError(null)

    if (!chestNo.trim()) {
      setFormError("Please enter the participant Chest Number.")
      chestInputRef.current?.focus()
      return
    }

    if (mark1 === "" || mark2 === "" || mark3 === "" || mark4 === "") {
      setFormError("Please fill in marks for all 4 criteria.")
      return
    }

    if (num1 > 30 || num2 > 30 || num3 > 20 || num4 > 20) {
      setFormError("Marks exceed the maximum limit for one or more criteria.")
      return
    }

    if (!assignment) return

    setSavingEvaluation(true)
    try {
      const res = await fetch("/api/judge/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          assignment_id: assignment.id,
          judge_id: assignment.judge_id,
          event_id: assignment.event_id,
          chest_no: chestNo.trim().toUpperCase(),
          mark_criterion_1: num1,
          mark_criterion_2: num2,
          mark_criterion_3: num3,
          mark_criterion_4: num4,
          positive_remarks: positiveRemarks,
          negative_remarks: negativeRemarks,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save score.")
      }

      // Refresh evaluations list
      const evalRes = await fetch(`/api/judge/evaluations?assignment_id=${assignment.id}`)
      const evalData = await evalRes.json()
      if (evalData.evaluations) {
        setEvaluations(evalData.evaluations)
      }

      // If add next or saved, reset form
      handleResetForm()
      if (addNext) {
        setTimeout(() => {
          chestInputRef.current?.focus()
        }, 100)
      }
    } catch (err: any) {
      console.error("Failed to save evaluation:", err)
      setFormError(err.message || "An error occurred while saving the score.")
    } finally {
      setSavingEvaluation(false)
    }
  }

  // Load an existing evaluation into form for editing
  const handleEditEvaluation = (item: Evaluation) => {
    setEditingId(item.id)
    setChestNo(item.chest_no)
    setMark1(item.mark_criterion_1.toString())
    setMark2(item.mark_criterion_2.toString())
    setMark3(item.mark_criterion_3.toString())
    setMark4(item.mark_criterion_4.toString())
    setPositiveRemarks(item.positive_remarks || "")
    setNegativeRemarks(item.negative_remarks || "")
    setFormError(null)

    window.scrollTo({ top: 300, behavior: "smooth" })
    chestInputRef.current?.focus()
  }

  // Delete an evaluation
  const handleDeleteEvaluation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this participant score?")) return
    try {
      const res = await fetch(`/api/judge/evaluations?id=${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")

      setEvaluations((prev) => prev.filter((e) => e.id !== id))
      if (editingId === id) {
        handleResetForm()
      }
    } catch (err) {
      alert("Error deleting score: " + err)
    }
  }

  // Save overall remarks for the total programme
  const handleSaveOverallRemarks = async () => {
    if (!assignment) return
    setSavingRemarks(true)
    setRemarksSuccess(false)
    try {
      const res = await fetch("/api/judge/assignment-remarks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignment.id,
          overall_remarks: overallRemarks,
        }),
      })

      if (!res.ok) throw new Error("Failed to save remarks")
      setRemarksSuccess(true)
      setTimeout(() => setRemarksSuccess(false), 3500)
    } catch (err: any) {
      alert("Failed to save overall programme remarks: " + err.message)
    } finally {
      setSavingRemarks(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slatebrand">
        <Loader2 className="size-8 animate-spin text-gold" />
        <p className="mt-3 text-sm font-bold text-navy">Loading programme score sheet...</p>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto size-10 text-red-500" />
        <h2 className="mt-2 text-lg font-bold text-navy">Programme Not Found</h2>
        <p className="text-xs text-slatebrand">This assignment may have been removed.</p>
        <Link href="/judge" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Programmes
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-['Anek_Malayalam',sans-serif]">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/judge"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slatebrand transition hover:text-navy mb-2"
          >
            <ArrowLeft className="size-3.5" />
            Back to Assigned Programmes
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-navy px-2.5 py-1 font-mono text-sm font-bold text-gold">
              {assignment.event?.event_code || "EVENT"}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-navy">
              {assignment.event?.name}
            </h1>
            <Badge variant="secondary" className="text-xs">
              {assignment.event?.category}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 font-bold">
            {evaluations.length} Evaluated
          </Badge>
        </div>
      </div>

      {/* CARD 1: Overall Programme Remarks (General review of the total programme) */}
      <Card className="border border-navy/15 bg-ivory/70 shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-navy text-gold">
                <MessageSquare className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-navy">
                  Overall Programme Remarks (Total Review)
                </CardTitle>
                <CardDescription className="text-[11px] text-slatebrand">
                  Provide your general feedback on how this overall event was conducted, participant standard, coordination, etc.
                </CardDescription>
              </div>
            </div>

            {remarksSuccess && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                Remarks Saved
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-2 space-y-3">
          <Textarea
            value={overallRemarks}
            onChange={(e) => setOverallRemarks(e.target.value)}
            placeholder="Write your general observations, remarks on overall standard, time management, recommendations for participants..."
            rows={3}
            className="text-xs sm:text-sm bg-white border-navy/15 text-navy leading-relaxed"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveOverallRemarks}
              disabled={savingRemarks}
              className="bg-[#0A1D2C] hover:bg-[#123B4F] text-white text-xs h-8 shadow-sm font-bold"
            >
              {savingRemarks ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 size-3.5" />
                  Save Programme Remarks
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Enter Participant Score Form */}
      <Card className="border-2 border-gold/30 bg-white shadow-md">
        <CardHeader className="p-4 sm:p-6 pb-3 border-b border-navy/10 bg-gradient-to-r from-ivory/80 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-gold uppercase tracking-wider">
                <Sparkles className="size-3.5" />
                {editingId ? "Edit Participant Evaluation" : "New Participant Evaluation"}
              </div>
              <CardTitle className="text-base sm:text-lg font-black text-navy mt-0.5">
                {editingId ? `Editing Chest #${chestNo}` : "Enter Participant Marks & Rules Evaluation"}
              </CardTitle>
            </div>

            {editingId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetForm}
                className="text-xs h-8 bg-white text-navy border-navy/20 hover:bg-navy/5 font-semibold self-start sm:self-auto"
              >
                <RotateCcw className="mr-1 size-3" />
                Cancel Edit
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Participant Chest Number Input (Blind Judging) */}
          <div className="max-w-md space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-navy flex items-center gap-1.5">
                <span>Participant Chest Number *</span>
              </label>
              <span className="text-[10px] text-slatebrand bg-navy/5 px-2.5 py-0.5 rounded-full font-bold">
                Blind Judging • Names & Teams Hidden
              </span>
            </div>

            <Input
              ref={chestInputRef}
              type="text"
              placeholder="Type Chest Number (e.g. 102)"
              value={chestNo}
              onChange={(e) => handleChestNoChange(e.target.value)}
              className="font-mono font-bold text-navy uppercase text-base bg-white border-navy/25 h-11 px-3 shadow-inner"
              autoFocus
            />
            <p className="text-[11px] text-slatebrand">
              Enter the chest number of the participant to submit their scores.
            </p>
          </div>

          {/* 4 Divided Marks (30, 30, 20, 20) with Rules explicitly displayed */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                <Award className="size-4 text-gold" />
                Score Division & Rules Compliance (100 Marks Total)
              </label>
              <span className="text-[11px] text-slatebrand hidden sm:inline">
                Evaluate whether participant obeys each specific rule
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Criterion 1: Max 30 */}
              <div className="rounded-2xl border border-navy/15 bg-ivory/50 p-3.5 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-navy">Criterion 1</span>
                    <Badge className="bg-navy text-gold text-[10px] font-bold">Max 30</Badge>
                  </div>
                  <div className="rounded-lg bg-navy/5 p-2 text-[11px] text-slatebrand leading-tight">
                    <span className="font-bold text-navy">Rule: </span>
                    {assignment.rule_criterion_1}
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slatebrand font-medium">Mark Awarded:</span>
                    <span className="font-bold text-navy">{num1} / 30</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
                    placeholder="0 - 30"
                    value={mark1}
                    onChange={(e) => setMark1(e.target.value)}
                    className="font-mono text-center font-bold text-base bg-white border-navy/20"
                  />
                </div>
              </div>

              {/* Criterion 2: Max 30 */}
              <div className="rounded-2xl border border-navy/15 bg-ivory/50 p-3.5 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-navy">Criterion 2</span>
                    <Badge className="bg-navy text-gold text-[10px] font-bold">Max 30</Badge>
                  </div>
                  <div className="rounded-lg bg-navy/5 p-2 text-[11px] text-slatebrand leading-tight">
                    <span className="font-bold text-navy">Rule: </span>
                    {assignment.rule_criterion_2}
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slatebrand font-medium">Mark Awarded:</span>
                    <span className="font-bold text-navy">{num2} / 30</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
                    placeholder="0 - 30"
                    value={mark2}
                    onChange={(e) => setMark2(e.target.value)}
                    className="font-mono text-center font-bold text-base bg-white border-navy/20"
                  />
                </div>
              </div>

              {/* Criterion 3: Max 20 */}
              <div className="rounded-2xl border border-navy/15 bg-ivory/50 p-3.5 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-navy">Criterion 3</span>
                    <Badge className="bg-navy text-gold text-[10px] font-bold">Max 20</Badge>
                  </div>
                  <div className="rounded-lg bg-navy/5 p-2 text-[11px] text-slatebrand leading-tight">
                    <span className="font-bold text-navy">Rule: </span>
                    {assignment.rule_criterion_3}
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slatebrand font-medium">Mark Awarded:</span>
                    <span className="font-bold text-navy">{num3} / 20</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    placeholder="0 - 20"
                    value={mark3}
                    onChange={(e) => setMark3(e.target.value)}
                    className="font-mono text-center font-bold text-base bg-white border-navy/20"
                  />
                </div>
              </div>

              {/* Criterion 4: Max 20 */}
              <div className="rounded-2xl border border-navy/15 bg-ivory/50 p-3.5 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-navy">Criterion 4</span>
                    <Badge className="bg-navy text-gold text-[10px] font-bold">Max 20</Badge>
                  </div>
                  <div className="rounded-lg bg-navy/5 p-2 text-[11px] text-slatebrand leading-tight">
                    <span className="font-bold text-navy">Rule: </span>
                    {assignment.rule_criterion_4}
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slatebrand font-medium">Mark Awarded:</span>
                    <span className="font-bold text-navy">{num4} / 20</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    placeholder="0 - 20"
                    value={mark4}
                    onChange={(e) => setMark4(e.target.value)}
                    className="font-mono text-center font-bold text-base bg-white border-navy/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Automatic Total & Grade Live Summary Box */}
          <div className="rounded-2xl border-2 border-navy/10 bg-gradient-to-r from-navy/5 via-gold/10 to-navy/5 p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="flex size-12 items-center justify-center rounded-xl bg-navy text-gold shadow-sm font-black text-lg">
                  Σ
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slatebrand">
                    Automatic Evaluation Calculation
                  </div>
                  <div className="text-sm font-semibold text-navy">
                    Criterion 1 ({num1}) + Criterion 2 ({num2}) + Criterion 3 ({num3}) + Criterion 4 ({num4})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Total Marks */}
                <div className="text-center rounded-xl bg-white border border-navy/15 px-4 py-2 shadow-sm min-w-[90px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slatebrand">
                    Total
                  </div>
                  <div className="text-xl font-black font-mono text-navy">
                    {totalMarks} <span className="text-xs text-slatebrand">/ 100</span>
                  </div>
                </div>

                {/* Grade */}
                <div className="text-center rounded-xl bg-white border border-navy/15 px-4 py-2 shadow-sm min-w-[90px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slatebrand">
                    Grade
                  </div>
                  <div className="text-xl font-black">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded ${
                        liveGrade === "A+"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : liveGrade === "A"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : liveGrade === "B"
                          ? "bg-blue-100 text-blue-900 border border-blue-300"
                          : liveGrade === "C"
                          ? "bg-purple-100 text-purple-900 border border-purple-300"
                          : "text-gray-400"
                      }`}
                    >
                      {liveGrade}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grade Scale Reference */}
            <div className="mt-3 pt-2.5 border-t border-navy/10 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] text-slatebrand">
              <span className="font-bold text-navy">Grading Scale:</span>
              <span className="inline-flex items-center gap-1">
                <strong className="text-amber-800">A+</strong>: &gt;= 90 Marks
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <strong className="text-emerald-800">A</strong>: 80 - 89 Marks
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <strong className="text-blue-800">B</strong>: 70 - 79 Marks
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <strong className="text-purple-800">C</strong>: 60 - 69 Marks
              </span>
            </div>
          </div>

          {/* Remarks Divided into Positive and Negative */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Positive Remarks */}
            <div className="space-y-1.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5">
              <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <ThumbsUp className="size-4 text-emerald-600" />
                Positive Remarks (Strengths, Highlights)
              </label>
              <Textarea
                rows={2}
                placeholder="Good pronunciation, excellent flow, creative ideas, strong stage presence..."
                value={positiveRemarks}
                onChange={(e) => setPositiveRemarks(e.target.value)}
                className="text-xs bg-white border-emerald-200 text-navy"
              />
            </div>

            {/* Negative Remarks */}
            <div className="space-y-1.5 rounded-2xl border border-rose-200 bg-rose-50/40 p-3.5">
              <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <ThumbsDown className="size-4 text-rose-600" />
                Negative Remarks (Areas of Improvement, Rule Deductions)
              </label>
              <Textarea
                rows={2}
                placeholder="Exceeded time limit, minor grammar error, lacked confidence in climax..."
                value={negativeRemarks}
                onChange={(e) => setNegativeRemarks(e.target.value)}
                className="text-xs bg-white border-rose-200 text-navy"
              />
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetForm}
              className="w-full sm:w-auto text-xs bg-white text-navy border-navy/20 hover:bg-navy/5 font-semibold"
            >
              Reset Form
            </Button>

            <Button
              type="button"
              onClick={() => handleSubmitEvaluation(false)}
              disabled={savingEvaluation}
              variant="outline"
              className="w-full sm:w-auto text-xs font-bold bg-navy/10 text-navy border-navy/20 hover:bg-navy/15"
            >
              {savingEvaluation ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 size-3.5" />
              )}
              {editingId ? "Update Score" : "Save Score"}
            </Button>

            <Button
              type="button"
              onClick={() => handleSubmitEvaluation(true)}
              disabled={savingEvaluation}
              className="w-full sm:w-auto bg-[#0A1D2C] hover:bg-[#123B4F] text-white text-xs font-bold shadow-md hover:scale-[1.02] transition-all"
            >
              {savingEvaluation ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 size-3.5" />
                  Submit Score & Add Next Participant
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: Evaluated Results Table (Mobile & Desktop Responsive) */}
      <Card className="border border-navy/15 bg-white shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-navy/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-navy flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Submitted Evaluations ({evaluations.length})
              </CardTitle>
              <CardDescription className="text-xs text-slatebrand">
                Table of all participants evaluated for this programme with full criteria scores, grades, and remarks.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-3">
          {evaluations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slatebrand">
              No participants evaluated yet. Fill out the form above and click{" "}
              <strong>Submit Score & Add Next Participant</strong> to record marks.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto rounded-xl border border-navy/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy text-white text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3 text-center">Sl</th>
                      <th className="py-3 px-3">Chest No</th>
                      <th className="py-3 px-2 text-center" title={assignment.rule_criterion_1}>
                        C1 (30)
                      </th>
                      <th className="py-3 px-2 text-center" title={assignment.rule_criterion_2}>
                        C2 (30)
                      </th>
                      <th className="py-3 px-2 text-center" title={assignment.rule_criterion_3}>
                        C3 (20)
                      </th>
                      <th className="py-3 px-2 text-center" title={assignment.rule_criterion_4}>
                        C4 (20)
                      </th>
                      <th className="py-3 px-2 text-center font-bold">Total (100)</th>
                      <th className="py-3 px-2 text-center font-bold">Grade</th>
                      <th className="py-3 px-3">Positive Remarks</th>
                      <th className="py-3 px-3">Negative Remarks</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy/5 bg-white text-navy font-medium">
                    {evaluations.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-mist/80 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slatebrand">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-navy">
                          #{item.chest_no}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">{item.mark_criterion_1}</td>
                        <td className="py-2.5 px-2 text-center font-mono">{item.mark_criterion_2}</td>
                        <td className="py-2.5 px-2 text-center font-mono">{item.mark_criterion_3}</td>
                        <td className="py-2.5 px-2 text-center font-mono">{item.mark_criterion_4}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-navy text-sm">
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
                        <td className="py-2.5 px-3 max-w-[150px] truncate text-[11px] text-emerald-700">
                          {item.positive_remarks ? (
                            <span className="flex items-center gap-1" title={item.positive_remarks}>
                              <ThumbsUp className="size-3 shrink-0" />
                              {item.positive_remarks}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-[150px] truncate text-[11px] text-rose-600">
                          {item.negative_remarks ? (
                            <span className="flex items-center gap-1" title={item.negative_remarks}>
                              <ThumbsDown className="size-3 shrink-0" />
                              {item.negative_remarks}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditEvaluation(item)}
                              className="h-7 w-7 p-0 text-navy hover:bg-navy/5"
                              title="Edit Score"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteEvaluation(item.id)}
                              className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                              title="Delete Score"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (< lg screens) */}
              <div className="grid grid-cols-1 gap-3 lg:hidden">
                {evaluations.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-navy/10 bg-ivory/40 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-navy px-2.5 py-1 font-mono text-sm font-bold text-gold">
                            Chest #{item.chest_no}
                          </span>
                          <span className="text-xs text-slatebrand font-medium">
                            Evaluation #{idx + 1}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-black ${
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
                          Grade {item.grade}
                        </span>
                        <div className="font-mono font-black text-sm text-navy">
                          {item.total_marks}/100
                        </div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="rounded bg-white p-1.5 border border-navy/5">
                        <div className="text-[10px] text-slatebrand">C1 (30)</div>
                        <div className="font-bold font-mono">{item.mark_criterion_1}</div>
                      </div>
                      <div className="rounded bg-white p-1.5 border border-navy/5">
                        <div className="text-[10px] text-slatebrand">C2 (30)</div>
                        <div className="font-bold font-mono">{item.mark_criterion_2}</div>
                      </div>
                      <div className="rounded bg-white p-1.5 border border-navy/5">
                        <div className="text-[10px] text-slatebrand">C3 (20)</div>
                        <div className="font-bold font-mono">{item.mark_criterion_3}</div>
                      </div>
                      <div className="rounded bg-white p-1.5 border border-navy/5">
                        <div className="text-[10px] text-slatebrand">C4 (20)</div>
                        <div className="font-bold font-mono">{item.mark_criterion_4}</div>
                      </div>
                    </div>

                    {/* Remarks if any */}
                    {(item.positive_remarks || item.negative_remarks) && (
                      <div className="space-y-1 text-xs">
                        {item.positive_remarks && (
                          <div className="text-emerald-700 flex items-start gap-1">
                            <ThumbsUp className="size-3.5 shrink-0 mt-0.5" />
                            <span>{item.positive_remarks}</span>
                          </div>
                        )}
                        {item.negative_remarks && (
                          <div className="text-rose-600 flex items-start gap-1">
                            <ThumbsDown className="size-3.5 shrink-0 mt-0.5" />
                            <span>{item.negative_remarks}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-1 border-t border-navy/5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditEvaluation(item)}
                        className="text-xs h-7"
                      >
                        <Edit2 className="mr-1 size-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteEvaluation(item.id)}
                        className="text-xs h-7 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="mr-1 size-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
