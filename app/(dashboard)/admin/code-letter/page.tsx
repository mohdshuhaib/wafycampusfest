"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import {
  Disc3,
  Search,
  CheckCircle2,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Users,
  Loader2,
  AlertCircle,
  HelpCircle,
  Check,
  ChevronRight,
  Printer,
  Share2,
} from "lucide-react"
import { toast } from "sonner"

interface ProgrammeEvent {
  id: string
  name: string
  event_code: string | null
  category: "OFF STAGE" | "ON STAGE" | "GENERAL" | "SPECIAL"
  grade_type: "A" | "B" | "C" | "D"
}

interface Team {
  id: string
  name: string
  color_hex: string
}

interface ParticipantItem {
  id: string
  name: string
  chest_no?: string | null
  team_name?: string
  team_color?: string
  is_team: boolean
  assigned_letter?: string | null
}

interface CodeLetterRecord {
  event_id: string
  event_name: string
  grade_type: string
  category: string
  configured_letters: string[]
  remaining_letters: string[]
  assignments: {
    participant_id: string
    participant_name: string
    chest_no?: string | null
    team_name?: string
    code_letter: string
    assigned_at: string
  }[]
  is_spinned: boolean
  completed: boolean
  updated_at?: string
}

const ALL_POSSIBLE_LETTERS = ["A", "B", "C", "D", "E", "F"]

const SLICE_COLORS = [
  { fill: "#0A1D2C", stroke: "#D4AF37", text: "#F3C649", glow: "rgba(212,175,55,0.4)" }, // Navy Gold
  { fill: "#D4AF37", stroke: "#0A1D2C", text: "#0A1D2C", glow: "rgba(10,29,44,0.4)" }, // Gold Navy
  { fill: "#0D5C3A", stroke: "#D4AF37", text: "#E2F7EB", glow: "rgba(13,92,58,0.4)" }, // Emerald
  { fill: "#8B1E3F", stroke: "#D4AF37", text: "#FCE7EE", glow: "rgba(139,30,63,0.4)" }, // Ruby
  { fill: "#1E2B58", stroke: "#D4AF37", text: "#DCE3FF", glow: "rgba(30,43,88,0.4)" }, // Royal Sapphire
  { fill: "#B86800", stroke: "#D4AF37", text: "#FFF0D6", glow: "rgba(184,104,0,0.4)" }, // Amber
]

