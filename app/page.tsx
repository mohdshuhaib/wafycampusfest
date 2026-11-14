"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Trophy,
  Medal,
  Award,
  Crown,
  ChevronDown,
  Search,
  Calendar,
  Layers,
  ArrowRight,
  Flame,
  Clock,
  Users,
  User,
  Sparkles,
} from "lucide-react"

interface TeamScore {
  id: string
  name: string
  slug: string
  color_hex: string
  offStage: number
  onStage: number
  general: number
  special: number
  penalty: number
  total: number
  rank: number
}

interface ParticipantResult {
  id: string
  chest_no: string
  student_name: string
  team_name: string
  team_color: string
  team_slug: string
  event_id: string
  event_name: string
  event_code: string
  category: "ON STAGE" | "OFF STAGE" | "GENERAL" | "SPECIAL"
  points_earned: number
  performance_grade: string | null
  result_position: string | null
  has_result: boolean
}

interface GroupedEvent {
  eventId: string
  eventCode: string
  eventName: string
  category: "ON STAGE" | "OFF STAGE" | "GENERAL" | "SPECIAL"
  participants: ParticipantResult[]
}

interface TopStudentScorer {
  id: string
  name: string
  chest_no: string
  image_link: string | null
  team_name: string
  team_color: string
  team_slug: string
  total_points: number
  off_stage_points: number
  on_stage_points: number
  general_points: number
  special_points: number
  rank: number
}

