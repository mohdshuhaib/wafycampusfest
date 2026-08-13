"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { Play, Pause, RotateCcw, Eye, Sparkles, Clock, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProgrammeEvent {
  id: string
  name: string
  event_code: string | null
  category: string
}

interface ProgrammeTimerRecord {
  id: string
  programme_id: string
  language: "english" | "malayalam" | "arabic"
  subject: string
  duration_seconds: number
  programme?: ProgrammeEvent
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

  // Local Timer State
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [isRevealed, setIsRevealed] = useState<boolean>(false)

  const supabase = createClient()

  // Fetch Timer Record
  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true)
      setErrorMsg(null)

      const { data, error } = await (supabase.from("programme_timers") as any)
        .select(`
          id,
          programme_id,
          language,
          subject,
          duration_seconds,
          programme:events ( id, name, event_code, category )
        `)
        .eq("id", timerId)
        .single()

      if (error || !data) {
        console.error("Timer record not found:", error)
        setErrorMsg("Programme timer not found or link has expired.")
      } else {
        const rec = data as ProgrammeTimerRecord
        setRecord(rec)
        setTimeLeft(rec.duration_seconds || 600)
      }
      setLoading(false)
    }

    if (timerId) {
      fetchRecord()
    }
  }, [timerId])

  // Countdown Interval Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft])

  // Handlers
  const handleStartPause = () => {
    if (!record) return

    // On first Start click, reveal subject text
    if (!isRevealed) {
      setIsRevealed(true)
    }

    // Toggle running state
    if (timeLeft <= 0) {
      // If completed, restart from full duration
      setTimeLeft(record.duration_seconds)
      setIsRunning(true)
    } else {
      setIsRunning(!isRunning)
    }
  }

  const handleReset = () => {
    if (!record) return
    setIsRunning(false)
    setTimeLeft(record.duration_seconds || 600)
    setIsRevealed(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="size-10 animate-spin text-amber-400 mb-3" />
        <p className="text-base font-bold text-slate-200">Loading Programme Timer...</p>
      </main>
    )
  }

  if (errorMsg || !record) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="size-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <Clock className="size-8" />
        </div>
        <h1 className="text-2xl font-black text-white">Timer Not Found</h1>
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

  const isArabic = record.language === "arabic"
  const isMalayalam = record.language === "malayalam"
  const isFinished = timeLeft === 0

  // Subject Heading text per language
  const subjectHeading =
    record.language === "malayalam"
      ? "വിഷയം"
      : record.language === "arabic"
      ? "عنوان"
      : "Subject"

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/40 via-slate-950 to-black text-white flex flex-col justify-between p-4 sm:p-8 font-sans select-none overflow-x-hidden">
      {/* 1. TOP HEADER SECTION */}
      <div className="w-full space-y-4">
        {/* Top Center Higher Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/40 text-amber-300 px-6 py-2 rounded-full text-xs sm:text-sm font-black uppercase tracking-[0.25em] shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <Sparkles className="size-4 text-amber-400" />
            <span>Wafy Campus Kalikavu Fest</span>
          </div>
        </div>

        {/* Top Bar: Left = Programme Code, Right = Programme Name */}
        <div className="flex items-center justify-between gap-4 max-w-6xl mx-auto w-full pt-1">
          {/* Top Left: Programme Code */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-400/30 px-4 py-2.5 rounded-2xl shadow-lg backdrop-blur-md">
            <span className="text-[10px] uppercase font-extrabold text-amber-400 tracking-wider">Code:</span>
            <span className="font-mono text-lg sm:text-2xl font-black text-white">
              {record.programme?.event_code || "P001"}
            </span>
          </div>

          {/* Top Right: Programme Name */}
          <div className="text-right bg-slate-900/90 border border-white/20 px-5 py-2.5 rounded-2xl shadow-lg backdrop-blur-md max-w-md truncate">
            <span className="text-[10px] uppercase font-extrabold text-amber-400 tracking-wider block">Programme</span>
            <h2 className="text-base sm:text-xl font-black text-white truncate">
              {record.programme?.name || "Competition"}
            </h2>
          </div>
        </div>
      </div>

      {/* 2. CENTER DISPLAY AREA (Subject Heading, Subject Topic, Timer) */}
      <div className="my-auto py-6 space-y-8 max-w-5xl mx-auto w-full text-center">
        {/* Subject Heading & Reveal Box */}
        <div className="space-y-4">
          <div className="inline-block bg-amber-400 text-slate-950 font-black uppercase text-base sm:text-lg px-8 py-2 rounded-full tracking-widest shadow-[0_0_20px_rgba(251,191,36,0.4)] border-2 border-amber-300">
            {subjectHeading}
          </div>

          {/* Big Size Subject / Topic Text */}
          <div
            className={`p-6 sm:p-10 rounded-3xl bg-slate-900/90 border-2 border-amber-400/30 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all ${
              isArabic ? "text-right font-sans" : "text-center"
            }`}
            dir={isArabic ? "rtl" : "ltr"}
          >
            {isRevealed ? (
              <h1
                className={`text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight sm:leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-500 ${
                  isMalayalam ? "font-sans" : ""
                }`}
              >
                {record.subject}
              </h1>
            ) : (
              <div className="py-6 space-y-3">
                <div className="flex items-center justify-center gap-2 text-amber-400 font-extrabold text-xl sm:text-2xl">
                  <Eye className="size-7 animate-pulse text-amber-400" />
                  <span>Subject Hidden</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 font-medium">
                  Click the <span className="text-amber-400 font-black underline">START</span> button below to reveal the subject and begin the countdown timer.
                </p>
                <div className="font-mono text-3xl tracking-[0.5em] text-slate-600 blur-[2px] pointer-events-none select-none">
                  ••••••••••••••••••••
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GIANT HIGH-CONTRAST DIGITAL TIMER DISPLAY */}
        <div className="space-y-2 py-2">
          <div
            className={`font-mono font-black tracking-wider text-7xl sm:text-9xl transition-all duration-300 ${
              isFinished
                ? "text-red-500 drop-shadow-[0_0_40px_rgba(239,68,68,0.9)] animate-pulse"
                : isRunning
                ? "text-amber-400 drop-shadow-[0_0_35px_rgba(251,191,36,0.6)]"
                : "text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]"
            }`}
          >
            {formatHHMMSS(timeLeft)}
          </div>

          {isFinished && (
            <p className="text-red-400 font-black text-xl sm:text-2xl uppercase tracking-widest animate-bounce drop-shadow-md">
              ⏰ TIME IS UP!
            </p>
          )}
        </div>
      </div>

      {/* 3. BOTTOM CONTROLS SECTION (Local Browser Execution - High Contrast Buttons) */}
      <div className="w-full max-w-lg mx-auto pb-4">
        <div className="flex items-center justify-center gap-4 bg-slate-900/90 border-2 border-white/20 p-4 rounded-3xl backdrop-blur-2xl shadow-2xl">
          {/* START / PAUSE BUTTON */}
          <Button
            onClick={handleStartPause}
            className={`h-16 sm:h-20 px-8 sm:px-12 rounded-2xl text-lg sm:text-xl font-black tracking-wider transition-all cursor-pointer flex-1 gap-3 border-2 active:scale-95 ${
              isRunning
                ? "bg-orange-500 hover:bg-orange-400 text-white border-orange-300 shadow-[0_0_35px_rgba(249,115,22,0.6)]"
                : "bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.5)]"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="size-7 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="size-7 fill-current ml-1" />
                <span>{isRevealed ? (timeLeft <= 0 ? "RESTART" : "RESUME") : "START"}</span>
              </>
            )}
          </Button>

          {/* RESET BUTTON */}
          <Button
            onClick={handleReset}
            className="h-16 sm:h-20 px-6 sm:px-8 bg-slate-800 hover:bg-slate-700 text-white border-2 border-white/40 font-black text-base sm:text-lg rounded-2xl gap-2 cursor-pointer shadow-lg active:scale-95"
          >
            <RotateCcw className="size-6" />
            <span>RESET</span>
          </Button>
        </div>
      </div>
    </main>
  )
}