export default function CodeLetterAdminPage() {
  const [events, setEvents] = useState<ProgrammeEvent[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [spinnedMap, setSpinnedMap] = useState<Record<string, CodeLetterRecord>>({})
  const [loading, setLoading] = useState(true)

  // Filtering & Selection State
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMode, setFilterMode] = useState<"all" | "spinned" | "pending">("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // Participants & Assignment State for Active Event
  const [participants, setParticipants] = useState<ParticipantItem[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [configuredLetters, setConfiguredLetters] = useState<string[]>(["A", "B", "C"])
  const [remainingLetters, setRemainingLetters] = useState<string[]>(["A", "B", "C"])
  const [assignments, setAssignments] = useState<Record<string, string>>({}) // participantId -> codeLetter

  // Spinner State
  const [isSpinning, setIsSpinning] = useState(false)
  const [wheelRotation, setWheelRotation] = useState<number>(0)
  const [spinWinnerModal, setSpinWinnerModal] = useState<{
    letter: string
    participantName: string
    autoAssigned?: boolean
  } | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Reset confirmation
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const supabase = createClient()
  const audioContextRef = useRef<AudioContext | null>(null)

  // Web Audio Context getter & pre-warmer
  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx()
      }
    }
    return audioContextRef.current
  }, [])

  const ensureAudioRunning = useCallback(async () => {
    if (!soundEnabled || typeof window === "undefined") return null
    const ctx = getAudioContext()
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume()
      } catch {}
    }
    return ctx
  }, [soundEnabled, getAudioContext])

  // Proactively unlock AudioContext on initial user gesture (click/key) so the first spin has instant sound
  useEffect(() => {
    const unlockAudio = () => {
      ensureAudioRunning()
    }
    window.addEventListener("pointerdown", unlockAudio, { once: true })
    window.addEventListener("keydown", unlockAudio, { once: true })
    return () => {
      window.removeEventListener("pointerdown", unlockAudio)
      window.removeEventListener("keydown", unlockAudio)
    }
  }, [ensureAudioRunning])

  // Precision Web Audio scheduling for spin ticks (spans the entire 4 seconds)
  const scheduleSpinSounds = (ctx: AudioContext) => {
    if (!soundEnabled) return
    const now = ctx.currentTime

    // Calculate non-linear deceleration tick times spanning 0s to 3.85s
    const tickTimes: number[] = []
    let t = 0
    let interval = 0.05 // start fast at 50ms
    while (t < 3.85) {
      tickTimes.push(t)
      const progress = t / 4.0
      // Smooth deceleration curve
      interval = 0.05 + Math.pow(progress, 2.1) * 0.45
      t += interval
    }

    // Schedule all ticks directly on the audio timeline
    tickTimes.forEach((timeOffset) => {
      const tickTime = now + timeOffset
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      const freq = 900 - (timeOffset / 4.0) * 350
      osc.frequency.setValueAtTime(freq, tickTime)
      osc.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.4), tickTime + 0.035)

      gain.gain.setValueAtTime(0.18, tickTime)
      gain.gain.exponentialRampToValueAtTime(0.001, tickTime + 0.035)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(tickTime)
      osc.stop(tickTime + 0.035)
    })
  }

  // Celebratory Victory Chime
  const playVictoryChime = (ctx: AudioContext, delay: number = 0) => {
    if (!soundEnabled) return
    const now = ctx.currentTime + delay
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6 chord
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "triangle"
      const noteTime = now + idx * 0.08
      osc.frequency.setValueAtTime(freq, noteTime)
      gain.gain.setValueAtTime(0.22, noteTime)
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.55)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(noteTime)
      osc.stop(noteTime + 0.55)
    })
  }

  // Helper: Is this a Group event (Grade C or Grade D)?
  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || null
  }, [events, selectedEventId])

  const isGroupEvent = (event: ProgrammeEvent | null) => {
    if (!event) return false
    return (
      event.grade_type === "C" ||
      event.grade_type === "D" ||
      event.category === "GENERAL" ||
      event.category === "SPECIAL"
    )
  }

  // 1. Initial Load: Events, Teams, Spinned Assignments Map
  const loadInitialData = async () => {
    setLoading(true)
    try {
      // Fetch all spinned assignments from Supabase API
      const res = await fetch("/api/admin/code-letter")
      const spinnedData = await res.json()
      const spinnedRecords = spinnedData.records || {}
      setSpinnedMap(spinnedRecords)

      // Fetch all events
      const { data: eventsData, error: evErr } = await (supabase
        .from("events") as any)
        .select("id, name, event_code, category, grade_type")
        .order("name", { ascending: true })

      if (evErr) throw evErr
      const loadedEvents: ProgrammeEvent[] = eventsData || []
      setEvents(loadedEvents)

      // Fetch all teams
      const { data: teamsData, error: tErr } = await (supabase
        .from("teams") as any)
        .select("id, name, color_hex")
        .order("name", { ascending: true })

      if (tErr) throw tErr
      setTeams(teamsData || [])

      // Auto-select first event if none selected
      if (!selectedEventId && loadedEvents.length > 0) {
        setSelectedEventId(loadedEvents[0].id)
      }
    } catch (err) {
      console.error("Error loading events & teams:", err)
      toast.error("Failed to load festival programmes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // 2. Load participants & saved code letter record from Supabase whenever selected event changes
  useEffect(() => {
    if (!selectedEventId || !selectedEvent) return

    const loadParticipantsForEvent = async () => {
      setLoadingParticipants(true)
      try {
        // Fetch saved record directly from Supabase API for this event
        let savedRecord: CodeLetterRecord | null = null
        try {
          const res = await fetch(`/api/admin/code-letter?event_id=${selectedEventId}`)
          if (res.ok) {
            const data = await res.json()
            if (data.record) {
              savedRecord = data.record
              setSpinnedMap((prev) => ({
                ...prev,
                [selectedEventId]: data.record,
              }))
            }
          }
        } catch (err) {
          console.warn("Could not fetch event record:", err)
        }

        if (isGroupEvent(selectedEvent)) {
          // Grade C and D: Group items for the 3 teams
          const groupParticipants: ParticipantItem[] = teams.map((team) => {
            const savedAssigned = savedRecord?.assignments?.find(
              (a) => a.participant_id === team.id
            )
            return {
              id: team.id,
              name: team.name,
              chest_no: null,
              team_name: team.name,
              team_color: team.color_hex,
              is_team: true,
              assigned_letter: savedAssigned?.code_letter || null,
            }
          })

          setParticipants(groupParticipants)
          initializeLettersAndState(groupParticipants, savedRecord)
        } else {
          // Grade A and B: Individual student participants
          const { data, error } = await (supabase.from("participations") as any)
            .select(`
              id,
              student_id,
              students ( id, name, chest_no ),
              teams ( id, name, color_hex )
            `)
            .eq("event_id", selectedEventId)
            .order("created_at", { ascending: true })

          if (error) {
            console.error("Error fetching participants:", error)
            setParticipants([])
          } else if (data) {
            const indParticipants: ParticipantItem[] = (data || []).map((p: any) => {
              const savedAssigned = savedRecord?.assignments?.find(
                (a) => a.participant_id === p.id || a.participant_id === p.student_id
              )
              return {
                id: p.id,
                name: p.students?.name || "Participant",
                chest_no: p.students?.chest_no || "—",
                team_name: p.teams?.name || "Team",
                team_color: p.teams?.color_hex || "#1e3a8a",
                is_team: false,
                assigned_letter: savedAssigned?.code_letter || null,
              }
            })

            setParticipants(indParticipants)
            initializeLettersAndState(indParticipants, savedRecord)
          }
        }
      } catch (err) {
        console.error("Error preparing participants:", err)
      } finally {
        setLoadingParticipants(false)
      }
    }

    loadParticipantsForEvent()
  }, [selectedEventId, selectedEvent, teams])

  // Helper to sync configured letters and remaining letters from Supabase record
  const initializeLettersAndState = (
    parts: ParticipantItem[],
    savedRecord?: CodeLetterRecord | null
  ) => {
    if (savedRecord && savedRecord.assignments && savedRecord.assignments.length > 0) {
      // Restore from Supabase saved record
      const initialMap: Record<string, string> = {}
      savedRecord.assignments.forEach((a) => {
        initialMap[a.participant_id] = a.code_letter
      })
      setAssignments(initialMap)
      setConfiguredLetters(savedRecord.configured_letters || ["A", "B", "C"])
      setRemainingLetters(savedRecord.remaining_letters || [])
    } else {
      // Fresh event: initialize default letters based on participant count
      const count = Math.max(2, parts.length || 3)
      const defaultLetters = ALL_POSSIBLE_LETTERS.slice(0, Math.min(6, count))
      setConfiguredLetters(defaultLetters)
      setRemainingLetters(defaultLetters)
      setAssignments({})
    }
  }

  // Active / next participant waiting for code letter assignment
  const nextParticipant = useMemo(() => {
    return participants.find((p) => !assignments[p.id]) || null
  }, [participants, assignments])

  const assignedCount = useMemo(() => {
    return Object.keys(assignments).length
  }, [assignments])

  const isAllAssigned = useMemo(() => {
    return participants.length > 0 && assignedCount >= participants.length
  }, [participants, assignedCount])

  // Toggle configured letters before spinning starts
  const handleToggleLetter = (letter: string) => {
    if (isSpinning || assignedCount > 0) return

    let updated: string[]
    if (configuredLetters.includes(letter)) {
      if (configuredLetters.length <= 2) {
        toast.warning("At least 2 code letters are required for the spinner.")
        return
      }
      updated = configuredLetters.filter((l) => l !== letter)
    } else {
      updated = [...configuredLetters, letter].sort()
    }

    setConfiguredLetters(updated)
    setRemainingLetters(updated)
  }

  // Execute Spin Action (Exact 4 Seconds with physics easing & deceleration)
  const handleSpin = async () => {
    if (isSpinning || remainingLetters.length < 2 || !nextParticipant || isAllAssigned) return

    // Ensure Audio is active BEFORE starting
    const ctx = await ensureAudioRunning()

    setIsSpinning(true)
    const availableCount = remainingLetters.length

    // Pick a random winning index from remaining pool
    const winIndex = Math.floor(Math.random() * availableCount)
    const wonLetter = remainingLetters[winIndex]

    // Slice geometry & pointer alignment:
    const sliceAngle = 360 / availableCount
    const targetOffset = (winIndex + 0.5) * sliceAngle

    // 8 full rotations (2880 deg) for 4 seconds of momentum
    const extraSpins = 8 * 360
    const currentBase = Math.floor(wheelRotation / 360) * 360
    const finalAngle = currentBase + extraSpins + (360 - targetOffset)

    setWheelRotation(finalAngle)

    // Schedule precision spin audio sounds spanning the entire 4000ms
    if (ctx) {
      scheduleSpinSounds(ctx)
    }

    // Complete spin after exactly 4000ms
    setTimeout(async () => {
      setIsSpinning(false)
      if (ctx) {
        playVictoryChime(ctx)
      }

      // Current participant gets this won letter
      const currentPart = nextParticipant
      const updatedAssignments = {
        ...assignments,
        [currentPart.id]: wonLetter,
      }
      const updatedRemaining = remainingLetters.filter((l) => l !== wonLetter)

      // The Final Auto-Assignment Rule:
      // When 1 participant and 1 letter remain, automatically allocate to final participant!
      const remainingParts = participants.filter((p) => !updatedAssignments[p.id])
      let finalCompleted = false
      let autoAssignedLetter: string | null = null
      let autoAssignedPartName: string | null = null

      if (remainingParts.length === 1 && updatedRemaining.length === 1) {
        const lastPart = remainingParts[0]
        const lastLetter = updatedRemaining[0]
        updatedAssignments[lastPart.id] = lastLetter
        autoAssignedLetter = lastLetter
        autoAssignedPartName = lastPart.name
        finalCompleted = true
        setRemainingLetters([])
      } else {
        setRemainingLetters(updatedRemaining)
        finalCompleted = remainingParts.length === 0
      }

      setAssignments(updatedAssignments)

      // Winner popup modal
      setSpinWinnerModal({
        letter: wonLetter,
        participantName: currentPart.name,
        autoAssigned: Boolean(autoAssignedLetter),
      })

      // Prepare database payload & save into Supabase
      const assignmentsList = participants.map((p) => ({
        participant_id: p.id,
        participant_name: p.name,
        chest_no: p.chest_no || null,
        team_name: p.team_name,
        code_letter: updatedAssignments[p.id] || "",
        assigned_at: new Date().toISOString(),
      }))

      const payload: CodeLetterRecord = {
        event_id: selectedEvent!.id,
        event_name: selectedEvent!.name,
        grade_type: selectedEvent!.grade_type,
        category: selectedEvent!.category,
        configured_letters: configuredLetters,
        remaining_letters: autoAssignedLetter ? [] : updatedRemaining,
        assignments: assignmentsList,
        is_spinned: true,
        completed: finalCompleted,
        updated_at: new Date().toISOString(),
      }

      try {
        const saveRes = await fetch("/api/admin/code-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const savedData = await saveRes.json()
        if (!saveRes.ok || savedData.error) {
          throw new Error(savedData.error || "Failed to save assignment in Supabase")
        }

        // Update local spinnedMap cache
        setSpinnedMap((prev) => ({
          ...prev,
          [selectedEvent!.id]: payload,
        }))
        toast.success(`Assigned Code Letter '${wonLetter}' to ${currentPart.name}!`)

        if (autoAssignedLetter && autoAssignedPartName) {
          setTimeout(() => {
            toast.success(
              `Final Letter '${autoAssignedLetter}' auto-assigned to ${autoAssignedPartName}!`
            )
          }, 1200)
        }
      } catch (err: any) {
        console.error("Error saving code letter assignment:", err)
        toast.error(`Database save error: ${err.message || "Failed to persist to Supabase"}`)
      }
    }, 4000)
  }

  // Handle Reset Programme Code Letters (resets in Supabase and resets state to normal)
  const handleConfirmReset = async () => {
    if (!selectedEvent) return
    setIsResetting(true)
    try {
      const res = await fetch(`/api/admin/code-letter?event_id=${selectedEvent.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to reset")

      // Remove from spinnedMap
      setSpinnedMap((prev) => {
        const next = { ...prev }
        delete next[selectedEvent.id]
        return next
      })

      // Reset state back to normal
      setAssignments({})
      const defaultLetters = ALL_POSSIBLE_LETTERS.slice(0, Math.max(2, participants.length || 3))
      setConfiguredLetters(defaultLetters)
      setRemainingLetters(defaultLetters)
      setWheelRotation(0)
      setIsResetOpen(false)
      toast.success(`Code letters for '${selectedEvent.name}' reset to normal!`)
    } catch (err) {
      console.error("Error resetting code letters:", err)
      toast.error("Failed to reset code letters.")
    } finally {
      setIsResetting(false)
    }
  }

  // Filtered Events list for Search & Spinned/Pending Tabs
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // 1. Text Search
      const matchesSearch =
        ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.event_code && ev.event_code.toLowerCase().includes(searchQuery.toLowerCase()))

      if (!matchesSearch) return false

      // 2. Category Filter
      if (categoryFilter === "ON STAGE" && ev.category !== "ON STAGE") return false
      if (categoryFilter === "OFF STAGE" && ev.category !== "OFF STAGE") return false
      if (categoryFilter === "GROUP" && !isGroupEvent(ev)) return false

      // 3. Spinned / Pending Filter
      const isSpinned = Boolean(spinnedMap[ev.id]?.is_spinned)
      if (filterMode === "spinned" && !isSpinned) return false
      if (filterMode === "pending" && isSpinned) return false

      return true
    })
  }, [events, searchQuery, categoryFilter, filterMode, spinnedMap])

  const spinnedCount = useMemo(() => {
    return events.filter((e) => Boolean(spinnedMap[e.id]?.is_spinned)).length
  }, [events, spinnedMap])

  const pendingCount = useMemo(() => {
    return events.length - spinnedCount
  }, [events, spinnedCount])

  // Is current event spinned
  const isCurrentEventSpinned = Boolean(selectedEvent && spinnedMap[selectedEvent.id]?.is_spinned)

  return (
    <div className="space-y-6 font-['Anek_Malayalam',sans-serif]">
      {/* Top Banner / Header */}
      <div className="rounded-3xl border border-gold/30 bg-gradient-to-r from-navy via-deepblue to-navy p-6 text-white shadow-xl sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold">
              <Disc3 className="size-3.5 animate-spin-slow" />
              Official Fest Blind Evaluation Studio
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-ivory tracking-tight">
              Code Letter Allocation & Wheel Spinner
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-ivory/80 leading-relaxed">
              Randomly assign blind performance Code Letters (A, B, C, D, E, F) to participants & teams.
              Interactive 4-second deceleration spinner with live Supabase database synchronization.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9"
              title={soundEnabled ? "Mute audio ticks" : "Enable audio ticks"}
            >
              {soundEnabled ? <Volume2 className="size-4 text-gold" /> : <VolumeX className="size-4 text-slatebrand" />}
              <span className="ml-1 hidden sm:inline">{soundEnabled ? "Sound On" : "Muted"}</span>
            </Button>
          </div>
        </div>

        {/* Global Stats Summary Bar */}
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-center">
          <div className="rounded-2xl bg-white/5 p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ivory/60">Total Events</div>
            <div className="text-xl font-black font-mono text-ivory">{events.length}</div>
          </div>
          <div className="rounded-2xl bg-gold/15 border border-gold/30 p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gold">Spinned / Marked</div>
            <div className="text-xl font-black font-mono text-gold flex items-center justify-center gap-1">
              <CheckCircle2 className="size-4" />
              {spinnedCount}
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ivory/60">Pending Allocation</div>
            <div className="text-xl font-black font-mono text-ivory/90">{pendingCount}</div>
          </div>
        </div>
      </div>

      {/* Programme Selection, Search & Marked Filter Bar */}
      <Card className="border border-navy/15 bg-white/90 shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
              <Input
                type="text"
                placeholder="Search programme name or code (e.g. Mappilappattu, EV-102)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-ivory/50 border-navy/15 text-sm h-10 w-full"
              />
            </div>

            {/* Filter Tabs / Marked Button */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={filterMode === "all" ? "default" : "outline"}
                onClick={() => setFilterMode("all")}
                className={`text-xs h-9 ${
                  filterMode === "all"
                    ? "bg-[#0A1D2C] hover:bg-[#123B4F] text-white font-bold"
                    : "bg-white text-navy border-navy/15"
                }`}
              >
                All ({events.length})
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filterMode === "spinned" ? "default" : "outline"}
                onClick={() => setFilterMode("spinned")}
                className={`text-xs h-9 ${
                  filterMode === "spinned"
                    ? "bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-sm"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <CheckCircle2 className="mr-1.5 size-3.5 text-emerald-500" />
                Marked / Spinned ({spinnedCount})
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filterMode === "pending" ? "default" : "outline"}
                onClick={() => setFilterMode("pending")}
                className={`text-xs h-9 ${
                  filterMode === "pending"
                    ? "bg-navy text-gold font-bold"
                    : "bg-white text-navy border-navy/15"
                }`}
              >
                Pending ({pendingCount})
              </Button>
            </div>
          </div>

          {/* Quick Category Chips & Active Programme Dropdown */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            <div className="md:col-span-8">
              <label className="text-xs font-bold text-navy mb-1.5 block">
                Select Programme to Spin / Inspect:
              </label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="bg-white w-full h-11 border-navy/20 font-bold text-navy">
                  <SelectValue placeholder="Choose a festival programme..." />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="start"
                  className="max-h-72 max-w-[calc(100vw-2.5rem)] w-full overflow-y-auto"
                >
                  {filteredEvents.length === 0 ? (
                    <div className="p-3 text-xs text-center text-slatebrand">
                      No matching programmes found.
                    </div>
                  ) : (
                    filteredEvents.map((ev) => {
                      const isSpinned = Boolean(spinnedMap[ev.id]?.is_spinned)
                      return (
                        <SelectItem key={ev.id} value={ev.id} className="max-w-full py-2">
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-mono text-xs font-bold text-navy bg-navy/10 px-1.5 py-0.5 rounded shrink-0">
                                {ev.event_code || "—"}
                              </span>
                              <span className="truncate font-semibold text-navy">{ev.name}</span>
                              <span className="text-[11px] text-slatebrand">({ev.category})</span>
                            </div>
                            {isSpinned ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] shrink-0 font-bold">
                                Spinned ✓
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-slatebrand shrink-0">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-4 flex flex-col justify-end">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={categoryFilter === "all" ? "default" : "outline"}
                  onClick={() => setCategoryFilter("all")}
                  className="flex-1 text-[11px] h-9"
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={categoryFilter === "ON STAGE" ? "default" : "outline"}
                  onClick={() => setCategoryFilter("ON STAGE")}
                  className="flex-1 text-[11px] h-9"
                >
                  On Stage
                </Button>
                <Button
                  size="sm"
                  variant={categoryFilter === "OFF STAGE" ? "default" : "outline"}
                  onClick={() => setCategoryFilter("OFF STAGE")}
                  className="flex-1 text-[11px] h-9"
                >
                  Off Stage
                </Button>
                <Button
                  size="sm"
                  variant={categoryFilter === "GROUP" ? "default" : "outline"}
                  onClick={() => setCategoryFilter("GROUP")}
                  className="flex-1 text-[11px] h-9"
                  title="Grade C and D Group Events"
                >
                  Grade C/D
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area for Selected Event */}
      {!selectedEvent ? (
        <Card className="p-12 text-center border-dashed border-2 border-navy/15 bg-white/60">
          <Disc3 className="mx-auto size-12 text-slatebrand/30 animate-spin-slow" />
          <h3 className="mt-3 text-base font-bold text-navy">No Programme Selected</h3>
          <p className="mt-1 text-xs text-slatebrand">
            Choose a programme from the dropdown above to begin spinning code letters.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Event Banner & Reset Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-navy/15 bg-ivory/80 p-4 sm:p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-gold bg-navy px-2.5 py-1 rounded-lg">
                  {selectedEvent.event_code || "EVENT"}
                </span>
                <h2 className="text-xl font-black text-navy">{selectedEvent.name}</h2>
                <Badge variant="secondary" className="text-xs">
                  {selectedEvent.category}
                </Badge>
                <Badge
                  className={`text-xs font-bold ${
                    isGroupEvent(selectedEvent)
                      ? "bg-purple-100 text-purple-900 border border-purple-300"
                      : "bg-navy/10 text-navy"
                  }`}
                >
                  {isGroupEvent(selectedEvent) ? "Grade C/D • 3 Groups" : `Grade ${selectedEvent.grade_type} • Individual`}
                </Badge>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slatebrand">
                <span>
                  <strong>{participants.length}</strong> {isGroupEvent(selectedEvent) ? "Participating Groups (Teams)" : "Registered Participants"}
                </span>
                <span>•</span>
                <span>
                  <strong>{assignedCount}</strong> of <strong>{participants.length}</strong> Code Letters Allocated
                </span>
                {isCurrentEventSpinned && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" />
                      Saved & Synchronized with Supabase
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {isCurrentEventSpinned || assignedCount > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsResetOpen(true)}
                  disabled={isSpinning}
                  className="bg-white text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-xs h-9 font-bold shadow-xs"
                >
                  <RotateCcw className="mr-1.5 size-3.5" />
                  Reset Code Letters
                </Button>
              ) : null}
            </div>
          </div>

          {/* Grid Studio: Left 3D Spinner Wheel, Right Participants Allocation Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: 3D Wheel Spinner Studio */}
            <div className="lg:col-span-6 space-y-5">
              <Card className="border-2 border-gold/30 bg-white shadow-md overflow-hidden">
                <CardHeader className="p-4 sm:p-5 border-b border-navy/10 bg-gradient-to-r from-ivory/80 via-white to-ivory/80 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-gold uppercase tracking-wider">
                        <Sparkles className="size-3.5" />
                        Code Letter Spin Studio
                      </div>
                      <CardTitle className="text-base sm:text-lg font-black text-navy mt-0.5">
                        Interactive 3D Wheel
                      </CardTitle>
                    </div>

                    <Badge
                      className={`font-mono text-xs font-bold ${
                        isAllAssigned
                          ? "bg-emerald-600 text-white"
                          : isSpinning
                          ? "bg-gold text-navy animate-pulse"
                          : "bg-navy text-gold"
                      }`}
                    >
                      {isAllAssigned
                        ? "Allocation Complete"
                        : isSpinning
                        ? "Spinning (4s)..."
                        : `${remainingLetters.length} Letters Left`}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 space-y-5">
                  {/* Step 1: Code Letters Selection Area (Prior to spinning) */}
                  <div className="rounded-2xl border border-navy/15 bg-ivory/60 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-1.5">
                        Select Code Letters for this Programme:
                      </span>
                      <span className="text-[11px] text-slatebrand">
                        Max Pool: A to F
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ALL_POSSIBLE_LETTERS.map((letter) => {
                        const isConfigured = configuredLetters.includes(letter)
                        const isRemaining = remainingLetters.includes(letter)
                        const isAlreadyAssigned = isConfigured && !isRemaining

                        return (
                          <button
                            key={letter}
                            type="button"
                            disabled={isSpinning || assignedCount > 0}
                            onClick={() => handleToggleLetter(letter)}
                            className={`flex size-10 items-center justify-center rounded-xl font-mono text-sm font-black transition-all ${
                              isAlreadyAssigned
                                ? "bg-navy/10 text-slatebrand/50 border border-navy/10 cursor-not-allowed line-through"
                                : isConfigured
                                ? "bg-navy text-gold shadow-md ring-2 ring-gold/50 hover:scale-105"
                                : "bg-white text-navy/60 border border-navy/15 hover:border-gold hover:text-navy"
                            } ${assignedCount > 0 ? "cursor-not-allowed" : "cursor-pointer"}`}
                            title={
                              assignedCount > 0
                                ? "Letters locked while allocation is in progress"
                                : isConfigured
                                ? `Click to remove letter ${letter}`
                                : `Click to include letter ${letter}`
                            }
                          >
                            {letter}
                          </button>
                        )
                      })}

                      <div className="ml-auto text-[11px] text-slatebrand">
                        {assignedCount > 0 ? (
                          <span className="text-navy font-bold">Selection Locked</span>
                        ) : (
                          <span>
                            {configuredLetters.length} selected for {participants.length} {isGroupEvent(selectedEvent) ? "groups" : "participants"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: The 3D Wheel Presentation */}
                  <div className="relative mx-auto flex flex-col items-center justify-center py-4 select-none">
                    {/* Top 3D Arrow Needle Pointer */}
                    <div className="relative z-30 -mb-5 flex flex-col items-center drop-shadow-lg">
                      <div className="size-4 rounded-full bg-gradient-to-b from-amber-200 via-gold to-amber-600 shadow-md border border-white" />
                      <div className="size-0 border-x-12 border-x-transparent border-t-[22px] border-t-amber-500 -mt-1 filter drop-shadow(0 2px 4px rgba(0,0,0,0.4))" />
                    </div>

                    {/* Wheel Container with 3D Shadow Ring */}
                    <div className="relative size-[300px] sm:size-[340px] rounded-full p-2 bg-gradient-to-b from-amber-400 via-gold to-amber-700 shadow-[0_15px_35px_rgba(10,29,44,0.35),0_0_0_6px_#0A1D2C,0_0_0_10px_#D4AF37]">
                      {/* Metallic Rivets on Bezel */}
                      <div className="absolute inset-0 rounded-full pointer-events-none">
                        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                          <div
                            key={deg}
                            className="absolute size-2 rounded-full bg-ivory shadow-inner"
                            style={{
                              top: "50%",
                              left: "50%",
                              transform: `rotate(${deg}deg) translate(145px) rotate(-${deg}deg)`,
                            }}
                          />
                        ))}
                      </div>

                      {/* Rotating Wheel Disk */}
                      <div
                        className="relative size-full rounded-full overflow-hidden shadow-inner"
                        style={{
                          transform: `rotate(${wheelRotation}deg)`,
                          transition: isSpinning
                            ? "transform 4000ms cubic-bezier(0.12, 0.8, 0.18, 1.0)"
                            : "none",
                        }}
                      >
                        {isAllAssigned ? (
                          // Finished Wheel State: Clean festival disk, logo alone in center, NO background text or icon
                          <div className="size-full rounded-full bg-gradient-to-br from-navy via-deepblue to-navy shadow-inner flex items-center justify-center">
                            {/* Decorative concentric gold ring */}
                            <div className="size-full rounded-full border-4 border-gold/30 flex items-center justify-center">
                              <div className="size-[85%] rounded-full border border-gold/20" />
                            </div>
                          </div>
                        ) : (
                          // Dynamic Slices for Remaining Letters
                          <svg
                            viewBox="0 0 400 400"
                            className="size-full drop-shadow-md"
                          >
                            <defs>
                              {SLICE_COLORS.map((col, idx) => (
                                <radialGradient
                                  key={idx}
                                  id={`slice-grad-${idx}`}
                                  cx="50%"
                                  cy="50%"
                                  r="50%"
                                >
                                  <stop offset="30%" stopColor={col.fill} />
                                  <stop offset="100%" stopColor="#051019" />
                                </radialGradient>
                              ))}
                            </defs>

                            {remainingLetters.map((letter, idx) => {
                              const totalSlices = remainingLetters.length
                              const sliceAngle = 360 / totalSlices
                              const startAngle = idx * sliceAngle - 90
                              const endAngle = (idx + 1) * sliceAngle - 90
                              const midAngle = (idx + 0.5) * sliceAngle - 90

                              const r = 200
                              const cx = 200
                              const cy = 200

                              // SVG Wedge Path
                              const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180)
                              const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180)
                              const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180)
                              const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180)

                              const largeArcFlag = sliceAngle > 180 ? 1 : 0
                              const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`

                              // Letter placement radius
                              const textR = 135
                              const textX = cx + textR * Math.cos((midAngle * Math.PI) / 180)
                              const textY = cy + textR * Math.sin((midAngle * Math.PI) / 180)

                              return (
                                <g key={letter}>
                                  <path
                                    d={pathData}
                                    fill={`url(#slice-grad-${idx % SLICE_COLORS.length})`}
                                    stroke="#D4AF37"
                                    strokeWidth="3.5"
                                  />
                                  <text
                                    x={textX}
                                    y={textY}
                                    fill="#F3C649"
                                    fontSize="38"
                                    fontWeight="900"
                                    fontFamily="monospace"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                                    style={{
                                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
                                    }}
                                  >
                                    {letter}
                                  </text>
                                </g>
                              )
                            })}
                          </svg>
                        )}

                        {/* Center Metallic Hub with Fest Logo Alone */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="relative size-28 sm:size-32 rounded-full p-1 bg-gradient-to-br from-amber-200 via-gold to-amber-700 shadow-[0_8px_20px_rgba(0,0,0,0.6)] border-2 border-white/80 flex items-center justify-center">
                            <div className="relative size-full rounded-full bg-navy overflow-hidden flex items-center justify-center border-2 border-navy">
                              {/* Logo Image in the Middle Alone */}
                              <div className="relative size-20 sm:size-24 flex items-center justify-center">
                                <Image
                                  src="/logo.png"
                                  alt="Fest Logo"
                                  width={96}
                                  height={96}
                                  className="object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                                  priority
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Spin Action Controls */}
                  <div className="space-y-3 pt-2">
                    {/* Active Target Participant Pill */}
                    {nextParticipant && !isAllAssigned && (
                      <div className="rounded-xl border border-gold/40 bg-gold/10 p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-gold animate-ping" />
                          <span className="font-bold text-navy">
                            Spinning For: <span className="underline decoration-gold">{nextParticipant.name}</span>
                          </span>
                        </div>
                        <Badge className="bg-navy text-gold text-[10px] font-bold">
                          {isGroupEvent(selectedEvent) ? "Team Group" : `Chest #${nextParticipant.chest_no || "—"}`}
                        </Badge>
                      </div>
                    )}

                    {/* Big 4-Second Spin Button */}
                    <Button
                      type="button"
                      disabled={isSpinning || remainingLetters.length < 2 || !nextParticipant || isAllAssigned}
                      onClick={handleSpin}
                      className={`w-full h-13 text-sm font-black uppercase tracking-wider shadow-lg transition-all ${
                        isAllAssigned
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-default"
                          : isSpinning
                          ? "bg-navy text-gold cursor-wait"
                          : "bg-gradient-to-r from-gold via-amber-400 to-gold hover:from-[#c9a22e] hover:to-[#c9a22e] text-navy hover:scale-[1.01] border-0"
                      }`}
                    >
                      {isSpinning ? (
                        <>
                          <Loader2 className="mr-2 size-5 animate-spin text-gold" />
                          Spinning Wheel (4s Deceleration)...
                        </>
                      ) : isAllAssigned ? (
                        <>
                          <CheckCircle2 className="mr-2 size-5 text-white" />
                          All Participants Allocated
                        </>
                      ) : (
                        <>
                          <Disc3 className="mr-2 size-5 text-navy animate-spin-slow" />
                          Spin Code Letter (4 Seconds)
                        </>
                      )}
                    </Button>

                    <p className="text-[11px] text-center text-slatebrand">
                      Wheel spins for 4 seconds with realistic audio deceleration. When 1 letter remains, it is automatically allocated to the final participant.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: Participants / Groups Allocation Table */}
            <div className="lg:col-span-6 space-y-5">
              <Card className="border border-navy/15 bg-white shadow-md">
                <CardHeader className="p-4 sm:p-5 border-b border-navy/10 bg-ivory/50 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-navy flex items-center gap-2">
                        <Users className="size-4 text-gold" />
                        {isGroupEvent(selectedEvent) ? "Participating Teams (3 Groups)" : "Registered Participants"} ({participants.length})
                      </CardTitle>
                      <CardDescription className="text-xs text-slatebrand mt-0.5">
                        {isGroupEvent(selectedEvent)
                          ? "Grade C & D events are allocated strictly by Team (Telos, Ethos, Thymos)."
                          : "Individual events show registered students with their chest numbers."}
                      </CardDescription>
                    </div>

                    <Badge
                      className={`text-xs font-bold ${
                        isAllAssigned
                          ? "bg-emerald-600 text-white"
                          : "bg-navy text-gold"
                      }`}
                    >
                      {assignedCount} / {participants.length} Assigned
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-3">
                  {loadingParticipants ? (
                    <div className="py-12 text-center text-slatebrand flex flex-col items-center justify-center">
                      <Loader2 className="size-6 animate-spin text-gold" />
                      <span className="mt-2 text-xs">Loading participants...</span>
                    </div>
                  ) : participants.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slatebrand">
                      No participants registered yet for this programme.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {participants.map((p, idx) => {
                        const assignedLetter = assignments[p.id]
                        const isCurrentTarget = nextParticipant?.id === p.id && !isAllAssigned

                        return (
                          <div
                            key={p.id}
                            className={`rounded-2xl border p-3.5 transition-all flex items-center justify-between gap-3 ${
                              assignedLetter
                                ? "border-emerald-300 bg-emerald-50/40 shadow-xs"
                                : isCurrentTarget
                                ? "border-gold bg-gold/10 ring-2 ring-gold/40 shadow-sm"
                                : "border-navy/10 bg-ivory/30"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`flex size-9 shrink-0 items-center justify-center rounded-xl font-bold font-mono text-xs ${
                                  assignedLetter
                                    ? "bg-emerald-600 text-white"
                                    : isCurrentTarget
                                    ? "bg-gold text-navy font-black animate-pulse"
                                    : "bg-navy/10 text-slatebrand"
                                }`}
                              >
                                #{idx + 1}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm text-navy truncate">
                                    {p.name}
                                  </h4>
                                  {p.is_team ? (
                                    <Badge
                                      className="text-[10px] text-white"
                                      style={{ backgroundColor: p.team_color || "#1e3a8a" }}
                                    >
                                      Team
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-mono font-bold"
                                      style={{ borderColor: p.team_color, color: p.team_color }}
                                    >
                                      {p.team_name}
                                    </Badge>
                                  )}
                                </div>

                                <div className="text-[11px] text-slatebrand mt-0.5">
                                  {p.is_team ? (
                                    <span>Official Performing Group #{idx + 1}</span>
                                  ) : (
                                    <span>Chest No: <strong>#{p.chest_no || "—"}</strong></span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Code Letter Badge / Status */}
                            <div className="shrink-0 text-right">
                              {assignedLetter ? (
                                <div className="flex items-center gap-2">
                                  <div className="rounded-xl bg-navy px-3.5 py-1.5 text-center shadow-sm border border-gold/40">
                                    <div className="text-[9px] uppercase tracking-wider font-bold text-ivory/70 leading-none">
                                      Letter
                                    </div>
                                    <div className="text-xl font-black font-mono text-gold leading-tight">
                                      {assignedLetter}
                                    </div>
                                  </div>
                                </div>
                              ) : isCurrentTarget ? (
                                <Badge className="bg-gold text-navy text-xs font-bold animate-pulse">
                                  Next to Spin →
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-slatebrand/70">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Summary Footer */}
                  {isAllAssigned && (
                    <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                        <span className="font-bold">
                          All {participants.length} Code Letters successfully allocated and saved to Supabase!
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* WINNER ANNOUNCEMENT MODAL / POPUP */}
      {spinWinnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border-2 border-gold/40 bg-gradient-to-b from-white via-ivory to-white p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gold/20 text-gold shadow-inner">
              <Sparkles className="size-8" />
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slatebrand">
                {spinWinnerModal.autoAssigned ? "Final Auto-Assignment" : "Code Letter Awarded!"}
              </div>
              <h3 className="text-lg font-bold text-navy mt-1">
                {spinWinnerModal.participantName}
              </h3>
            </div>

            {/* Giant Letter Badge */}
            <div className="mx-auto flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-navy via-deepblue to-navy border-4 border-gold shadow-xl">
              <span className="text-5xl font-black font-mono text-gold drop-shadow-md">
                {spinWinnerModal.letter}
              </span>
            </div>

            <p className="text-xs text-slatebrand leading-relaxed">
              Assigned <strong>Code Letter {spinWinnerModal.letter}</strong> for official fest stage/off-stage evaluation.
            </p>

            <Button
              type="button"
              onClick={() => setSpinWinnerModal(null)}
              className="w-full bg-[#0A1D2C] hover:bg-[#123B4F] text-white font-bold text-xs h-10"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      <AlertDialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <AlertDialogContent className="max-w-md font-['Anek_Malayalam',sans-serif]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-navy text-lg">
              <AlertCircle className="size-5 text-red-500" />
              Reset Code Letters for {selectedEvent?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slatebrand">
              Are you sure you want to reset code letters for this programme? All assigned code letters will be permanently erased from Supabase, and this programme will be restored to normal pending status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isResetting} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              disabled={isResetting}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Yes, Reset Programme"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