// Convert Google Drive share link into high-speed direct image URL
function getStudentPhotoUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null
  const driveMatch = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/id=([a-zA-Z0-9_-]+)/)
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`
  }
  return rawUrl
}

export default function ArtsFestResultsPage() {
  // Data states
  const [teams, setTeams] = useState<TeamScore[]>([])
  const [results, setResults] = useState<ParticipantResult[]>([])
  const [topStudents, setTopStudents] = useState<TopStudentScorer[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAnyResults, setHasAnyResults] = useState(false)
  const [totalEvents, setTotalEvents] = useState(55)
  const [totalParticipants, setTotalParticipants] = useState(330)

  // Filter states
  const [activeTab, setActiveTab] = useState<"ALL" | "OFF STAGE" | "ON STAGE" | "GENERAL" | "SPECIAL">("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch results from API
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/public/results")
        if (res.ok) {
          const data = await res.json()
          setTeams(data.teams || [])
          setTopStudents(data.topStudents || [])
          setResults(data.detailedResults || [])
          setHasAnyResults(Boolean(data.hasAnyResults))
          if (data.totalEvents) setTotalEvents(data.totalEvents)
          if (data.totalParticipants) setTotalParticipants(data.totalParticipants)
        }
      } catch (err) {
        console.error("Failed to load fest results:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Top 3 Podium mapping:
  // 1st in Middle, 2nd on Right, 3rd on Left.
  // If no results, default: Telos (1st/middle), Ethos (2nd/right), Thymos (3rd/left)
  const firstTeam = teams[0] || {
    id: "1",
    name: "Telos",
    slug: "GRP1",
    color_hex: "#2563eb",
    offStage: 0,
    onStage: 0,
    general: 0,
    special: 0,
    penalty: 0,
    total: 0,
    rank: 1,
  }

  const secondTeam = teams[1] || {
    id: "2",
    name: "Ethos",
    slug: "GRP2",
    color_hex: "#d97706",
    offStage: 0,
    onStage: 0,
    general: 0,
    special: 0,
    penalty: 0,
    total: 0,
    rank: 2,
  }

  const thirdTeam = teams[2] || {
    id: "3",
    name: "Thymos",
    slug: "GRP3",
    color_hex: "#059669",
    offStage: 0,
    onStage: 0,
    general: 0,
    special: 0,
    penalty: 0,
    total: 0,
    rank: 3,
  }

  // Group participants under their respective event
  const groupedEvents = useMemo(() => {
    const map = new Map<string, GroupedEvent>()

    results.forEach((item) => {
      const key = item.event_id || item.event_code || item.event_name
      if (!map.has(key)) {
        map.set(key, {
          eventId: item.event_id,
          eventCode: item.event_code,
          eventName: item.event_name,
          category: item.category,
          participants: [],
        })
      }
      map.get(key)!.participants.push(item)
    })

    const eventsList = Array.from(map.values())

    // Sort events by event code
    eventsList.sort((a, b) => (a.eventCode || "").localeCompare(b.eventCode || ""))

    return eventsList
  }, [results])

  // Filtered grouped events by category tab & search query
  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    return groupedEvents
      .map((ev) => {
        const matchesCategory = activeTab === "ALL" || ev.category === activeTab
        if (!matchesCategory) return null

        if (!q) return ev

        const eventMatches =
          (ev.eventCode || "").toLowerCase().includes(q) ||
          (ev.eventName || "").toLowerCase().includes(q)

        const matchingParticipants = ev.participants.filter(
          (p) =>
            (p.chest_no || "").toLowerCase().includes(q) ||
            (p.student_name || "").toLowerCase().includes(q) ||
            (p.team_name || "").toLowerCase().includes(q)
        )

        if (eventMatches) {
          return ev
        } else if (matchingParticipants.length > 0) {
          return {
            ...ev,
            participants: matchingParticipants,
          }
        }

        return null
      })
      .filter((ev): ev is GroupedEvent => ev !== null)
  }, [groupedEvents, activeTab, searchQuery])

  // Scroll to results section handler
  const handleScrollToResults = () => {
    const el = document.getElementById("results-section")
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-900 font-['Anek_Malayalam',sans-serif] selection:bg-cyan-100 selection:text-cyan-900 overflow-x-hidden">
      {/* Background Ambient Gradients - Light Mode */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] sm:w-[850px] rounded-full bg-gradient-to-br from-cyan-200/50 via-blue-100/40 to-transparent blur-[120px]" />
        <div className="absolute top-[40%] -left-36 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-amber-100/50 via-teal-100/40 to-transparent blur-[130px]" />
        <div className="absolute top-[65%] -right-36 h-[560px] w-[560px] rounded-full bg-gradient-to-bl from-cyan-100/60 via-indigo-100/40 to-transparent blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#0f172a08_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* FULL SCREEN HERO SECTION */}
      <section className="relative z-10 flex min-h-screen w-full flex-col justify-between px-4 sm:px-6 lg:px-8 py-5">
        {/* Top Header Bar */}
        <header className="w-full max-w-7xl mx-auto flex items-center justify-between pt-2">
          {/* Logo & Brand Mark */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
              <div className="relative size-12 sm:size-14 rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white p-1 backdrop-blur-md">
                <Image
                  src="/logo.png"
                  alt="Wafy Arts Fest Logo"
                  width={56}
                  height={56}
                  className="size-full object-contain"
                  priority
                />
              </div>
              <div>
                <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
                  WAFY CAMPUS KALIKAVU
                </div>
                <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-cyan-700 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-cyan-600 animate-pulse" />
                  Arts Fest 2026
                </div>
              </div>
            </Link>
          </div>

          {/* Top Right Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/schedule"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs backdrop-blur-md transition-all hover:bg-slate-100 hover:text-slate-900"
            >
              <Calendar className="size-3.5 text-cyan-600" />
              Schedule
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-cyan-600/20 transition-all hover:shadow-lg hover:shadow-cyan-600/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Dashboard</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </header>

        {/* HERO CENTERPIECE: Clean Text Fading Animation */}
        <div className="relative flex flex-1 flex-col items-center justify-center text-center my-auto py-8">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className="max-w-4xl mx-auto flex flex-col items-center"
          >
            {/* Main Prominent Title */}
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight uppercase leading-[1.02]">
              <span className="bg-gradient-to-b from-slate-950 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                Wafy Campus
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-700 via-blue-600 to-teal-700 bg-clip-text text-transparent drop-shadow-sm">
                Arts Fest
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 max-w-2xl text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed font-medium">
              Live team standings, category points, and item-wise participant evaluations in real-time.
            </p>

            {/* Metric Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-bold">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5 backdrop-blur-md shadow-xs text-slate-800">
                <Crown className="size-4 text-amber-500" />
                <span>3 Contending Teams</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5 backdrop-blur-md shadow-xs text-slate-800">
                <Flame className="size-4 text-cyan-600" />
                <span>{totalEvents} Events</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5 backdrop-blur-md shadow-xs text-slate-800">
                <Award className="size-4 text-emerald-600" />
                <span>{totalParticipants}+ Participants</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* BOTTOM: Animated Scroll Down Button */}
        <div className="w-full flex flex-col items-center justify-center pb-4 pt-2">
          <motion.button
            onClick={handleScrollToResults}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="group flex flex-col items-center gap-2.5 focus:outline-none cursor-pointer"
          >
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-cyan-700 transition-colors">
              Explore Results & Standings
            </span>
            <div className="flex size-12 items-center justify-center rounded-full border border-slate-200 bg-white text-cyan-600 shadow-md shadow-slate-200/60 backdrop-blur-md transition-all group-hover:border-cyan-400 group-hover:text-cyan-700 group-hover:shadow-lg">
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronDown className="size-6" />
              </motion.div>
            </div>
          </motion.button>
        </div>
      </section>

      {/* ========================================================
          RESULTS SECTION: PODIUM & OVERALL LEADERBOARD
      ======================================================== */}
      <section id="results-section" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Overall Team Standings
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            {hasAnyResults
              ? "Live cumulative points across On-Stage, Off-Stage, General, and Special categories."
              : "Showing current seed positions. As results are evaluated, podium positions and scores update live."}
          </p>
        </div>

        {/* 3D PODIUM DISPLAY */}
        {/* Top team in MIDDLE, 2nd on LEFT, 3rd on RIGHT */}
        <div className="relative mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-8 items-end max-w-5xl mx-auto">
            {/* LEFT: 2ND PLACE TEAM (Little below 1st) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative flex flex-col items-center order-2 md:order-1"
            >
              {/* Team Pill & Avatar */}
              <div className="relative mb-3 flex flex-col items-center text-center">
                <div
                  className="flex size-14 sm:size-16 items-center justify-center rounded-2xl border-2 shadow-md mb-2 bg-white"
                  style={{
                    borderColor: secondTeam.color_hex,
                    boxShadow: `0 4px 20px ${secondTeam.color_hex}25`,
                  }}
                >
                  <Medal className="size-7 sm:size-8" style={{ color: secondTeam.color_hex }} />
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-300 px-3 py-0.5 text-[11px] font-black text-slate-800 mb-1">
                  🥈 2ND PLACE
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">{secondTeam.name}</h3>
              </div>

              {/* Pedestal Block */}
              <div className="w-full rounded-3xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/50 flex flex-col justify-between min-h-[250px]">
                <div className="text-center pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Score</div>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 mt-1">
                    {secondTeam.total}
                    <span className="text-xs text-slate-500 font-sans ml-1">pts</span>
                  </div>
                </div>

                {/* Score breakdown tags */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                  <div className="rounded-xl bg-slate-50 p-2 text-center border border-slate-100">
                    <span className="text-slate-500 block text-[10px]">Off Stage</span>
                    <span className="font-bold text-slate-800 font-mono">{secondTeam.offStage}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2 text-center border border-slate-100">
                    <span className="text-slate-500 block text-[10px]">On Stage</span>
                    <span className="font-bold text-slate-800 font-mono">{secondTeam.onStage}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* MIDDLE: 1ST PLACE CHAMPION (TALLEST) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative flex flex-col items-center order-1 md:order-2 -mt-6 sm:-mt-10"
            >
              {/* Crown & Champion Badge */}
              <div className="relative mb-3 flex flex-col items-center text-center">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 opacity-40 blur-lg animate-pulse" />
                  <div
                    className="relative flex size-20 sm:size-24 items-center justify-center rounded-3xl border-2 shadow-xl mb-2 bg-gradient-to-br from-amber-50 to-white"
                    style={{
                      borderColor: "#F59E0B",
                      boxShadow: "0 8px 30px rgba(245,158,11,0.25)",
                    }}
                  >
                    <Crown className="size-10 sm:size-12 text-amber-500" />
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3.5 py-1 text-xs font-black text-amber-900 shadow-xs mb-1">
                  👑 1ST PLACE
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{firstTeam.name}</h3>
              </div>

              {/* Pedestal Block - Tallest */}
              <div className="w-full rounded-3xl border-2 border-amber-300/80 bg-gradient-to-b from-amber-50/60 via-white to-white p-6 shadow-xl shadow-amber-500/10 flex flex-col justify-between min-h-[280px]">
                <div className="text-center pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center justify-center gap-1">
                    Total Score
                  </div>
                  <div className="text-4xl sm:text-5xl font-black font-mono text-amber-700 mt-1">
                    {firstTeam.total}
                    <span className="text-sm text-slate-500 font-sans ml-1">pts</span>
                  </div>
                </div>

                {/* Score breakdown tags */}
                <div className="grid grid-cols-2 gap-2 mt-5 pt-3 border-t border-amber-200/60 text-xs">
                  <div className="rounded-xl bg-amber-50/70 p-2.5 text-center border border-amber-200/50">
                    <span className="text-amber-800 block text-[10px]">Off Stage</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{firstTeam.offStage}</span>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 p-2.5 text-center border border-amber-200/50">
                    <span className="text-amber-800 block text-[10px]">On Stage</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{firstTeam.onStage}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* RIGHT: 3RD PLACE TEAM (Little below 1st) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative flex flex-col items-center order-3"
            >
              {/* Team Pill & Avatar */}
              <div className="relative mb-3 flex flex-col items-center text-center">
                <div
                  className="flex size-14 sm:size-16 items-center justify-center rounded-2xl border-2 shadow-md mb-2 bg-white"
                  style={{
                    borderColor: thirdTeam.color_hex,
                    boxShadow: `0 4px 20px ${thirdTeam.color_hex}25`,
                  }}
                >
                  <Medal className="size-7 sm:size-8" style={{ color: thirdTeam.color_hex }} />
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-[11px] font-black text-emerald-800 mb-1">
                  🥉 3RD PLACE
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">{thirdTeam.name}</h3>
              </div>

              {/* Pedestal Block */}
              <div className="w-full rounded-3xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/50 flex flex-col justify-between min-h-[220px]">
                <div className="text-center pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Score</div>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 mt-1">
                    {thirdTeam.total}
                    <span className="text-xs text-slate-500 font-sans ml-1">pts</span>
                  </div>
                </div>

                {/* Score breakdown tags */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                  <div className="rounded-xl bg-slate-50 p-2 text-center border border-slate-100">
                    <span className="text-slate-500 block text-[10px]">Off Stage</span>
                    <span className="font-bold text-slate-800 font-mono">{thirdTeam.offStage}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2 text-center border border-slate-100">
                    <span className="text-slate-500 block text-[10px]">On Stage</span>
                    <span className="font-bold text-slate-800 font-mono">{thirdTeam.onStage}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* OVERALL TEAM SCORES TABLE */}
        <div className="w-full max-w-5xl mx-auto rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-lg shadow-slate-200/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Layers className="size-4 text-cyan-600" />
                Category Points Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed scores by category for all contending teams
              </p>
            </div>
            <div className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              3 Teams • Official Points
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold bg-slate-50/50">
                  <th className="py-3 px-3 text-center">Rank</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-3 text-center">Off Stage</th>
                  <th className="py-3 px-3 text-center">On Stage</th>
                  <th className="py-3 px-3 text-center">General</th>
                  <th className="py-3 px-3 text-center">Special</th>
                  <th className="py-3 px-3 text-center">Penalty</th>
                  <th className="py-3 px-4 text-right">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {teams.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-3 text-center">
                      <span
                        className={`inline-flex size-7 items-center justify-center rounded-xl font-mono text-xs font-black ${
                          idx === 0
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : idx === 1
                            ? "bg-slate-200 text-slate-800 border border-slate-300"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="size-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: t.color_hex }}
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-base leading-tight">{t.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center font-mono text-slate-700">{t.offStage}</td>
                    <td className="py-4 px-3 text-center font-mono text-slate-700">{t.onStage}</td>
                    <td className="py-4 px-3 text-center font-mono text-slate-700">{t.general}</td>
                    <td className="py-4 px-3 text-center font-mono text-slate-700">{t.special}</td>
                    <td className="py-4 px-3 text-center font-mono text-rose-600 font-bold">
                      {t.penalty > 0 ? `-${t.penalty}` : "0"}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-mono text-xl sm:text-2xl font-black text-slate-900">
                        {t.total}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================================================
          TOP STUDENTS OF THE FEST (PODIUM & STANDINGS)
      ======================================================== */}
      <section id="top-students-section" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-900 mb-3 shadow-xs">
            <Sparkles className="size-3.5 text-amber-600" />
            <span>Individual Champions</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Top Students of the Fest
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Festival individual toppers with cumulative points across all published competitions.
          </p>
        </div>

        {/* 3D PODIUM FOR TOP 3 STUDENTS */}
        {/* Top student in MIDDLE, 2nd on LEFT, 3rd on RIGHT */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-end max-w-5xl mx-auto">
            {/* LEFT: 2ND PLACE TOP SCORER */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative flex flex-col items-center order-2 md:order-1"
            >
              {/* Animated Silver / Cyan Glowing Border Wrapper */}
              <div className="w-full rounded-3xl p-[2.5px] bg-gradient-to-tr from-cyan-400 via-slate-300 to-blue-500 shadow-[0_0_30px_rgba(6,182,212,0.25)] animate-pulse">
                <div className="w-full rounded-[22px] bg-white p-5 sm:p-6 flex flex-col items-center justify-between text-center min-h-[370px]">
                  {/* Standing Badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-300 px-3 py-0.5 text-[11px] font-black text-slate-800 mb-3 shadow-xs">
                    🥈 2ND SCORER
                  </div>

                  {/* Student Image */}
                  <div className="relative size-24 sm:size-28 rounded-2xl overflow-hidden border-2 border-cyan-400/80 shadow-md bg-slate-50 flex items-center justify-center shrink-0">
                    {topStudents[1]?.image_link ? (
                      <img
                        src={getStudentPhotoUrl(topStudents[1].image_link) || ""}
                        alt={topStudents[1].name}
                        className="size-full object-cover"
                        onError={(e) => {
                          // Fallback to avatar icon on image load failure
                          (e.target as HTMLElement).style.display = "none"
                        }}
                      />
                    ) : (
                      <User className="size-12 text-slate-300" />
                    )}
                  </div>

                  {/* Student Name & Chest */}
                  <div className="mt-3">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                      {topStudents[1]?.name || (topStudents.length === 0 ? "Awaiting Results" : "Top Scorer #2")}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                      <span className="font-mono text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        #{topStudents[1]?.chest_no || "—"}
                      </span>
                      {topStudents[1]?.team_name && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-800"
                          style={{
                            backgroundColor: `${topStudents[1].team_color}20`,
                            borderColor: topStudents[1].team_color,
                            borderWidth: 1,
                          }}
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: topStudents[1].team_color }}
                          />
                          {topStudents[1].team_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total Points */}
                  <div className="mt-3 pt-3 border-t border-slate-100 w-full">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Total Points
                    </div>
                    <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 mt-0.5">
                      {topStudents[1]?.total_points || 0}
                      <span className="text-xs text-slate-500 font-sans ml-1">pts</span>
                    </div>
                  </div>

                  {/* Category Breakdown: Off Stage & On Stage */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 w-full text-xs">
                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-bold block">Off Stage</span>
                      <span className="font-mono font-black text-slate-800 text-sm">
                        {topStudents[1]?.off_stage_points || 0} pts
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-bold block">On Stage</span>
                      <span className="font-mono font-black text-slate-800 text-sm">
                        {topStudents[1]?.on_stage_points || 0} pts
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* MIDDLE: 1ST PLACE CHAMPION TOP SCORER (TALLEST) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative flex flex-col items-center order-1 md:order-2 -mt-6 sm:-mt-10"
            >
              {/* Animated Gold Glowing Border Wrapper */}
              <div className="w-full rounded-3xl p-[3px] bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_35px_rgba(245,158,11,0.35)] animate-pulse">
                <div className="w-full rounded-[22px] bg-gradient-to-b from-amber-50/70 via-white to-white p-6 sm:p-7 flex flex-col items-center justify-between text-center min-h-[420px]">
                  {/* Standing Badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3.5 py-1 text-xs font-black text-amber-900 shadow-xs mb-3">
                    👑 1ST SCORER
                  </div>

                  {/* Student Image (Big) */}
                  <div className="relative size-28 sm:size-32 rounded-3xl overflow-hidden border-3 border-amber-400 shadow-xl bg-amber-50 flex items-center justify-center shrink-0">
                    {topStudents[0]?.image_link ? (
                      <img
                        src={getStudentPhotoUrl(topStudents[0].image_link) || ""}
                        alt={topStudents[0].name}
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none"
                        }}
                      />
                    ) : (
                      <User className="size-14 text-amber-400" />
                    )}
                  </div>

                  {/* Student Name & Chest */}
                  <div className="mt-3">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                      {topStudents[0]?.name || (topStudents.length === 0 ? "Awaiting Results" : "Top Scorer #1")}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                      <span className="font-mono text-xs font-extrabold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-md border border-amber-300">
                        #{topStudents[0]?.chest_no || "—"}
                      </span>
                      {topStudents[0]?.team_name && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-slate-800"
                          style={{
                            backgroundColor: `${topStudents[0].team_color}20`,
                            borderColor: topStudents[0].team_color,
                            borderWidth: 1,
                          }}
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: topStudents[0].team_color }}
                          />
                          {topStudents[0].team_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total Points */}
                  <div className="mt-3 pt-3 border-t border-amber-200/60 w-full">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                      Total Points
                    </div>
                    <div className="text-4xl sm:text-5xl font-black font-mono text-amber-700 mt-0.5">
                      {topStudents[0]?.total_points || 0}
                      <span className="text-sm font-sans font-bold text-slate-500 ml-1">pts</span>
                    </div>
                  </div>

                  {/* Category Breakdown: Off Stage & On Stage */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-amber-200/50 w-full text-xs">
                    <div className="rounded-xl bg-amber-50/80 p-2.5 border border-amber-200/60">
                      <span className="text-[10px] text-amber-800 font-bold block">Off Stage</span>
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {topStudents[0]?.off_stage_points || 0} pts
                      </span>
                    </div>
                    <div className="rounded-xl bg-amber-50/80 p-2.5 border border-amber-200/60">
                      <span className="text-[10px] text-amber-800 font-bold block">On Stage</span>
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {topStudents[0]?.on_stage_points || 0} pts
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* RIGHT: 3RD PLACE TOP SCORER */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative flex flex-col items-center order-3"
            >
              {/* Animated Bronze / Emerald Glowing Border Wrapper */}
              <div className="w-full rounded-3xl p-[2.5px] bg-gradient-to-tr from-emerald-400 via-teal-300 to-emerald-600 shadow-[0_0_30px_rgba(16,185,129,0.25)] animate-pulse">
                <div className="w-full rounded-[22px] bg-white p-5 sm:p-6 flex flex-col items-center justify-between text-center min-h-[360px]">
                  {/* Standing Badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-[11px] font-black text-emerald-800 mb-3 shadow-xs">
                    🥉 3RD SCORER
                  </div>

                  {/* Student Image */}
                  <div className="relative size-24 sm:size-28 rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-md bg-slate-50 flex items-center justify-center shrink-0">
                    {topStudents[2]?.image_link ? (
                      <img
                        src={getStudentPhotoUrl(topStudents[2].image_link) || ""}
                        alt={topStudents[2].name}
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none"
                        }}
                      />
                    ) : (
                      <User className="size-12 text-slate-300" />
                    )}
                  </div>

                  {/* Student Name & Chest */}
                  <div className="mt-3">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                      {topStudents[2]?.name || (topStudents.length === 0 ? "Awaiting Results" : "Top Scorer #3")}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                      <span className="font-mono text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        #{topStudents[2]?.chest_no || "—"}
                      </span>
                      {topStudents[2]?.team_name && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-800"
                          style={{
                            backgroundColor: `${topStudents[2].team_color}20`,
                            borderColor: topStudents[2].team_color,
                            borderWidth: 1,
                          }}
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: topStudents[2].team_color }}
                          />
                          {topStudents[2].team_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total Points */}
                  <div className="mt-3 pt-3 border-t border-slate-100 w-full">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Total Points
                    </div>
                    <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 mt-0.5">
                      {topStudents[2]?.total_points || 0}
                      <span className="text-xs text-slate-500 font-sans ml-1">pts</span>
                    </div>
                  </div>

                  {/* Category Breakdown: Off Stage & On Stage */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 w-full text-xs">
                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-bold block">Off Stage</span>
                      <span className="font-mono font-black text-slate-800 text-sm">
                        {topStudents[2]?.off_stage_points || 0} pts
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-bold block">On Stage</span>
                      <span className="font-mono font-black text-slate-800 text-sm">
                        {topStudents[2]?.on_stage_points || 0} pts
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========================================================
          ITEM-WISE CATEGORY RESULTS TABS & GROUPED EVENT CARDS
          (Each event shown ONCE, with all its participants listed underneath!)
      ======================================================== */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Event & Individual Results
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Select a category tab to view events and all participant evaluations.
          </p>
        </div>

        {/* Category Tabs & Search Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl border border-slate-200/90 bg-white/90 backdrop-blur-xl shadow-xs">
            {(
              [
                { id: "ALL", label: "All Items" },
                { id: "OFF STAGE", label: "Off Stage" },
                { id: "ON STAGE", label: "On Stage" },
                { id: "GENERAL", label: "General" },
                { id: "SPECIAL", label: "Special" },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Chest #, Student, Event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 backdrop-blur-xl focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600 shadow-xs transition-all"
            />
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-6 px-1">
          <span>
            Showing <strong className="text-slate-900">{filteredEvents.length}</strong> events in{" "}
            <strong className="text-cyan-700">{activeTab}</strong>
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-cyan-700 hover:underline cursor-pointer font-bold"
            >
              Clear search
            </button>
          )}
        </div>

        {/* GROUPED EVENTS LIST: An event header, and all its participants underneath */}
        {filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <Award className="mx-auto size-12 text-slate-300 mb-3" />
            <h4 className="text-base font-bold text-slate-800">No Events Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No event or participant matched "${searchQuery}". Try a different search term.`
                : "No items registered under this category yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredEvents.map((ev) => (
              <div
                key={ev.eventId || ev.eventCode}
                className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/50 transition-all hover:border-cyan-400/50"
              >
                {/* Event Header Bar (shown ONCE per event) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-xl shadow-xs">
                      {ev.eventCode || "EVENT"}
                    </span>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                        {ev.eventName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>{ev.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <Users className="size-3 text-cyan-600" />
                          {ev.participants.length} Participants
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                      {ev.category}
                    </span>
                  </div>
                </div>

                {/* Participants Under This Event */}
                <div className="p-3 sm:p-5">
                  {/* Desktop / Tablet Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500 font-bold bg-slate-50/50">
                          <th className="py-2.5 px-3 text-center w-12">Sl</th>
                          <th className="py-2.5 px-3">Chest No</th>
                          <th className="py-2.5 px-3">Participant Name</th>
                          <th className="py-2.5 px-3">Team</th>
                          <th className="py-2.5 px-3 text-center">Position</th>
                          <th className="py-2.5 px-3 text-center">Grade</th>
                          <th className="py-2.5 px-3 text-right">Marks / Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {ev.participants.map((p, pIdx) => (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 text-center text-slate-400 font-mono">
                              {pIdx + 1}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                              <span className="bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg">
                                #{p.chest_no}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-900 font-bold text-sm">
                              {p.student_name}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-slate-800"
                                style={{
                                  backgroundColor: `${p.team_color}18`,
                                  borderColor: `${p.team_color}60`,
                                  borderWidth: 1,
                                }}
                              >
                                <span
                                  className="size-1.5 rounded-full"
                                  style={{ backgroundColor: p.team_color }}
                                />
                                {p.team_name}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {p.result_position ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[11px] font-black ${
                                    p.result_position === "FIRST"
                                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                                      : p.result_position === "SECOND"
                                      ? "bg-slate-200 text-slate-800 border border-slate-300"
                                      : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                  }`}
                                >
                                  🏆 {p.result_position}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {p.performance_grade ? (
                                <span
                                  className={`rounded-lg px-2 py-0.5 font-mono text-[11px] font-black ${
                                    p.performance_grade === "A+"
                                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                                      : p.performance_grade === "A"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : p.performance_grade === "B"
                                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                                      : "bg-purple-100 text-purple-800 border border-purple-300"
                                  }`}
                                >
                                  Grade {p.performance_grade}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {p.points_earned > 0 ? (
                                <span className="font-mono text-sm font-black text-cyan-700">
                                  +{p.points_earned} pts
                                </span>
                              ) : p.has_result ? (
                                <span className="text-xs text-slate-500 font-semibold">
                                  Completed
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 flex items-center justify-end gap-1 font-sans">
                                  <Clock className="size-3 text-slate-400" />
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View (< sm screens) */}
                  <div className="grid grid-cols-1 gap-2.5 sm:hidden">
                    {ev.participants.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 space-y-2 shadow-xs"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-lg font-mono text-xs font-black text-slate-900">
                              #{p.chest_no}
                            </span>
                            <span className="font-bold text-slate-900 text-sm">
                              {p.student_name}
                            </span>
                          </div>

                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold text-slate-800 shrink-0"
                            style={{
                              backgroundColor: `${p.team_color}20`,
                              borderColor: `${p.team_color}60`,
                              borderWidth: 1,
                            }}
                          >
                            <span
                              className="size-1 rounded-full"
                              style={{ backgroundColor: p.team_color }}
                            />
                            {p.team_name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 text-xs">
                          <div className="flex items-center gap-1.5">
                            {p.result_position && (
                              <span className="font-black text-amber-800 text-[11px] bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                                🏆 {p.result_position}
                              </span>
                            )}
                            {p.performance_grade && (
                              <span className="font-mono font-bold text-cyan-800 text-[11px] bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                                Grade {p.performance_grade}
                              </span>
                            )}
                          </div>

                          <div>
                            {p.points_earned > 0 ? (
                              <span className="font-mono text-xs font-black text-cyan-700">
                                +{p.points_earned} pts
                              </span>
                            ) : p.has_result ? (
                              <span className="text-[10px] text-slate-500 font-medium">Completed</span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-10 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={28} height={28} className="size-7 object-contain opacity-90" />
            <span className="text-slate-800 font-bold">Wafy Campus Kalikavu Arts Fest 2026</span>
          </div>

          <div className="flex items-center gap-6 font-semibold text-slate-600">
            <Link href="/schedule" className="hover:text-cyan-700 transition-colors">
              Schedule
            </Link>
            <Link href="/login" className="hover:text-cyan-700 transition-colors">
              Portal Login
            </Link>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:text-cyan-700 transition-colors cursor-pointer"
            >
              Back to Top ↑
            </button>
          </div>
        </div>
        <p className="mt-6 text-[11px] text-slate-500">
          Official Arts Fest Portal • Designed for Students, Judges & Festival Command
        </p>
      </footer>
    </div>
  )
}
