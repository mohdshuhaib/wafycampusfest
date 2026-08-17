"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { Play, Pause, RotateCcw, Eye, Sparkles, Clock, ArrowLeft, Loader2, Lock, KeyRound, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface ProgrammeEvent {
  id: string
  name: string
  event_code: string | null
  category: string
}

interface ProgrammeSlotData {
  programme_id: string
  language: "english" | "malayalam" | "arabic"
  subject: string
  duration_seconds: number
  programme?: ProgrammeEvent
}

interface ProgrammeTimerRecord {
  id: string
  programme_id?: string | null
  language?: "english" | "malayalam" | "arabic" | null
  subject?: string | null
  duration_seconds?: number | null
  slots_count: number
  programme_slots?: ProgrammeSlotData[]
  access_code?: string
}

interface SingleTimerState {
  timeLeft: number
  isRunning: boolean
  isRevealed: boolean
}

// Convert seconds to HH:MM:SS format
function formatHHMMSS(totalSecs: number): string {
  if (totalSecs < 0) totalSecs = 0
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function PublicTimerRevealPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const timerId = resolvedParams.id

  const [record, setRecord] = useState<ProgrammeTimerRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [slotsList, setSlotsList] = useState<ProgrammeSlotData[]>([])

  // Passcode Protection State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false)
  const [passcodeInput, setPasscodeInput] = useState<string>("")
  const [passcodeError, setPasscodeError] = useState<boolean>(false)

  // Independent Local States for up to 3 slots
  const [timerStates, setTimerStates] = useState<SingleTimerState[]>([
    { timeLeft: 600, isRunning: false, isRevealed: false },
    { timeLeft: 600, isRunning: false, isRevealed: false },
    { timeLeft: 600, isRunning: false, isRevealed: false },
  ])

  const supabase = createClient()

  // Check sessionStorage for existing unlock token
  useEffect(() => {
    if (typeof window !== "undefined" && timerId) {
      const unlocked = sessionStorage.getItem(`timer_unlocked_${timerId}`)
      if (unlocked === "true") {
        setIsUnlocked(true)
      }
    }
  }, [timerId])

  // Fetch Timer Session Record
  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true)
      setErrorMsg(null)

      // Fetch events map for quick lookup
      const { data: eventsData } = await (supabase.from("events") as any)
        .select("id, name, event_code, category")
      const eventsMap = new Map<string, ProgrammeEvent>()
      if (eventsData) {
        ;(eventsData as ProgrammeEvent[]).forEach((e) => eventsMap.set(e.id, e))
      }

      const { data, error } = await (supabase.from("programme_timers") as any)
        .select(`
          id,
          programme_id,
          language,
          subject,
          duration_seconds,
          slots_count,
          programme_slots,
          access_code,
          programme:events ( id, name, event_code, category )
        `)
        .eq("id", timerId)
        .single()

      if (error || !data) {
        console.error("Timer record not found:", error)
        setErrorMsg("Programme timer screen not found or link has expired.")
      } else {
        const row = data as any
        let count = row.slots_count || 1
        let slots: ProgrammeSlotData[] = row.programme_slots || []

        if (!slots || slots.length === 0) {
          if (row.programme_id) {
            slots = [
              {
                programme_id: row.programme_id,
                language: row.language || "english",
                subject: row.subject || "",
                duration_seconds: row.duration_seconds || 600,
                programme: row.programme,
              },
            ]
            count = 1
          }
        } else {
          slots = slots.map((s) => ({
            ...s,
            programme: s.programme || row.programme || eventsMap.get(s.programme_id),
          }))
        }

        const fullRecord: ProgrammeTimerRecord = {
          ...row,
          slots_count: count,
          programme_slots: slots,
          access_code: row.access_code || "",
        }

        setRecord(fullRecord)
        setSlotsList(slots)

        // Initialize local independent timer states for slots
        const initStates: SingleTimerState[] = slots.map((s) => ({
          timeLeft: s.duration_seconds || 600,
          isRunning: false,
          isRevealed: false,
        }))
        setTimerStates(initStates)
      }
      setLoading(false)
    }

    if (timerId) {
      fetchRecord()
    }
  }, [timerId])

  // Independent Countdown Intervals for each slot (only runs if screen is unlocked)
  useEffect(() => {
    if (!isUnlocked) return

    const interval = setInterval(() => {
      setTimerStates((prevStates) => {
        let changed = false
        const next = prevStates.map((st) => {
          if (st.isRunning && st.timeLeft > 0) {
            changed = true
            const nextTime = st.timeLeft - 1
            return {
              ...st,
              timeLeft: nextTime,
              isRunning: nextTime > 0,
            }
          }
          return st
        })
        return changed ? next : prevStates
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isUnlocked])

  // Validate Passcode Input
  const handleUnlockScreen = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!record) return

    const entered = passcodeInput.trim()
    const targetCode = (record.access_code || "").trim()

    if (entered === targetCode) {
      setIsUnlocked(true)
      setPasscodeError(false)
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`timer_unlocked_${timerId}`, "true")
      }
      toast.success("Screen unlocked successfully!")
    } else {
      setPasscodeError(true)
      toast.error("Invalid 6-digit passcode. Access denied.")
    }
  }

  // Start / Pause handler for specific slot
  const handleStartPauseSlot = (idx: number) => {
    setTimerStates((prev) => {
      const next = [...prev]
      const current = next[idx]
      if (!current) return prev

      const isFirstStart = !current.isRevealed
      const isFinished = current.timeLeft <= 0
      const duration = slotsList[idx]?.duration_seconds || 600

      next[idx] = {
        ...current,
        isRevealed: isFirstStart ? true : current.isRevealed,
        timeLeft: isFinished ? duration : current.timeLeft,
        isRunning: isFinished ? true : !current.isRunning,
      }
      return next
    })
  }

  // Reset handler for specific slot
  const handleResetSlot = (idx: number) => {
    setTimerStates((prev) => {
      const next = [...prev]
      const duration = slotsList[idx]?.duration_seconds || 600
      next[idx] = {
        timeLeft: duration,
        isRunning: false,
        isRevealed: false,
      }
      return next
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="size-10 animate-spin text-amber-400 mb-3" />
        <p className="text-base font-bold text-slate-200">Loading Timer Screen...</p>
      </main>
    )
  }

  if (errorMsg || !record || slotsList.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="size-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <Clock className="size-8" />
        </div>
        <h1 className="text-2xl font-black text-white">Timer Screen Not Found</h1>
        <p className="text-sm text-slate-300 mt-2 mb-6 max-w-md">
          {errorMsg || "The requested timer screen URL is invalid."}
        </p>
        <Link href="/">
          <Button variant="outline" className="border-slate-700 text-white hover:bg-slate-800 rounded-xl">
            <ArrowLeft className="size-4 mr-2" /> Return to Home
          </Button>
        </Link>
      </main>
    )
  }

  // PASSCODE LOCKED OVERLAY MODAL
  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/40 via-slate-950 to-black text-white flex flex-col items-center justify-center p-4 font-sans select-none">
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border-2 border-amber-400/40 backdrop-blur-2xl shadow-[0_10px_50px_rgba(0,0,0,0.9)] text-center space-y-6">
          <div className="size-16 rounded-3xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
            <Lock className="size-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white flex items-center justify-center gap-2">
              <KeyRound className="size-5 text-amber-400" /> Passcode Required
            </h1>
            <p className="text-xs text-slate-300 font-medium">
              This timer screen is protected. Enter the <span className="text-amber-400 font-extrabold">6-digit passcode</span> to unlock access.
            </p>
          </div>

          <form onSubmit={handleUnlockScreen} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                maxLength={6}
                value={passcodeInput}
                onChange={(e) => {
                  setPasscodeInput(e.target.value.replace(/\D/g, ""))
                  setPasscodeError(false)
                }}
                placeholder="• • • • • •"
                className={`h-14 text-center font-mono font-black text-2xl tracking-[0.4em] bg-slate-950 border-2 rounded-2xl text-white transition-all ${
                  passcodeError
                    ? "border-red-500 ring-2 ring-red-500/40"
                    : "border-amber-400/40 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
                }`}
                autoFocus
              />

              {passcodeError && (
                <p className="text-xs font-bold text-red-400 animate-shake">
                  ❌ Incorrect 6-digit passcode. Try again.
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={passcodeInput.length !== 6}
              className="w-full h-12 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base shadow-[0_0_25px_rgba(251,191,36,0.4)] cursor-pointer gap-2 border-2 border-amber-300"
            >
              <Unlock className="size-5 stroke-[2.5]" />
              <span>Unlock Timer Screen</span>
            </Button>
          </form>
        </div>
      </main>
    )
  }

  const slotsCount = slotsList.length

  // Grid column class based on slots count
  const gridColClass =
    slotsCount === 3
      ? "grid-cols-1 md:grid-cols-3"
      : slotsCount === 2
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 max-w-3xl"

  return (
    <main className="min-h-screen h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/40 via-slate-950 to-black text-white flex flex-col justify-between p-3 sm:p-6 font-sans select-none overflow-hidden">
      {/* 1. TOP CENTER CRYSTAL CLEAR FEST HEADER */}
      <div className="w-full shrink-0 pt-1 pb-2 flex justify-center">
        <div className="bg-amber-400 text-slate-950 px-6 sm:px-8 py-1.5 sm:py-2 rounded-full font-black text-xs sm:text-base shadow-[0_0_30px_rgba(251,191,36,0.6)] uppercase tracking-[0.25em] flex items-center gap-2 border-2 border-amber-300">
          <Sparkles className="size-4 fill-slate-950 text-slate-950 shrink-0" />
          <span>WAFY CAMPUS KALIKAVU FEST 2026</span>
        </div>
      </div>

      {/* 2. MULTI-PROGRAMME DISPLAY GRID CONTAINER */}
      <div className={`my-auto w-full max-w-7xl mx-auto grid ${gridColClass} gap-4 sm:gap-6 items-stretch overflow-y-auto max-h-[calc(100vh-140px)] py-2`}>
        {slotsList.map((slot, idx) => {
          const st = timerStates[idx] || { timeLeft: 600, isRunning: false, isRevealed: false }
          const isArabic = slot.language === "arabic"
          const isMalayalam = slot.language === "malayalam"
          const isFinished = st.timeLeft === 0

          const subjectHeading =
            slot.language === "malayalam"
              ? "വിഷയം"
              : slot.language === "arabic"
              ? "عنوان"
              : "Subject"

          return (
            <div
              key={idx}
              className="flex flex-col justify-between p-4 sm:p-6 rounded-3xl bg-slate-900/90 border-2 border-white/15 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] space-y-4"
            >
              {/* Card Header: Code Left + Name Right */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/15">
                {/* Code Badge */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-amber-400/40 px-3 py-1.5 rounded-xl shadow-xs shrink-0">
                  <span className="text-[10px] uppercase font-black text-amber-400">Code:</span>
                  <span className="font-mono text-base sm:text-lg font-black text-amber-300">
                    {slot.programme?.event_code || "N/A"}
                  </span>
                </div>

                {/* Programme Name */}
                <div className="text-right truncate flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Programme</span>
                  <h3 className="text-sm sm:text-base md:text-lg font-black text-white truncate leading-snug">
                    {slot.programme?.name || "Competition"}
                  </h3>
                </div>
              </div>

              {/* Subject Heading & Big Topic Box */}
              <div className="space-y-2 text-center flex-1 flex flex-col justify-center">
                <div>
                  <div className="inline-block bg-amber-400 text-slate-950 font-black uppercase text-xs sm:text-sm px-4 py-1 rounded-full tracking-wider shadow-md">
                    {subjectHeading}
                  </div>
                </div>

                <div
                  className={`p-4 sm:p-6 rounded-2xl bg-slate-950/80 border border-amber-400/25 flex items-center justify-center min-h-[90px] ${
                    isArabic ? "text-right font-sans" : "text-center"
                  }`}
                  dir={isArabic ? "rtl" : "ltr"}
                >
                  {st.isRevealed ? (
                    <h2
                      className={`text-xl sm:text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-md animate-in fade-in duration-300 ${
                        isMalayalam ? "font-sans" : ""
                      }`}
                    >
                      {slot.subject}
                    </h2>
                  ) : (
                    <div className="space-y-1 py-1">
                      <div className="flex items-center justify-center gap-1.5 text-amber-400 font-extrabold text-sm sm:text-base">
                        <Eye className="size-4 animate-pulse text-amber-400" />
                        <span>Subject Hidden</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-medium">
                        Click <span className="text-amber-400 font-black underline">START</span> below to reveal
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* GIANT DIGITAL TIMER DISPLAY FOR THIS SLOT */}
              <div className="text-center py-1">
                <div
                  className={`font-mono font-black tracking-wider transition-all duration-300 ${
                    slotsCount === 3
                      ? "text-4xl sm:text-6xl"
                      : slotsCount === 2
                      ? "text-5xl sm:text-7xl"
                      : "text-6xl sm:text-8xl"
                  } ${
                    isFinished
                      ? "text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.9)] animate-pulse"
                      : st.isRunning
                      ? "text-amber-400 drop-shadow-[0_0_25px_rgba(251,191,36,0.6)]"
                      : "text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                  }`}
                >
                  {formatHHMMSS(st.timeLeft)}
                </div>

                {isFinished && (
                  <p className="text-red-400 font-black text-xs sm:text-sm uppercase tracking-widest animate-bounce mt-1">
                    ⏰ TIME IS UP!
                  </p>
                )}
              </div>

              {/* INDEPENDENT SLOT CONTROLS */}
              <div className="pt-2">
                <div className="flex items-center justify-center gap-2 bg-slate-950/80 border border-white/20 p-2 rounded-2xl">
                  {/* START / PAUSE BUTTON */}
                  <Button
                    onClick={() => handleStartPauseSlot(idx)}
                    className={`h-12 sm:h-14 px-4 sm:px-6 rounded-xl text-sm sm:text-base font-black tracking-wider transition-all cursor-pointer flex-1 gap-2 border-2 active:scale-95 ${
                      st.isRunning
                        ? "bg-orange-500 hover:bg-orange-400 text-white border-orange-300 shadow-[0_0_20px_rgba(249,115,22,0.6)]"
                        : "bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.5)]"
                    }`}
                  >
                    {st.isRunning ? (
                      <>
                        <Pause className="size-5 fill-current" />
                        <span>PAUSE</span>
                      </>
                    ) : (
                      <>
                        <Play className="size-5 fill-current ml-0.5" />
                        <span>{st.isRevealed ? (st.timeLeft <= 0 ? "RESTART" : "RESUME") : "START"}</span>
                      </>
                    )}
                  </Button>

                  {/* RESET BUTTON */}
                  <Button
                    onClick={() => handleResetSlot(idx)}
                    className="h-12 sm:h-14 px-3 sm:px-5 bg-slate-800 hover:bg-slate-700 text-white border-2 border-white/40 font-black text-xs sm:text-sm rounded-xl gap-1.5 cursor-pointer shadow-md active:scale-95"
                  >
                    <RotateCcw className="size-4" />
                    <span>RESET</span>
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
