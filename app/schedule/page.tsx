"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import {
  CalendarClock,
  Clock,
  Calendar,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Tv,
  List,
  Users,
  BookOpen,
  Play,
  Pause,
  RefreshCw,
  Layers,
  Award,
  Radio,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ParticipantItem {
  id: string
  student_id: string
  student_name: string
  chest_no: string | null
  team_id: string
  team_name: string
  team_color: string
  code_letter: string | null
}

interface TopicInfo {
  type: "general" | "team" | "participant" | null
  language: "english" | "malayalam" | "arabic" | null
  general_topic: string | null
  team_topics: Record<string, string> | null
  participant_topics: Record<string, string> | null
}

interface ProgrammeScheduleItem {
  id: string
  programme_id: string
  stage: string
  schedule_date: string
  start_time: string
  end_time: string
  programme: {
    id: string
    name: string
    event_code: string | null
    category: string
    grade_type?: string | null
  }
  topic: TopicInfo | null
  participants: ParticipantItem[]
}

// Time helpers
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(":")
  const h = parseInt(parts[0], 10) || 0
  const m = parseInt(parts[1], 10) || 0
  return h * 60 + m
}

function format12Hour(timeStr: string): string {
  if (!timeStr) return ""
  const mins = timeToMinutes(timeStr)
  const hours = Math.floor(mins / 60)
  const m = mins % 60
  const suffix = hours >= 12 ? "PM" : "AM"
  const h12 = hours % 12 || 12
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const dt = new Date(dateStr + "T00:00:00")
    return dt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "short",
    })
  } catch {
    return dateStr
  }
}

function getStageTheme(stageName?: string | null) {
  const s = (stageName || "").toLowerCase()
  if (s.includes("1")) {
    return {
      name: "Stage 1",
      badge: "bg-amber-500/15 text-amber-900 border-amber-500/30",
      border: "border-amber-400",
      glow: "shadow-[0_6px_25px_rgba(245,158,11,0.18)]",
      pill: "bg-amber-500 text-white",
      color: "#F59E0B",
    }
  }
  if (s.includes("2")) {
    return {
      name: "Stage 2",
      badge: "bg-blue-500/15 text-blue-900 border-blue-500/30",
      border: "border-blue-400",
      glow: "shadow-[0_6px_25px_rgba(59,130,246,0.18)]",
      pill: "bg-blue-500 text-white",
      color: "#3B82F6",
    }
  }
  if (s.includes("3")) {
    return {
      name: "Stage 3",
      badge: "bg-purple-500/15 text-purple-900 border-purple-500/30",
      border: "border-purple-400",
      glow: "shadow-[0_6px_25px_rgba(168,85,247,0.18)]",
      pill: "bg-purple-500 text-white",
      color: "#A855F7",
    }
  }
  if (s.includes("4")) {
    return {
      name: "Stage 4",
      badge: "bg-emerald-500/15 text-emerald-900 border-emerald-500/30",
      border: "border-emerald-400",
      glow: "shadow-[0_6px_25px_rgba(16,185,129,0.18)]",
      pill: "bg-emerald-500 text-white",
      color: "#10B981",
    }
  }
  return {
    name: stageName || "Stage 1",
    badge: "bg-amber-500/15 text-amber-900 border-amber-500/30",
    border: "border-amber-400",
    glow: "shadow-[0_6px_25px_rgba(245,158,11,0.18)]",
    pill: "bg-amber-500 text-white",
    color: "#D4AF37",
  }
}

