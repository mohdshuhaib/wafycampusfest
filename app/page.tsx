"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import Hero3DCanvasScroller from "@/components/landing/Hero3DCanvasScroller"
import Vector3DBackground from "@/components/landing/Vector3DBackground"
import {
  Trophy,
  Medal,
  Award,
  Crown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  stage_type?: string
  grade_type?: string
  points_earned: number
  performance_grade: string | null
  result_position: string | null
  has_result: boolean
  image_link?: string | null
  is_team_entry?: boolean
  group_label?: string | null
  display_name?: string | null
  is_multi_group?: boolean
}

interface GroupedEvent {
  eventId: string
  eventCode: string
  eventName: string
  category: "ON STAGE" | "OFF STAGE" | "GENERAL" | "SPECIAL"
  stageType?: string
  gradeType?: string
  isTeamEvent: boolean
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

function StudentAvatar({
  imageLink,
  name,
  className = "size-full object-cover",
  fallbackIconSize = "size-10",
}: {
  imageLink?: string | null
  name?: string
  className?: string
  fallbackIconSize?: string
}) {
  const [useProxy, setUseProxy] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  const directUrl = getStudentPhotoUrl(imageLink)
  const src = useProxy && directUrl ? `/api/image-proxy?url=${encodeURIComponent(directUrl)}` : directUrl

  if (!src || loadFailed) {
    return <User className={`${fallbackIconSize} text-slate-300`} />
  }

  return (
    <img
      src={src}
      alt={name || "Student"}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => {
        if (!useProxy) {
          setUseProxy(true)
        } else {
          setLoadFailed(true)
        }
      }}
    />
  )
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

  // Programme pagination / carousel state
  const [currentEventIndex, setCurrentEventIndex] = useState(0)

  // Reset index when tab or search query changes
  useEffect(() => {
    setCurrentEventIndex(0)
  }, [activeTab, searchQuery])

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
        const isTeam =
          Boolean(item.is_team_entry) ||
          item.category === "GENERAL" ||
          item.category === "SPECIAL" ||
          item.grade_type === "C" ||
          item.grade_type === "D"

