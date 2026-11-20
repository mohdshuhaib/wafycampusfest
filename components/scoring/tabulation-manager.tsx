"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  Calculator,
  Trophy,
  Medal,
  Award,
  Sparkles,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Check,
  User,
  Layers,
  ArrowRight,
  TrendingUp,
} from "lucide-react"

// Standard letter range (default A to F as requested)
const DEFAULT_LETTERS = ["A", "B", "C", "D", "E", "F"]
const ALL_POSSIBLE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]

interface EventItem {
  id: string
  name: string
  event_code: string
  category: string
  grade_type: string
}

interface ParticipantInfo {
  id: string
  chestNo: string
  name: string
  teamName: string
  teamColor?: string
}

interface MarkEntry {
  judge1: number | ""
  judge2: number | ""
}

interface TabulationManagerProps {
  onScoreSaved?: () => void
}

export function TabulationManager({ onScoreSaved }: TabulationManagerProps) {
  const supabase = createClient()

  // State
  const [events, setEvents] = useState<EventItem[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string>("manual")
  const [selectedLetters, setSelectedLetters] = useState<string[]>(DEFAULT_LETTERS)

  // Judge Names
  const [judge1Name, setJudge1Name] = useState<string>("Judge 1")
  const [judge2Name, setJudge2Name] = useState<string>("Judge 2")

  // Marks: keyed by code letter, e.g. { A: { judge1: 60, judge2: 80 } }
  const [marks, setMarks] = useState<Record<string, MarkEntry>>(() => {
    const init: Record<string, MarkEntry> = {}
    DEFAULT_LETTERS.forEach((l) => {
      init[l] = { judge1: "", judge2: "" }
    })
    return init
  })

  // Linked participant data if event is selected
  const [codeParticipantMap, setCodeParticipantMap] = useState<Record<string, ParticipantInfo>>({})
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)

  // Fetch all events on mount
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoadingEvents(true)
        const { data, error } = await supabase
          .from("events")
          .select("id, name, event_code, category, grade_type")
          .order("name")

        if (error) throw error
        setEvents((data as EventItem[]) || [])
      } catch (err: any) {
        console.error("Error fetching events:", err)
        toast.error("Could not load events")
      } finally {
        setLoadingEvents(false)
      }
    }
    fetchEvents()
  }, [])

  // When an event is selected, fetch code letter assignments & saved tabulations
  useEffect(() => {
    if (selectedEventId === "manual") {
      setCodeParticipantMap({})
      return
    }

    async function loadEventData() {
      try {
        // 1. Fetch code letter assignment asset from site_assets
        const { data: assetData } = await (supabase.from("site_assets") as any)
          .select("value")
          .eq("key", `code_letter_event_${selectedEventId}`)
          .maybeSingle()

        let lettersToUse = [...DEFAULT_LETTERS]
        const pMap: Record<string, ParticipantInfo> = {}

        if (assetData?.value) {
          try {
            const parsed = JSON.parse(assetData.value)
            if (parsed.configured_letters && Array.isArray(parsed.configured_letters) && parsed.configured_letters.length > 0) {
              lettersToUse = parsed.configured_letters
            }
            if (parsed.assignments && Array.isArray(parsed.assignments)) {
              for (const a of parsed.assignments) {
                if (a.letter) {
                  pMap[a.letter] = {
                    id: a.student_id || a.participant_id || "",
                    chestNo: a.chest_no || "",
                    name: a.student_name || a.team_name || "Assigned",
                    teamName: a.team_name || "",
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Could not parse code letter asset", e)
          }
        }

        setSelectedLetters(lettersToUse)
        setCodeParticipantMap(pMap)

        // Ensure marks state has keys for all letters
        setMarks((prev) => {
          const next = { ...prev }
          lettersToUse.forEach((l) => {
            if (!next[l]) next[l] = { judge1: "", judge2: "" }
          })
          return next
        })

        // 2. Also check if a tabulation record was previously saved for this event
        const { data: tabData } = await (supabase.from("site_assets") as any)
          .select("value")
          .eq("key", `tabulation_event_${selectedEventId}`)
          .maybeSingle()

        if (tabData?.value) {
          try {
            const savedTab = JSON.parse(tabData.value)
            if (savedTab.marks) {
              setMarks((prev) => ({ ...prev, ...savedTab.marks }))
            }
            if (savedTab.judge1Name) setJudge1Name(savedTab.judge1Name)
            if (savedTab.judge2Name) setJudge2Name(savedTab.judge2Name)
            toast.info("Loaded previous tabulation marks for this event")
          } catch {}
        }
      } catch (err) {
        console.error("Error loading event tabulation data:", err)
      }
    }

    loadEventData()
  }, [selectedEventId])

  // Handle Mark Change with validation (0 to 100)
  const handleMarkChange = (letter: string, judge: "judge1" | "judge2", value: string) => {
    if (value === "") {
      setMarks((prev) => ({
        ...prev,
        [letter]: {
          ...prev[letter],
          [judge]: "",
        },
      }))
      return
    }

    const num = parseFloat(value)
    if (isNaN(num)) return

    // Clamp between 0 and 100
    const clamped = Math.max(0, Math.min(100, Math.round(num * 10) / 10))

    setMarks((prev) => ({
      ...prev,
      [letter]: {
        ...prev[letter],
        [judge]: clamped,
      },
    }))
  }

  // Calculate Grade from Percentage based on rules:
  // >= 90% => A+
  // 80% to 89% => A
  // 70% to 79% => B
  // 60% to 69% => C
  // < 60% => No Grade
  const getGrade = (percentage: number | null): string => {
    if (percentage === null || isNaN(percentage)) return "-"
    if (percentage >= 90) return "A+"
    if (percentage >= 80) return "A"
    if (percentage >= 70) return "B"
    if (percentage >= 60) return "C"
    return "No Grade"
  }

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case "A+":
        return (
          <Badge className="bg-emerald-500 text-white font-black px-2.5 py-0.5 shadow-xs flex items-center gap-1 border-0">
            <Sparkles className="size-3" /> A+
          </Badge>
        )
      case "A":
        return (
          <Badge className="bg-blue-600 text-white font-bold px-2.5 py-0.5 shadow-xs border-0">
            A
          </Badge>
        )
      case "B":
        return (
          <Badge className="bg-amber-500 text-white font-bold px-2.5 py-0.5 shadow-xs border-0">
            B
          </Badge>
        )
      case "C":
        return (
          <Badge className="bg-orange-500 text-white font-bold px-2.5 py-0.5 shadow-xs border-0">
            C
          </Badge>
        )
      case "No Grade":
        return (
          <Badge variant="outline" className="text-slate-400 border-slate-300 font-medium">
            No Grade
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-slate-400 border-slate-200">
            -
          </Badge>
        )
    }
  }

  // Calculate tabulation rows
  const computedRows = useMemo(() => {
    return selectedLetters.map((code) => {
      const entry = marks[code] || { judge1: "", judge2: "" }
      const j1 = entry.judge1 === "" ? null : Number(entry.judge1)
      const j2 = entry.judge2 === "" ? null : Number(entry.judge2)
      const hasAnyMark = j1 !== null || j2 !== null

      const total = hasAnyMark ? (j1 ?? 0) + (j2 ?? 0) : null
      // Out of 200, so percentage = (total / 200) * 100 = total / 2
      const percentage = total !== null ? Math.round((total / 200) * 100 * 10) / 10 : null
      const grade = getGrade(percentage)
      const participant = codeParticipantMap[code]

      return {
        code,
        judge1: j1,
        judge2: j2,
        total,
        percentage,
        grade,
        hasAnyMark,
        participant,
      }
    })
  }, [selectedLetters, marks, codeParticipantMap])

  // Compute Positions / Ranks (1st, 2nd, 3rd, 4th, etc.) based on Total Marks descending
  const rankedResults = useMemo(() => {
    const withMarks = computedRows.filter((r) => r.hasAnyMark && r.total !== null)
    const withoutMarks = computedRows.filter((r) => !r.hasAnyMark || r.total === null)

    // Sort descending by total score
    withMarks.sort((a, b) => (b.total ?? 0) - (a.total ?? 0))

    // Assign competition ranking (1224 rule for ties)
    const rankedWithMarks: Array<(typeof withMarks)[0] & { rank: number }> = []
    for (let i = 0; i < withMarks.length; i++) {
      const row = withMarks[i]
      if (i > 0 && row.total === withMarks[i - 1].total) {
        rankedWithMarks.push({ ...row, rank: rankedWithMarks[i - 1].rank })
      } else {
        rankedWithMarks.push({ ...row, rank: i + 1 })
      }
    }

    const rankedWithoutMarks: Array<(typeof withoutMarks)[0] & { rank: number | null }> = withoutMarks.map((row) => ({
      ...row,
      rank: null,
    }))

    return [...rankedWithMarks, ...rankedWithoutMarks]
  }, [computedRows])

  // Quick stats
  const stats = useMemo(() => {
    const scoredCount = computedRows.filter((r) => r.hasAnyMark).length
    const j1Sum = computedRows.reduce((sum, r) => sum + (r.judge1 ?? 0), 0)
    const j2Sum = computedRows.reduce((sum, r) => sum + (r.judge2 ?? 0), 0)
    const grandTotal = j1Sum + j2Sum

    const topScorer = rankedResults.find((r) => r.rank === 1 && r.total !== null)

    return { scoredCount, j1Sum, j2Sum, grandTotal, topScorer }
  }, [computedRows, rankedResults])

  // Reset all marks (opens theme confirmation dialog)
  const handleResetMarks = () => {
    setShowResetDialog(true)
  }

  const executeResetMarks = () => {
    const next: Record<string, MarkEntry> = {}
    selectedLetters.forEach((l) => {
      next[l] = { judge1: "", judge2: "" }
    })
    setMarks(next)
    setShowResetDialog(false)
    toast.success("All marks reset to empty")
  }

  // Preset letter selection
  const handleSetLetterPreset = (presetLetters: string[]) => {
    setSelectedLetters(presetLetters)
    setMarks((prev) => {
      const next = { ...prev }
      presetLetters.forEach((l) => {
        if (!next[l]) next[l] = { judge1: "", judge2: "" }
      })
      return next
    })
  }

  // Toggle an individual letter
  const toggleLetter = (letter: string) => {
    if (selectedLetters.includes(letter)) {
      if (selectedLetters.length <= 2) {
        toast.error("At least 2 code letters are required.")
        return
      }
      setSelectedLetters((prev) => prev.filter((l) => l !== letter))
    } else {
      const nextLetters = [...selectedLetters, letter].sort()
      setSelectedLetters(nextLetters)
      setMarks((prev) => {
        if (!prev[letter]) {
          return { ...prev, [letter]: { judge1: "", judge2: "" } }
        }
        return prev
      })
    }
  }

  // Save Tabulation to Supabase site_assets
  const handleSaveTabulation = async () => {
    if (selectedEventId === "manual") {
      toast.error("Please select a specific event from the dropdown to save tabulation")
      return
    }

    try {
      setSaving(true)
      const currentEvent = events.find((e) => e.id === selectedEventId)
      const payload = {
        event_id: selectedEventId,
        event_name: currentEvent?.name || "",
        judge1Name,
        judge2Name,
        selectedLetters,
        marks,
        rankedResults: rankedResults.map((r) => ({
          code: r.code,
          judge1: r.judge1,
          judge2: r.judge2,
          total: r.total,
          percentage: r.percentage,
          grade: r.grade,
          rank: r.rank,
        })),
        updated_at: new Date().toISOString(),
      }

      const { error } = await (supabase.from("site_assets") as any).upsert(
        {
          key: `tabulation_event_${selectedEventId}`,
          label: `Tabulation Sheet - ${currentEvent?.name || selectedEventId}`,
          type: "file",
          value: JSON.stringify(payload),
          description: `Official dual-judge tabulation marks for event ${selectedEventId}`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      )

      if (error) throw error
      toast.success("Tabulation saved successfully!")
      onScoreSaved?.()
    } catch (err: any) {
      console.error("Error saving tabulation:", err)
      toast.error("Failed to save tabulation: " + (err.message || "Unknown error"))
    } finally {
      setSaving(false)
    }
  }

  function getRankBadge(rank: number | null) {
    if (!rank) return <span className="text-slate-400 font-bold">-</span>
    if (rank === 1) {
      return (
        <Badge className="bg-amber-400/20 text-amber-900 border border-amber-400/40 font-black px-2.5 py-0.5 shadow-xs flex items-center gap-1.5 w-max">
          <Trophy className="size-3.5 text-amber-600 fill-amber-500" /> 1st Place
        </Badge>
      )
    }
    if (rank === 2) {
      return (
        <Badge className="bg-slate-200 text-slate-800 border border-slate-300 font-black px-2.5 py-0.5 shadow-xs flex items-center gap-1.5 w-max">
          <Medal className="size-3.5 text-slate-500" /> 2nd Place
        </Badge>
      )
    }
    if (rank === 3) {
      return (
        <Badge className="bg-amber-700/15 text-amber-900 border border-amber-700/30 font-black px-2.5 py-0.5 shadow-xs flex items-center gap-1.5 w-max">
          <Award className="size-3.5 text-amber-700" /> 3rd Place
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-navy/5 text-navy border-navy/15 font-bold px-2 py-0.5 w-max">
        {rank}th Position
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Center */}
      <div className="surface-card rounded-2xl border border-navy/10 p-4 md:p-6 shadow-xs bg-gradient-to-br from-ivory via-white to-mist/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gold/20 text-navy shadow-xs">
                <Calculator className="size-5 text-navy" />
              </span>
              <h2 className="text-xl font-black text-navy tracking-tight font-display">
                Tabulation & Mark Calculating System
              </h2>
            </div>
            <p className="text-xs text-slatebrand max-w-2xl leading-relaxed">
              Calculate dual-judge marks (out of 100 each, total out of 200) to compute percentage,
              grade, and ranks with zero human error.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetMarks}
              className="gap-1.5 border-navy/15 text-navy hover:bg-navy/5"
            >
              <RotateCcw className="size-3.5 text-slatebrand" />
              Reset Marks
            </Button>

            {selectedEventId !== "manual" && (
              <Button
                size="sm"
                onClick={handleSaveTabulation}
                disabled={saving}
                className="gap-1.5 bg-navy text-ivory hover:bg-navy/90 shadow-premium"
              >
                <Save className="size-3.5 text-gold" />
                {saving ? "Saving..." : "Save Tabulation"}
              </Button>
            )}
          </div>
        </div>

        {/* Event Selection & Configuration Bar */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3 pt-4 border-t border-navy/10 items-center">
          {/* Event Dropdown */}
          <div className="md:col-span-5 space-y-1">
            <label className="text-[11px] font-bold text-navy/70 uppercase tracking-wider">
              Select Program / Event (Optional)
            </label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-full bg-white border-navy/15 rounded-xl font-medium text-navy text-sm h-10">
                <SelectValue placeholder="Choose event..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="manual" className="font-semibold text-navy">
                  ✦ Free Tabulation (No Program Linked)
                </SelectItem>
                {events.map((evt) => (
                  <SelectItem key={evt.id} value={evt.id}>
                    {evt.name} ({evt.event_code}) — {evt.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Code Letters Preset Pills */}
          <div className="md:col-span-7 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-navy/70 uppercase tracking-wider">
                Active Code Letters ({selectedLetters.length} Letters)
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSetLetterPreset(["A", "B", "C", "D"])}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-navy/5 text-navy font-bold hover:bg-navy/10"
                >
                  A-D (4)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetLetterPreset(DEFAULT_LETTERS)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-gold/20 text-navy font-black hover:bg-gold/30"
                >
                  A-F (6) [Default]
                </button>
                <button
                  type="button"
                  onClick={() => handleSetLetterPreset(["A", "B", "C", "D", "E", "F", "G", "H"])}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-navy/5 text-navy font-bold hover:bg-navy/10"
                >
                  A-H (8)
                </button>
              </div>
            </div>

            {/* Letter Toggles */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {ALL_POSSIBLE_LETTERS.map((letter) => {
                const isActive = selectedLetters.includes(letter)
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => toggleLetter(letter)}
                    className={`size-8 rounded-lg text-xs font-black transition-all ${
                      isActive
                        ? "bg-navy text-ivory shadow-xs scale-100"
                        : "bg-white/80 text-navy/40 border border-navy/10 hover:border-navy/30"
                    }`}
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Fest Grading Rules Bar */}
        <div className="mt-4 pt-3 border-t border-navy/10">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-navy/80 flex items-center gap-1">
              <Sparkles className="size-3.5 text-gold" /> Fest Grading System:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800 border border-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500" /> ≥ 90% = A+
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-bold text-blue-800 border border-blue-200">
                <span className="size-1.5 rounded-full bg-blue-500" /> 80% to 89% = A
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-800 border border-amber-200">
                <span className="size-1.5 rounded-full bg-amber-500" /> 70% to 79% = B
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 font-bold text-orange-800 border border-orange-200">
                <span className="size-1.5 rounded-full bg-orange-500" /> 60% to 69% = C
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 font-medium text-slate-500 border border-slate-200">
                &lt; 60% = No Grade
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TWO-SIDED DUAL-JUDGE SCORECARDS (Side 1: Judge 1 | Side 2: Judge 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SIDE 1: JUDGE 1 */}
        <Card className="border-navy/15 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-900 to-navy text-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-gold border border-white/15 font-black text-sm">
                  J1
                </div>
                <div>
                  <CardTitle className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    Judge 1 Scorecard
                  </CardTitle>
                  <CardDescription className="text-white/70 text-xs">
                    Mark out of 100 for each code letter
                  </CardDescription>
                </div>
              </div>

              {/* Editable Judge 1 Name */}
              <div className="w-36">
                <Input
                  value={judge1Name}
                  onChange={(e) => setJudge1Name(e.target.value)}
                  placeholder="Judge 1 Name"
                  className="h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-lg text-right font-semibold"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-2.5">
            <div className="grid grid-cols-12 gap-2 px-2 text-[11px] font-black text-navy/60 uppercase tracking-wider pb-1 border-b border-navy/10">
              <span className="col-span-3">Code Letter</span>
              <span className="col-span-6">Participant / Team</span>
              <span className="col-span-3 text-right">Mark (Max 100)</span>
            </div>

            {selectedLetters.map((letter) => {
              const currentMark = marks[letter]?.judge1 ?? ""
              const pInfo = codeParticipantMap[letter]
              return (
                <div
                  key={`j1-${letter}`}
                  className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-mist/35 hover:bg-mist/70 border border-navy/5 transition-all"
                >
                  {/* Code Badge */}
                  <div className="col-span-3 flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-navy text-gold font-black text-sm shadow-xs">
                      {letter}
                    </span>
                    <span className="font-bold text-navy text-xs hidden sm:inline">Code {letter}</span>
                  </div>

                  {/* Participant Name if available */}
                  <div className="col-span-6 truncate pr-2">
                    {pInfo ? (
                      <div>
                        <p className="text-xs font-bold text-navy truncate">{pInfo.name}</p>
                        <p className="text-[10px] text-slatebrand truncate">
                          {pInfo.chestNo ? `Chest: ${pInfo.chestNo}` : ""}{" "}
                          {pInfo.teamName ? `• ${pInfo.teamName}` : ""}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Code {letter}</span>
                    )}
                  </div>

                  {/* Mark Input */}
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={currentMark}
                      onChange={(e) => handleMarkChange(letter, "judge1", e.target.value)}
                      placeholder="0 - 100"
                      className="h-9 text-center font-black text-sm rounded-lg border-navy/20 focus-visible:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              )
            })}

            {/* Total Footer */}
            <div className="flex items-center justify-between pt-3 px-2 border-t border-navy/10 font-bold text-xs text-navy">
              <span>{judge1Name} Total Sum:</span>
              <span className="text-sm font-black text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {stats.j1Sum} Marks
              </span>
            </div>
          </CardContent>
        </Card>

        {/* SIDE 2: JUDGE 2 */}
        <Card className="border-navy/15 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-navy to-emerald-950 text-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-gold border border-white/15 font-black text-sm">
                  J2
                </div>
                <div>
                  <CardTitle className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    Judge 2 Scorecard
                  </CardTitle>
                  <CardDescription className="text-white/70 text-xs">
                    Mark out of 100 for each code letter
                  </CardDescription>
                </div>
              </div>

              {/* Editable Judge 2 Name */}
              <div className="w-36">
                <Input
                  value={judge2Name}
                  onChange={(e) => setJudge2Name(e.target.value)}
                  placeholder="Judge 2 Name"
                  className="h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-lg text-right font-semibold"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-2.5">
            <div className="grid grid-cols-12 gap-2 px-2 text-[11px] font-black text-navy/60 uppercase tracking-wider pb-1 border-b border-navy/10">
              <span className="col-span-3">Code Letter</span>
              <span className="col-span-6">Participant / Team</span>
              <span className="col-span-3 text-right">Mark (Max 100)</span>
            </div>

            {selectedLetters.map((letter) => {
              const currentMark = marks[letter]?.judge2 ?? ""
              const pInfo = codeParticipantMap[letter]
              return (
                <div
                  key={`j2-${letter}`}
                  className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-mist/35 hover:bg-mist/70 border border-navy/5 transition-all"
                >
                  {/* Code Badge */}
                  <div className="col-span-3 flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-navy text-gold font-black text-sm shadow-xs">
                      {letter}
                    </span>
                    <span className="font-bold text-navy text-xs hidden sm:inline">Code {letter}</span>
                  </div>

                  {/* Participant Name if available */}
                  <div className="col-span-6 truncate pr-2">
                    {pInfo ? (
                      <div>
                        <p className="text-xs font-bold text-navy truncate">{pInfo.name}</p>
                        <p className="text-[10px] text-slatebrand truncate">
                          {pInfo.chestNo ? `Chest: ${pInfo.chestNo}` : ""}{" "}
                          {pInfo.teamName ? `• ${pInfo.teamName}` : ""}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Code {letter}</span>
                    )}
                  </div>

                  {/* Mark Input */}
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={currentMark}
                      onChange={(e) => handleMarkChange(letter, "judge2", e.target.value)}
                      placeholder="0 - 100"
                      className="h-9 text-center font-black text-sm rounded-lg border-navy/20 focus-visible:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
              )
            })}

            {/* Total Footer */}
            <div className="flex items-center justify-between pt-3 px-2 border-t border-navy/10 font-bold text-xs text-navy">
              <span>{judge2Name} Total Sum:</span>
              <span className="text-sm font-black text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {stats.j2Sum} Marks
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ALL RESULT STATUS & TABULATION BOARD (BELOW BOTH SIDES) */}
      <Card className="border-navy/15 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-ivory/80 border-b border-navy/10 p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-black text-navy flex items-center gap-2">
                <Trophy className="size-5 text-gold fill-gold" />
                Tabulation Result Status & Final Standings
              </CardTitle>
              <CardDescription className="text-xs text-slatebrand">
                Live computed totals (out of 200), percentages, performance grades, and verified
                rank positions.
              </CardDescription>
            </div>

            {stats.topScorer && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-400/30 px-3 py-1.5 rounded-xl">
                <Trophy className="size-4 text-amber-600 fill-amber-500" />
                <span className="text-xs font-bold text-navy">Leader:</span>
                <span className="text-xs font-black text-amber-900">
                  Code {stats.topScorer.code} ({stats.topScorer.total} pts • {stats.topScorer.percentage}%)
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy/5 border-b border-navy/10 text-[11px] font-black text-navy/70 uppercase tracking-wider">
                  <th className="py-3 px-4 text-center">Rank</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Participant / Team</th>
                  <th className="py-3 px-4 text-center">{judge1Name} (/100)</th>
                  <th className="py-3 px-4 text-center">{judge2Name} (/100)</th>
                  <th className="py-3 px-4 text-center">Total (/200)</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5 text-sm">
                {rankedResults.map((row) => {
                  const isWinner = row.rank && row.rank <= 3
                  return (
                    <tr
                      key={`result-${row.code}`}
                      className={`transition-colors ${
                        row.rank === 1
                          ? "bg-amber-400/10 font-medium"
                          : row.rank === 2
                          ? "bg-slate-100/60 font-medium"
                          : row.rank === 3
                          ? "bg-amber-700/5 font-medium"
                          : "hover:bg-mist/30"
                      }`}
                    >
                      {/* Position / Rank */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">{getRankBadge(row.rank)}</div>
                      </td>

                      {/* Code Badge */}
                      <td className="py-3 px-4 font-black">
                        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-navy text-gold text-sm shadow-xs font-black">
                          {row.code}
                        </span>
                      </td>

                      {/* Participant Details */}
                      <td className="py-3 px-4">
                        {row.participant ? (
                          <div>
                            <p className="font-bold text-navy text-sm">{row.participant.name}</p>
                            <p className="text-xs text-slatebrand">
                              {row.participant.chestNo ? `Chest ${row.participant.chestNo}` : ""}
                              {row.participant.teamName ? ` • ${row.participant.teamName}` : ""}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Code {row.code}</span>
                        )}
                      </td>

                      {/* Judge 1 Mark */}
                      <td className="py-3 px-4 text-center font-bold text-navy">
                        {row.judge1 !== null ? (
                          <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {row.judge1}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Judge 2 Mark */}
                      <td className="py-3 px-4 text-center font-bold text-navy">
                        {row.judge2 !== null ? (
                          <span className="text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {row.judge2}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Total Mark */}
                      <td className="py-3 px-4 text-center font-black text-navy">
                        {row.total !== null ? (
                          <span className="text-base text-navy font-black bg-navy/5 px-2.5 py-1 rounded-lg border border-navy/10">
                            {row.total}{" "}
                            <span className="text-[10px] text-slatebrand font-normal">/ 200</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Percentage with mini bar */}
                      <td className="py-3 px-4 text-center">
                        {row.percentage !== null ? (
                          <div className="flex flex-col items-center gap-1 min-w-[80px]">
                            <span className="font-black text-navy text-xs">{row.percentage}%</span>
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  row.percentage >= 90
                                    ? "bg-emerald-500"
                                    : row.percentage >= 80
                                    ? "bg-blue-600"
                                    : row.percentage >= 70
                                    ? "bg-amber-500"
                                    : row.percentage >= 60
                                    ? "bg-orange-500"
                                    : "bg-slate-400"
                                }`}
                                style={{ width: `${Math.min(100, row.percentage)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Performance Grade */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">{getGradeBadge(row.grade)}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* THEMED RESET CONFIRMATION MODAL */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="surface-elevated rounded-3xl border border-navy/15 p-6 shadow-premium max-w-md bg-white">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 border border-amber-500/30 shadow-xs">
              <RotateCcw className="size-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-center text-lg font-black text-navy font-display">
              Reset Tabulation Marks?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs text-slatebrand leading-relaxed">
              Are you sure you want to reset all entered marks? This will clear all score entries for{" "}
              <strong className="text-navy">{judge1Name}</strong> and{" "}
              <strong className="text-navy">{judge2Name}</strong> across all active code letters.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-center">
            <AlertDialogCancel className="rounded-xl border-navy/15 font-bold text-navy hover:bg-navy/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeResetMarks}
              className="rounded-xl bg-red-600 font-bold text-white hover:bg-red-700 shadow-xs border-0"
            >
              Yes, Reset Marks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