export default function PublicSchedulePage() {
  const [schedules, setSchedules] = useState<ProgrammeScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"gallery" | "timeline">("gallery")
  const [autoPlay, setAutoPlay] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  // Wall-clock live ticker (runs every second)
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch full enriched schedule from API
  const fetchScheduleData = async () => {
    try {
      const res = await fetch("/api/public/schedule", { cache: "no-store" })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.schedules)) {
          setSchedules(json.schedules)
        }
      }
    } catch (err) {
      console.error("Failed to load live schedule:", err)
    } finally {
      setLoading(false)
      setLastRefreshed(new Date())
    }
  }

  useEffect(() => {
    fetchScheduleData()
    // Periodic auto-sync every 30s for live venue TV updates
    const syncInterval = setInterval(() => {
      fetchScheduleData()
    }, 30000)
    return () => clearInterval(syncInterval)
  }, [])

  // Chronologically sorted list of schedules
  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      if (a.schedule_date !== b.schedule_date) {
        return a.schedule_date.localeCompare(b.schedule_date)
      }
      const sA = timeToMinutes(a.start_time)
      const sB = timeToMinutes(b.start_time)
      if (sA !== sB) return sA - sB
      return (a.stage || "").localeCompare(b.stage || "")
    })
  }, [schedules])

  // Filtered list for search
  const filteredSchedules = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return sortedSchedules
    return sortedSchedules.filter((s) => {
      const name = s.programme?.name?.toLowerCase() || ""
      const code = s.programme?.event_code?.toLowerCase() || ""
      const stage = (s.stage || "").toLowerCase()
      const category = s.programme?.category?.toLowerCase() || ""
      const topicText = s.topic?.general_topic?.toLowerCase() || ""
      const hasPart = s.participants.some(
        (p) =>
          p.student_name.toLowerCase().includes(q) ||
          (p.chest_no && p.chest_no.toLowerCase().includes(q)) ||
          p.team_name.toLowerCase().includes(q) ||
          (p.code_letter && p.code_letter.toLowerCase().includes(q))
      )
      return (
        name.includes(q) ||
        code.includes(q) ||
        stage.includes(q) ||
        category.includes(q) ||
        topicText.includes(q) ||
        hasPart
      )
    })
  }, [sortedSchedules, searchQuery])

  // Determine live status of a programme schedule
  const getProgrammeStatus = (sched: ProgrammeScheduleItem) => {
    if (!currentTime) return { status: "UPCOMING", label: "UPCOMING", isLive: false }

    const todayStr = currentTime.toISOString().slice(0, 10)
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes()
    const startMins = timeToMinutes(sched.start_time)
    const endMins = timeToMinutes(sched.end_time)

    if (sched.schedule_date === todayStr) {
      if (currentMins >= startMins && currentMins <= endMins) {
        return { status: "LIVE", label: "LIVE NOW", isLive: true }
      }
      if (currentMins < startMins) {
        return { status: "UPCOMING", label: "UPCOMING", isLive: false }
      }
      return { status: "COMPLETED", label: "COMPLETED", isLive: false }
    } else if (sched.schedule_date > todayStr) {
      return { status: "UPCOMING", label: "UPCOMING", isLive: false }
    } else {
      return { status: "COMPLETED", label: "COMPLETED", isLive: false }
    }
  }

  // Active / Live items currently running across stages
  const liveItems = useMemo(() => {
    return filteredSchedules.filter((s) => getProgrammeStatus(s).isLive)
  }, [filteredSchedules, currentTime])

  // Auto-align default index to live programme or earliest upcoming programme on first load
  const hasInitializedIndex = useRef(false)
  useEffect(() => {
    if (!hasInitializedIndex.current && filteredSchedules.length > 0 && currentTime) {
      hasInitializedIndex.current = true
      // If there are live items, start at the first live item index
      if (liveItems.length > 0) {
        const liveIndex = filteredSchedules.findIndex((s) => s.id === liveItems[0].id)
        if (liveIndex >= 0) {
          setCurrentIndex(liveIndex)
          return
        }
      }
      // Otherwise find the first upcoming item
      const upcomingIndex = filteredSchedules.findIndex((s) => {
        const stat = getProgrammeStatus(s)
        return stat.status === "UPCOMING"
      })
      if (upcomingIndex >= 0) {
        setCurrentIndex(upcomingIndex)
      } else {
        setCurrentIndex(0)
      }
    }
  }, [filteredSchedules, liveItems, currentTime])

  // TV Slides: Display 3 programmes per slide
  const maxIndex = Math.max(0, filteredSchedules.length - 3)

  // Clamp current index within bounds
  const clampedIndex = Math.min(Math.max(0, currentIndex), maxIndex)

  // Get the 3 programmes for the current window
  const visibleProgrammes = useMemo(() => {
    if (filteredSchedules.length === 0) return []
    if (filteredSchedules.length <= 3) {
      return filteredSchedules
    }
    return filteredSchedules.slice(clampedIndex, clampedIndex + 3)
  }, [filteredSchedules, clampedIndex])

  // Carousel auto-cycling for unattended TV screen
  useEffect(() => {
    if (!autoPlay || filteredSchedules.length <= 3) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev + 3 >= filteredSchedules.length) {
          return 0
        }
        return prev + 1
      })
    }, 15000) // 15 seconds per slide rotation
    return () => clearInterval(interval)
  }, [autoPlay, filteredSchedules.length])

  // Navigation handlers
  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))
  }

  const handleJumpToLive = () => {
    if (liveItems.length > 0) {
      const idx = filteredSchedules.findIndex((s) => s.id === liveItems[0].id)
      if (idx >= 0) setCurrentIndex(Math.min(idx, maxIndex))
    } else {
      // jump to earliest upcoming
      const idx = filteredSchedules.findIndex((s) => getProgrammeStatus(s).status === "UPCOMING")
      if (idx >= 0) setCurrentIndex(Math.min(idx, maxIndex))
    }
  }

  // Group schedules by schedule_date for Timeline List View
  const groupedByDate = useMemo(() => {
    const map = new Map<string, ProgrammeScheduleItem[]>()
    filteredSchedules.forEach((s) => {
      if (!map.has(s.schedule_date)) {
        map.set(s.schedule_date, [])
      }
      map.get(s.schedule_date)!.push(s)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredSchedules])

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-gold selection:text-navy flex flex-col justify-between">
      {/* Top TV Header Bar */}
      <header className="border-b border-navy/10 bg-white/95 backdrop-blur-xl sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Fest Brand & Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="size-11 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center text-navy shadow-xs hover:border-gold transition-all shrink-0"
              title="Return to Home"
            >
              <CalendarClock className="size-6 text-navy" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-navy text-base sm:text-lg tracking-tight uppercase">
                  Wafy Campus Kalikavu
                </span>
                <span className="bg-gold/20 text-navy text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-gold/40 tracking-wider">
                  Arts Fest 2026-27
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                <span className="text-amber-600 font-bold">● Main Stage Gallery Screen</span>
              </div>
            </div>
          </div>

          {/* Wall-Clock Live Time & Status Indicator */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            {/* Live Time Box */}
            <div className="bg-white border border-navy/10 rounded-2xl px-4 py-1.5 flex items-center gap-3 shadow-xs">
              <Clock className="size-4 text-amber-600 animate-pulse" />
              <div className="flex flex-col text-right">
                <span className="font-mono text-sm sm:text-base font-extrabold text-navy tracking-widest leading-none">
                  {currentTime
                    ? currentTime.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })
                    : "--:--:--"}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                  {currentTime
                    ? currentTime.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        weekday: "short",
                      })
                    : "Live Time"}
                </span>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 border border-navy/10 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setViewMode("gallery")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "gallery"
                    ? "bg-navy text-white font-black shadow-xs"
                    : "text-slate-600 hover:text-navy"
                }`}
                title="TV 3-Programme Stage View"
              >
                <Tv className="size-3.5" />
                <span className="hidden sm:inline">TV Gallery</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "timeline"
                    ? "bg-navy text-white font-black shadow-xs"
                    : "text-slate-600 hover:text-navy"
                }`}
                title="Full Schedule Timeline"
              >
                <List className="size-3.5" />
                <span className="hidden sm:inline">Full List</span>
              </button>
            </div>

            {/* TV Auto-Cycle Button */}
            {viewMode === "gallery" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoPlay(!autoPlay)}
                className={`h-9 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  autoPlay
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold"
                    : "bg-white border-navy/15 text-slate-700 hover:text-navy hover:bg-slate-50"
                }`}
                title={autoPlay ? "Auto-cycling is ON (15s)" : "Enable automatic screen cycling for TV"}
              >
                {autoPlay ? <Pause className="size-3.5 mr-1 text-emerald-700" /> : <Play className="size-3.5 mr-1" />}
                <span>Auto-Cycle {autoPlay ? "ON" : "OFF"}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={fetchScheduleData}
              className="size-9 p-0 rounded-xl bg-white border-navy/15 text-slate-700 hover:text-navy hover:bg-slate-50 cursor-pointer shadow-xs"
              title="Refresh live status"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Navigation Toolbar & Live Programme Status */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-navy/10 rounded-3xl p-4 sm:p-5 shadow-xs">
          {/* Active Status & Search */}
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            {liveItems.length > 0 ? (
              <div className="flex items-center gap-2 bg-red-500/10 text-red-700 border border-red-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider animate-pulse">
                <span className="size-2 rounded-full bg-red-600 shadow-[0_0_8px_#ef4444]" />
                <span>{liveItems.length} Programme{liveItems.length === 1 ? "" : "s"} LIVE Across Stages</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-100 border border-navy/10 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-slate-700">
                <Clock className="size-3.5 text-amber-600" />
                <span>No Programmes Live Right Now • Next Scheduled Up</span>
              </div>
            )}

            {/* Live Jump Button with Live Radio Icon */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleJumpToLive}
              className="text-xs font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border-red-200 rounded-xl h-8 px-3 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Radio className="size-3.5 text-red-600 animate-pulse" />
              <span>Show Live</span>
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search code, event, student, stage..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentIndex(0)
              }}
              className="pl-10 h-10 bg-slate-50 border-navy/15 text-navy placeholder:text-slate-400 focus:bg-white rounded-xl text-xs font-medium focus:border-gold"
            />
          </div>

          {/* Next / Back Controls (TV Gallery Mode) */}
          {viewMode === "gallery" && filteredSchedules.length > 3 && (
            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <span className="text-xs font-bold text-slate-500 font-mono">
                Showing {clampedIndex + 1}–{Math.min(clampedIndex + 3, filteredSchedules.length)} of {filteredSchedules.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrev}
                  disabled={clampedIndex === 0}
                  className="bg-white hover:bg-slate-50 text-navy border border-navy/15 disabled:opacity-30 rounded-xl size-10 p-0 cursor-pointer shadow-xs font-bold"
                  title="Previous Programme"
                >
                  <ChevronLeft className="size-5" />
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={clampedIndex >= maxIndex}
                  className="bg-navy hover:bg-navy/90 text-white border border-navy/20 disabled:opacity-30 rounded-xl size-10 p-0 cursor-pointer shadow-xs font-black"
                  title="Next Programme"
                >
                  <ChevronRight className="size-5 stroke-[3]" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="size-12 animate-spin text-amber-600" />
            <p className="text-base font-bold text-slate-600">Loading live stage schedule...</p>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="bg-white border border-navy/10 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-3 shadow-xs">
            <CalendarClock className="size-12 text-gold mx-auto" />
            <h3 className="text-xl font-bold text-navy">No Programmes Scheduled</h3>
            <p className="text-sm text-slate-500">
              {searchQuery
                ? "No programmes found matching your search query."
                : "The festival committee is finalizing the stage schedule. Please check back shortly."}
            </p>
          </div>
        ) : viewMode === "gallery" ? (
          /* ========================================================= */
          /* 1. TV GALLERY 3-PROGRAMME DISPLAY (WHITE BACKGROUND THEME)*/
          /* ========================================================= */
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {visibleProgrammes.map((sched, cardIdx) => {
                const stageTheme = getStageTheme(sched.stage)
                const liveStatus = getProgrammeStatus(sched)
                const isLiveNow = liveStatus.isLive

                return (
                  <div
                    key={sched.id}
                    className={`relative rounded-3xl flex flex-col justify-between overflow-hidden transition-all duration-300 bg-white ${
                      isLiveNow
                        ? `border-2 ${stageTheme.border} ${stageTheme.glow} ring-2 ring-amber-400/30 shadow-lg`
                        : "border border-navy/10 hover:border-navy/25 shadow-xs hover:shadow-md"
                    }`}
                  >
                    {/* Top Accent Strip */}
                    <div
                      className={`h-2 w-full bg-gradient-to-r ${
                        isLiveNow ? "from-red-500 via-amber-400 to-amber-500 animate-pulse" : "from-navy/30 via-navy/20 to-navy/40"
                      }`}
                    />

                    {/* Card Content Header */}
                    <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col">
                      {/* Top Badges: Stage, Time, Live Status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* Stage Pill */}
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black tracking-wide border shadow-xs ${stageTheme.badge}`}
                        >
                          <Layers className="size-3.5" />
                          <span>{sched.stage || "Stage 1"}</span>
                        </div>

                        {/* Status Badge */}
                        {isLiveNow ? (
                          <div className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm animate-pulse">
                            <span className="size-2 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
                            <span>LIVE NOW</span>
                          </div>
                        ) : liveStatus.status === "COMPLETED" ? (
                          <div className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase">
                            COMPLETED
                          </div>
                        ) : (
                          <div className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase">
                            UPCOMING
                          </div>
                        )}
                      </div>

                      {/* Time Slot & Date */}
                      <div className="flex items-center justify-between text-xs text-slate-600 font-medium pb-2 border-b border-navy/10">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-navy text-sm">
                          <Clock className="size-4 text-amber-600 shrink-0" />
                          <span>{format12Hour(sched.start_time)} – {format12Hour(sched.end_time)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                          <Calendar className="size-3 text-slate-400" />
                          <span>{formatDateLabel(sched.schedule_date)}</span>
                        </div>
                      </div>

                      {/* Programme Code, Name & Category */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-navy bg-navy/8 border border-navy/15 px-2.5 py-0.5 rounded-md">
                            {sched.programme?.event_code || "CODE"}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            {sched.programme?.category || "PROGRAMME"}
                          </span>
                          {sched.programme?.grade_type && (
                            <span className="text-[10px] font-extrabold uppercase text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
                              Grade {sched.programme.grade_type}
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-navy tracking-tight leading-snug line-clamp-2">
                          {sched.programme?.name}
                        </h2>
                      </div>

                      {/* Topic Card (If assigned) */}
                      {sched.topic?.general_topic ? (
                        <div className="p-3.5 rounded-2xl bg-amber-500/8 border border-amber-500/25 space-y-1.5 shadow-xs">
                          <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="size-3.5 text-amber-600" />
                              <span>Assigned Topic</span>
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">
                              {sched.topic.language || "Topic"}
                            </span>
                          </div>
                          <p
                            className={`text-sm font-semibold text-navy leading-relaxed ${
                              sched.topic.language === "arabic"
                                ? "text-right font-serif text-base"
                                : ""
                            }`}
                            dir={sched.topic.language === "arabic" ? "rtl" : "ltr"}
                          >
                            {sched.topic.general_topic}
                          </p>
                        </div>
                      ) : null}

                      {/* Participants Section */}
                      <div className="space-y-2 pt-2 flex-1 flex flex-col justify-end">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <span className="flex items-center gap-1.5 text-navy">
                            <Users className="size-3.5 text-amber-600" />
                            <span>Participants ({sched.participants.length})</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Team</span>
                        </div>

                        {sched.participants.length === 0 ? (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 italic">
                            No participants listed for this programme
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                            {sched.participants.map((p, pIdx) => (
                              <div
                                key={p.id || pIdx}
                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-navy/5 hover:border-navy/15 hover:bg-slate-100/80 transition-all text-xs"
                              >
                                {/* Left: Code Letter & Name */}
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  {p.code_letter ? (
                                    <span className="font-mono text-xs font-black size-6 rounded-lg bg-navy text-gold flex items-center justify-center shrink-0 shadow-xs">
                                      {p.code_letter}
                                    </span>
                                  ) : (
                                    <span className="font-mono text-[10px] font-bold text-slate-500 size-6 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                      #{pIdx + 1}
                                    </span>
                                  )}
                                  <div className="truncate">
                                    <div className="font-bold text-navy truncate text-xs sm:text-sm">
                                      {p.student_name}
                                    </div>
                                    {p.chest_no && (
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        Chest: <span className="font-bold text-slate-700">{p.chest_no}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Team Badge */}
                                <div
                                  className="text-[11px] font-black px-2 py-0.5 rounded-lg border shrink-0 max-w-[110px] truncate"
                                  style={{
                                    backgroundColor: `${p.team_color}15`,
                                    color: p.team_color,
                                    borderColor: `${p.team_color}44`,
                                  }}
                                >
                                  {p.team_name}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Indicator Footer */}
                    <div className="px-6 py-3 bg-slate-50 border-t border-navy/10 flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono text-[11px] font-semibold text-slate-600">
                        Slot {cardIdx + clampedIndex + 1} of {filteredSchedules.length}
                      </span>
                      <span className="font-bold text-amber-700 flex items-center gap-1">
                        <Award className="size-3" />
                        <span>Arts Fest 2026</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Gallery Navigation Controls Bar */}
            <div className="flex items-center justify-between pt-2">
              <Button
                onClick={handlePrev}
                disabled={clampedIndex === 0}
                className="bg-white hover:bg-slate-50 text-navy border border-navy/15 disabled:opacity-30 rounded-2xl px-5 h-12 cursor-pointer font-bold gap-2 text-sm shadow-xs"
              >
                <ChevronLeft className="size-4" />
                <span>Previous Programmes</span>
              </Button>

              {/* Slide Dots */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs sm:max-w-md py-1">
                {Array.from({ length: Math.max(1, maxIndex + 1) }).map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => setCurrentIndex(dotIdx)}
                    className={`size-2.5 rounded-full transition-all cursor-pointer ${
                      dotIdx === clampedIndex
                        ? "w-8 bg-navy shadow-xs"
                        : "bg-navy/20 hover:bg-navy/40"
                    }`}
                    title={`Go to item ${dotIdx + 1}`}
                  />
                ))}
              </div>

              <Button
                onClick={handleNext}
                disabled={clampedIndex >= maxIndex}
                className="bg-navy hover:bg-navy/90 text-white border border-navy/20 disabled:opacity-30 rounded-2xl px-5 h-12 cursor-pointer font-black gap-2 text-sm shadow-xs"
              >
                <span>Next Programmes</span>
                <ChevronRight className="size-4 stroke-[3]" />
              </Button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* 2. FULL TIMELINE VIEW (EXPANDABLE LIST FOR AUDIENCE)     */
          /* ========================================================= */
          <div className="space-y-8">
            {groupedByDate.map(([dateStr, items]) => (
              <div key={dateStr} className="space-y-4">
                {/* Date Header Banner */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-2xl font-black text-sm shadow-xs">
                    <Calendar className="size-4 stroke-[2.5] text-gold" />
                    <span>{formatDateLabel(dateStr)}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    ({items.length} programme{items.length === 1 ? "" : "s"})
                  </span>
                </div>

                {/* Table of Programmes for this Date */}
                <div className="rounded-3xl border border-navy/10 bg-white shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider font-extrabold border-b border-navy/10">
                        <tr>
                          <th className="px-5 py-4 w-14 text-center">#</th>
                          <th className="px-5 py-4 min-w-[220px]">Programme</th>
                          <th className="px-5 py-4 min-w-[120px]">Stage</th>
                          <th className="px-5 py-4 w-40">Time Slot</th>
                          <th className="px-5 py-4 min-w-[130px]">Status</th>
                          <th className="px-5 py-4 min-w-[200px]">Assigned Topic</th>
                          <th className="px-5 py-4 min-w-[160px]">Participants</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-navy/5 text-navy font-medium">
                        {items.map((item, idx) => {
                          const stageTheme = getStageTheme(item.stage)
                          const liveStat = getProgrammeStatus(item)
                          const isLive = liveStat.isLive

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                isLive
                                  ? "bg-red-500/10 hover:bg-red-500/15"
                                  : "hover:bg-slate-50/70"
                              }`}
                            >
                              <td className="px-5 py-4 text-center font-mono font-bold text-slate-400">
                                {idx + 1}
                              </td>

                              {/* Programme */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-xs font-extrabold text-navy bg-navy/8 px-2 py-0.5 rounded border border-navy/10">
                                    {item.programme?.event_code || "N/A"}
                                  </span>
                                  <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    {item.programme?.category}
                                  </span>
                                </div>
                                <div className="font-bold text-navy text-base leading-snug">
                                  {item.programme?.name}
                                </div>
                              </td>

                              {/* Stage */}
                              <td className="px-5 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black border ${stageTheme.badge}`}>
                                  {item.stage || "Stage 1"}
                                </span>
                              </td>

                              {/* Time */}
                              <td className="px-5 py-4 font-mono font-extrabold text-navy text-xs">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="size-3.5 text-amber-600 shrink-0" />
                                  <span>{format12Hour(item.start_time)} – {format12Hour(item.end_time)}</span>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-5 py-4">
                                {isLive ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-black bg-red-600 text-white px-3 py-1 rounded-full animate-pulse shadow-xs">
                                    <span className="size-2 rounded-full bg-white" />
                                    <span>LIVE NOW</span>
                                  </span>
                                ) : liveStat.status === "COMPLETED" ? (
                                  <span className="inline-flex items-center text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                                    Completed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                                    Upcoming
                                  </span>
                                )}
                              </td>

                              {/* Topic */}
                              <td className="px-5 py-4 text-xs text-slate-700">
                                {item.topic?.general_topic ? (
                                  <div
                                    className={`line-clamp-2 ${
                                      item.topic.language === "arabic" ? "font-serif text-sm" : ""
                                    }`}
                                    dir={item.topic.language === "arabic" ? "rtl" : "ltr"}
                                    title={item.topic.general_topic}
                                  >
                                    {item.topic.general_topic}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Spot / No Topic</span>
                                )}
                              </td>

                              {/* Participants count / Badges */}
                              <td className="px-5 py-4 text-xs">
                                {item.participants.length > 0 ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {item.participants.slice(0, 4).map((p, pIdx) => (
                                      <span
                                        key={p.id || pIdx}
                                        className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 border border-navy/10 text-navy"
                                        title={`${p.code_letter ? `Code ${p.code_letter} - ` : ""}${p.student_name} (${p.team_name})`}
                                      >
                                        {p.code_letter ? `${p.code_letter}: ` : ""}{p.chest_no || p.student_name.slice(0, 8)}
                                      </span>
                                    ))}
                                    {item.participants.length > 4 && (
                                      <span className="text-[10px] font-bold text-slate-500">
                                        +{item.participants.length - 4} more
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">None</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Notice */}
      <footer className="border-t border-navy/10 bg-white py-4 px-4 sm:px-6 text-center text-xs text-slate-500 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-navy">Wafy Campus Kalikavu Arts Fest 2026-27</span> • Official Main Stage Display System
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Auto-refreshed: {lastRefreshed.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>
      </footer>
    </main>
  )
}