        map.set(key, {
          eventId: item.event_id,
          eventCode: item.event_code,
          eventName: item.event_name,
          category: item.category,
          stageType: item.stage_type,
          gradeType: item.grade_type,
          isTeamEvent: isTeam,
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
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-900 font-['Anek_Malayalam',sans-serif] selection:bg-cyan-100 selection:text-cyan-900">
      {/* ========================================================
          MODERN VECTOR & 3D ARCHITECTURAL GRID BACKGROUND
          ======================================================== */}
      <Vector3DBackground />

      {/* ========================================================
          FULL SCREEN 3D CINEMATIC SCROLL REVEAL HERO
          Canvas-based 300-frames video scrubbing experience
          ======================================================== */}
      <Hero3DCanvasScroller
        totalEvents={totalEvents}
        totalParticipants={totalParticipants}
        onScrollToResults={handleScrollToResults}
      />

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

                {/* Score breakdown tags across all 4 categories */}
                <div className="grid grid-cols-4 gap-1.5 mt-4 pt-3 border-t border-slate-100 text-[10px]">
                  <div className="rounded-xl bg-slate-50 p-1.5 text-center border border-slate-100">
                    <span className="text-slate-500 block text-[9px]">Off</span>
                    <span className="font-bold text-slate-800 font-mono text-xs">{secondTeam.offStage}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-1.5 text-center border border-slate-100">
                    <span className="text-slate-500 block text-[9px]">On</span>
                    <span className="font-bold text-slate-800 font-mono text-xs">{secondTeam.onStage}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-1.5 text-center border border-slate-100">
                    <span className="text-slate-500 block text-[9px]">Gen</span>
                    <span className="font-bold text-slate-800 font-mono text-xs">{secondTeam.general}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-1.5 text-center border border-slate-100">
                    <span className="text-slate-500 block text-[9px]">Spc</span>
                    <span className="font-bold text-slate-800 font-mono text-xs">{secondTeam.special}</span>
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

                {/* Score breakdown tags across all 4 categories */}
                <div className="grid grid-cols-4 gap-1.5 mt-5 pt-3 border-t border-amber-200/60 text-xs">
                  <div className="rounded-xl bg-amber-50/70 p-1.5 text-center border border-amber-200/50">
                    <span className="text-amber-800 block text-[9px] font-bold">Off</span>
                    <span className="font-bold text-slate-900 font-mono text-xs">{firstTeam.offStage}</span>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 p-1.5 text-center border border-amber-200/50">
                    <span className="text-amber-800 block text-[9px] font-bold">On</span>
                    <span className="font-bold text-slate-900 font-mono text-xs">{firstTeam.onStage}</span>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 p-1.5 text-center border border-amber-200/50">
                    <span className="text-amber-800 block text-[9px] font-bold">Gen</span>
                    <span className="font-bold text-slate-900 font-mono text-xs">{firstTeam.general}</span>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 p-1.5 text-center border border-amber-200/50">
                    <span className="text-amber-800 block text-[9px] font-bold">Spc</span>
                    <span className="font-bold text-slate-900 font-mono text-xs">{firstTeam.special}</span>
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

                {/* Score breakdown tags across all 4 categories */}
                <div className="grid grid-cols-4 gap-1.5 mt-4 pt-3 border-t border-slate-100 text-[10px]">
                  <div className="rounded-xl bg-slate-50 p-1.5 text-center border border-slate-100">
                    <span className="text-slate-500 block text-[9px]">Off</span>
                    <span className="font-bold text-slate-800 font-mono text-xs">{thirdTeam.offStage}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-1.5 text-center border border-slate-100">
                    <span className="text-slate-500 block text-[9px]">On</span>
                    <span className="font-bold text-slate-800 font-mono text-xs">{thirdTeam.onStage}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-1.5 text-center border border-slate-100">
                    <span className="text-slate-500 block text-[9px]">Gen</span>
                    <span className="font-bold text-slate-800 font-mono text-xs">{thirdTeam.general}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-1.5 text-center border border-slate-100">
                    <span className="text-slate-500 block text-[9px]">Spc</span>
                    <span className="font-bold text-slate-800 font-mono text-xs">{thirdTeam.special}</span>
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
              <div className="w-full rounded-3xl p-[3px] lightning-silver">
                <div className="w-full rounded-[22px] bg-white p-5 sm:p-6 flex flex-col items-center justify-between text-center min-h-[370px]">
                  {/* Standing Badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-300 px-3 py-0.5 text-[11px] font-black text-slate-800 mb-3 shadow-xs">
                    🥈 2ND SCORER
                  </div>

                  {/* Student Image */}
                  <div className="relative size-24 sm:size-28 rounded-2xl overflow-hidden border-2 border-cyan-400/80 shadow-md bg-slate-50 flex items-center justify-center shrink-0">
                    <StudentAvatar
                      imageLink={topStudents[1]?.image_link}
                      name={topStudents[1]?.name}
                      fallbackIconSize="size-12"
                    />
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
              <div className="w-full rounded-3xl p-[3.5px] lightning-gold">
                <div className="w-full rounded-[22px] bg-gradient-to-b from-amber-50/70 via-white to-white p-6 sm:p-7 flex flex-col items-center justify-between text-center min-h-[420px]">
                  {/* Standing Badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3.5 py-1 text-xs font-black text-amber-900 shadow-xs mb-3">
                    👑 1ST SCORER
                  </div>

                  {/* Student Image (Big) */}
                  <div className="relative size-28 sm:size-32 rounded-3xl overflow-hidden border-3 border-amber-400 shadow-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <StudentAvatar
                      imageLink={topStudents[0]?.image_link}
                      name={topStudents[0]?.name}
                      fallbackIconSize="size-14 text-amber-400"
                    />
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
              <div className="w-full rounded-3xl p-[3px] lightning-bronze">
                <div className="w-full rounded-[22px] bg-white p-5 sm:p-6 flex flex-col items-center justify-between text-center min-h-[360px]">
                  {/* Standing Badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-[11px] font-black text-emerald-800 mb-3 shadow-xs">
                    🥉 3RD SCORER
                  </div>

                  {/* Student Image */}
                  <div className="relative size-24 sm:size-28 rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-md bg-slate-50 flex items-center justify-center shrink-0">
                    <StudentAvatar
                      imageLink={topStudents[2]?.image_link}
                      name={topStudents[2]?.name}
                      fallbackIconSize="size-12"
                    />
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

        {/* GROUPED EVENTS LIST: Carousel View with Next/Back and Top 3 Highlights */}
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
        ) : (() => {
          const safeIndex = Math.min(currentEventIndex, Math.max(0, filteredEvents.length - 1))
          const currentEvent = filteredEvents[safeIndex]
          const isFirst = safeIndex === 0
          const isLast = safeIndex >= filteredEvents.length - 1

          const handlePrev = () => {
            if (!isFirst) setCurrentEventIndex(safeIndex - 1)
          }

          const handleNext = () => {
            if (!isLast) setCurrentEventIndex(safeIndex + 1)
          }

          // Separate Top 3 Winners from other participants
          const firstWinners = currentEvent.participants.filter(p => p.result_position === "FIRST")
          const secondWinners = currentEvent.participants.filter(p => p.result_position === "SECOND")
          const thirdWinners = currentEvent.participants.filter(p => p.result_position === "THIRD")
          const topWinners = [...firstWinners, ...secondWinners, ...thirdWinners]
          const topWinnerIds = new Set(topWinners.map(p => p.id))
          const otherParticipants = currentEvent.participants.filter(p => !topWinnerIds.has(p.id))
          const isTeamEvent = currentEvent.isTeamEvent

          return (
            <div className="space-y-6">
              {/* TOP CAROUSEL NAVIGATION CONTROLS */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-slate-200/90 bg-white/95 p-3 sm:p-4 shadow-sm backdrop-blur-md">
                {/* Back / Previous Button */}
                <button
                  onClick={handlePrev}
                  disabled={isFirst}
                  className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer ${
                    isFirst
                      ? "opacity-35 cursor-not-allowed text-slate-400 bg-slate-50 border border-slate-200"
                      : "text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 hover:text-cyan-700 shadow-xs active:scale-95"
                  }`}
                >
                  <ChevronLeft className="size-4" />
                  <span>Previous</span>
                </button>

                {/* Center: Programme Selector & Counter */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                    Programme <strong className="text-cyan-700 font-mono text-sm ml-1">{safeIndex + 1}</strong> of <strong className="font-mono text-sm">{filteredEvents.length}</strong>
                  </span>

                  {/* Dropdown jump-to */}
                  <select
                    value={safeIndex}
                    onChange={(e) => setCurrentEventIndex(Number(e.target.value))}
                    className="max-w-[260px] truncate rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs focus:border-cyan-600 focus:outline-none"
                  >
                    {filteredEvents.map((ev, idx) => (
                      <option key={ev.eventId || ev.eventCode || idx} value={idx}>
                        {idx + 1}. {ev.eventCode} - {ev.eventName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Next Button */}
                <button
                  onClick={handleNext}
                  disabled={isLast}
                  className={`inline-flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-xs font-black transition-all cursor-pointer ${
                    isLast
                      ? "opacity-35 cursor-not-allowed text-slate-400 bg-slate-50 border border-slate-200"
                      : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20 hover:shadow-lg hover:shadow-cyan-600/30 hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {/* ACTIVE PROGRAMME CARD WITH FADE TRANSITION */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentEvent.eventId || currentEvent.eventCode || safeIndex}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/50"
                >
                  {/* Event Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-white p-5 sm:p-6">
                    <div className="flex items-center gap-3.5">
                      <span className="font-mono text-sm font-black text-cyan-800 bg-cyan-50 border border-cyan-200 px-3 py-1.5 rounded-2xl shadow-xs">
                        {currentEvent.eventCode || "EVENT"}
                      </span>
                      <div>
                        <h3 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">
                          {currentEvent.eventName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <span className="font-bold text-cyan-700">
                            {currentEvent.category === "GENERAL"
                              ? `General • ${currentEvent.stageType || "Stage"}`
                              : currentEvent.category === "SPECIAL"
                              ? `Special • ${currentEvent.stageType || "Stage"}`
                              : currentEvent.category}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <Users className="size-3 text-cyan-600" />
                            {currentEvent.participants.length} {isTeamEvent ? (currentEvent.gradeType === "C" || currentEvent.gradeType === "D" ? "Contending Groups" : "Contending Teams") : "Total Participants"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full">
                        {currentEvent.category === "GENERAL"
                          ? `General (${currentEvent.stageType || "Stage"})`
                          : currentEvent.category === "SPECIAL"
                          ? `Special (${currentEvent.stageType || "Stage"})`
                          : currentEvent.category}
                      </span>
                    </div>
                  </div>

                  {/* 1. TOP 3 WINNERS HIGHLIGHT (WITH PHOTOS, MARKS, TEAM) */}
                  {topWinners.length > 0 && (
                    <div className="border-b border-slate-100 bg-gradient-to-b from-amber-50/30 via-slate-50/20 to-white p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Trophy className="size-4 text-amber-500" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          {isTeamEvent ? "Top Winning Teams" : "Top Winners & Highlights"}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {topWinners.map((winner) => {
                          const isFirstPlace = winner.result_position === "FIRST"
                          const isSecondPlace = winner.result_position === "SECOND"
                          const isThirdPlace = winner.result_position === "THIRD"

                          const badgeBg = isFirstPlace
                            ? "bg-amber-100 text-amber-900 border-amber-300"
                            : isSecondPlace
                            ? "bg-slate-200 text-slate-900 border-slate-300"
                            : "bg-emerald-100 text-emerald-900 border-emerald-300"

                          const cardBorder = isFirstPlace
                            ? "border-amber-300/80 bg-gradient-to-b from-amber-50/40 to-white"
                            : isSecondPlace
                            ? "border-cyan-300/80 bg-gradient-to-b from-cyan-50/30 to-white"
                            : "border-emerald-300/80 bg-gradient-to-b from-emerald-50/30 to-white"

                          return (
                            <div
                              key={winner.id}
                              className={`relative flex flex-col items-center text-center rounded-2xl border-2 p-4 shadow-sm transition-all ${cardBorder}`}
                            >
                              {/* Position Badge */}
                              <div
                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-[11px] font-black uppercase tracking-wider mb-3 shadow-xs ${badgeBg}`}
                              >
                                {isFirstPlace ? "👑 1st Place" : isSecondPlace ? "🥈 2nd Place" : "🥉 3rd Place"}
                              </div>

                              {/* Team Emblem or Student Photo */}
                              {isTeamEvent ? (
                                <div
                                  className="relative size-20 sm:size-24 rounded-2xl flex flex-col items-center justify-center text-white font-black shadow-lg mb-3 border-2 border-white/80"
                                  style={{
                                    backgroundColor: winner.team_color,
                                    boxShadow: `0 10px 25px ${winner.team_color}45`,
                                  }}
                                >
                                  <Users className="size-8 sm:size-9 mb-0.5 opacity-90" />
                                  <span className="text-[10px] font-mono tracking-wider uppercase opacity-95">
                                    {winner.group_label || "Team"}
                                  </span>
                                </div>
                              ) : (
                                <div className="relative size-20 sm:size-24 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md bg-white flex items-center justify-center shrink-0 mb-3">
                                  <StudentAvatar
                                    imageLink={winner.image_link}
                                    name={winner.student_name}
                                    fallbackIconSize="size-10"
                                  />
                                </div>
                              )}

                              {/* Student or Team Name */}
                              <h5 className="text-base sm:text-lg font-black text-slate-900 leading-tight uppercase tracking-wide">
                                {isTeamEvent
                                  ? (winner.display_name || (winner.group_label ? `${winner.team_name} (${winner.group_label})` : winner.team_name))
                                  : winner.student_name}
                              </h5>

                              {isTeamEvent ? (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <span
                                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-slate-800"
                                    style={{
                                      backgroundColor: `${winner.team_color}20`,
                                      borderColor: winner.team_color,
                                      borderWidth: 1,
                                    }}
                                  >
                                    <span
                                      className="size-1.5 rounded-full"
                                      style={{ backgroundColor: winner.team_color }}
                                    />
                                    {winner.group_label ? `${winner.team_name} • ${winner.group_label}` : `${winner.team_name} • Contending Team`}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  {winner.chest_no ? (
                                    <span className="font-mono text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                      #{winner.chest_no}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                      Team Entry
                                    </span>
                                  )}
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-800"
                                    style={{
                                      backgroundColor: `${winner.team_color}20`,
                                      borderColor: winner.team_color,
                                      borderWidth: 1,
                                    }}
                                  >
                                    <span
                                      className="size-1.5 rounded-full"
                                      style={{ backgroundColor: winner.team_color }}
                                    />
                                    {winner.team_name}
                                  </span>
                                </div>
                              )}

                              {/* Points & Grade */}
                              <div className="mt-3 pt-3 border-t border-slate-200/60 w-full flex items-center justify-around text-xs">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Grade</span>
                                  <span className="font-mono font-bold text-slate-800 text-xs">
                                    {winner.performance_grade ? `Grade ${winner.performance_grade}` : "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Score</span>
                                  <span className="font-mono font-black text-cyan-700 text-sm">
                                    {winner.points_earned > 0 ? `+${winner.points_earned} pts` : "Nil"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. OTHER PARTICIPANTS / TEAMS TABLE */}
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                        {isTeamEvent
                          ? currentEvent.gradeType === "C" || currentEvent.gradeType === "D"
                            ? topWinners.length > 0
                              ? `Other Contending Groups (${otherParticipants.length})`
                              : `All Contending Groups (${currentEvent.participants.length})`
                            : topWinners.length > 0
                            ? `Other Contending Teams (${otherParticipants.length})`
                            : `All Contending Teams (${currentEvent.participants.length})`
                          : topWinners.length > 0
                          ? `Other Participants (${otherParticipants.length})`
                          : `All Participants (${currentEvent.participants.length})`}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {isTeamEvent ? "Official Team Standings" : "Standard Table View"}
                      </span>
                    </div>

                    {isTeamEvent && otherParticipants.length === 0 ? (
                      <div className="py-8 text-center text-xs font-bold text-slate-500 bg-slate-50/60 rounded-2xl border border-slate-200/70">
                        All contending teams finished in the Top 3 podium standings.
                      </div>
                    ) : (
                      <>
                        {/* Desktop / Tablet Table View */}
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500 font-bold bg-slate-50/50">
                                <th className="py-2.5 px-3 text-center w-12">Sl</th>
                                {isTeamEvent ? (
                                  <th className="py-2.5 px-3">
                                    {currentEvent.gradeType === "C" || currentEvent.gradeType === "D" ? "Contending Group" : "Contending Team"}
                                  </th>
                                ) : (
                                  <>
                                    <th className="py-2.5 px-3">Chest No</th>
                                    <th className="py-2.5 px-3">Participant Name</th>
                                    <th className="py-2.5 px-3">Team</th>
                                  </>
                                )}
                                <th className="py-2.5 px-3 text-center">Standing / Position</th>
                                <th className="py-2.5 px-3 text-center">Grade</th>
                                <th className="py-2.5 px-3 text-right">Marks / Points</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {(otherParticipants.length > 0 ? otherParticipants : currentEvent.participants).map((p, pIdx) => {
                                const rowSl = isTeamEvent && topWinners.length > 0 ? pIdx + 1 + topWinners.length : pIdx + 1

                                return (
                                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">
                                      {rowSl}
                                    </td>
                                    {isTeamEvent ? (
                                      <td className="py-3 px-3">
                                        <div className="flex items-center gap-2.5">
                                          <span
                                            className="size-3.5 rounded-full shrink-0 shadow-xs"
                                            style={{ backgroundColor: p.team_color }}
                                          />
                                          <span className="text-slate-900 font-black text-sm uppercase tracking-wide">
                                            {p.display_name || (p.group_label ? `${p.team_name} (${p.group_label})` : p.team_name)}
                                          </span>
                                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                            {p.group_label || "Team Entry"}
                                          </span>
                                        </div>
                                      </td>
                                    ) : (
                                      <>
                                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                          {p.chest_no ? (
                                            <span className="bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg">
                                              #{p.chest_no}
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 text-xs font-semibold">—</span>
                                          )}
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-2.5">
                                            <div className="relative size-8 rounded-xl overflow-hidden border border-slate-200/90 bg-slate-100 shrink-0 shadow-xs flex items-center justify-center">
                                              <StudentAvatar
                                                imageLink={p.image_link}
                                                name={p.student_name}
                                                fallbackIconSize="size-4"
                                              />
                                            </div>
                                            <span className="text-slate-900 font-bold text-sm">
                                              {p.student_name}
                                            </span>
                                          </div>
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
                                      </>
                                    )}
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
                                        <span className="text-slate-400 font-semibold text-xs">
                                          {isTeamEvent ? (rowSl === 4 ? "4th Place" : "Unranked") : "—"}
                                        </span>
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
                                        <span className="text-xs font-semibold text-slate-400">
                                          Nil
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards View (< sm screens) */}
                        <div className="grid grid-cols-1 gap-2.5 sm:hidden">
                          {(otherParticipants.length > 0 ? otherParticipants : currentEvent.participants).map((p, pIdx) => {
                            const rowSl = isTeamEvent && topWinners.length > 0 ? pIdx + 1 + topWinners.length : pIdx + 1

                            return (
                              <div
                                key={p.id}
                                className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 space-y-2 shadow-xs"
                              >
                                <div className="flex items-start justify-between">
                                  {isTeamEvent ? (
                                    <div className="flex items-center gap-2.5">
                                      <span
                                        className="size-4 rounded-full shrink-0 shadow-xs"
                                        style={{ backgroundColor: p.team_color }}
                                      />
                                      <div>
                                        <span className="font-black text-slate-900 text-sm uppercase tracking-wide">
                                          {p.display_name || (p.group_label ? `${p.team_name} (${p.group_label})` : p.team_name)}
                                        </span>
                                        <div className="text-[10px] text-slate-400 font-semibold">
                                          {p.group_label ? `${p.team_name} • ${p.group_label}` : `Team #${rowSl}`}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2.5">
                                      <div className="relative size-9 rounded-xl overflow-hidden border border-slate-200/90 bg-white shrink-0 shadow-xs flex items-center justify-center">
                                        <StudentAvatar
                                          imageLink={p.image_link}
                                          name={p.student_name}
                                          fallbackIconSize="size-4"
                                        />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          {p.chest_no && (
                                            <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px] font-black text-slate-900">
                                              #{p.chest_no}
                                            </span>
                                          )}
                                          <span className="font-bold text-slate-900 text-sm">
                                            {p.student_name}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold text-slate-800 shrink-0"
                                    style={{
                                      backgroundColor: `${p.team_color}20`,
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
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    {p.result_position ? (
                                      <span className="font-black text-amber-800 text-[11px] bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                                        🏆 {p.result_position}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-medium text-[10px]">
                                        {isTeamEvent ? (rowSl === 4 ? "4th Place" : "Unranked") : "—"}
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
                                      <span className="text-[11px] font-semibold text-slate-400">Nil</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* BOTTOM PROGRAMME NAVIGATION */}
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                    <button
                      onClick={handlePrev}
                      disabled={isFirst}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                        isFirst
                          ? "opacity-35 cursor-not-allowed text-slate-400 bg-white border border-slate-200"
                          : "text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 hover:text-cyan-700 shadow-xs"
                      }`}
                    >
                      <ChevronLeft className="size-3.5" />
                      <span>Previous Programme</span>
                    </button>

                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                      Showing {safeIndex + 1} of {filteredEvents.length}
                    </span>

                    <button
                      onClick={handleNext}
                      disabled={isLast}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                        isLast
                          ? "opacity-35 cursor-not-allowed text-slate-400 bg-white border border-slate-200"
                          : "bg-cyan-700 text-white hover:bg-cyan-800 shadow-xs"
                      }`}
                    >
                      <span>Next Programme</span>
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )
        })()}
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-10 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={28} height={28} className="size-7 object-contain opacity-90" />
            <span className="text-slate-800 font-bold">Wafy Campus Kalikavu Arts Fest 2026-27</span>
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
