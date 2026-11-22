"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  TrendingUp,
  Trophy,
  Globe,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Loader2,
  HelpCircle,
  Zap,
  Layers,
  Medal,
  Shield,
  BarChart2,
} from "lucide-react"

interface Team {
  id: string
  name: string
  slug: string
  color_hex: string
  penalty_points: number
}

interface EventItem {
  id: string
  name: string
  event_code: string
  category: string
  grade_type: string
}

interface ParticipationItem {
  id: string
  event_id: string
  team_id: string
  student_id: string | null
  result_position: string | null
  performance_grade: string | null
  points_earned: number
}

interface TeamStanding {
  team: Team
  rank: number
  totalPoints: number
  earnedPoints: number
  penaltyPoints: number
  leadOverNext: number
  deficitFromFirst: number
}

interface SimulationResult {
  isPossible: boolean
  isAlreadyFirst: boolean
  eventsToPublish: EventItem[]
  eventDetails: Array<{
    event: EventItem
    targetPoints: number
    targetPosition: string | null
    targetGrade: string | null
    competitorPoints: Record<string, number>
    netAdvantage: number
  }>
  projectedTargetScore: number
  projectedLeaderScore: number
  projectedRunnerUpTeam: Team | null
  projectedMargin: number
  currentLeader: Team | null
  currentDeficit: number
  maxPossibleScore: number
  neededScoreToBeat: number
}

export function ResultAnalyseManager({ onPublishChanged }: { onPublishChanged?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [publishedEventIds, setPublishedEventIds] = useState<Set<string>>(new Set())
  const [participations, setParticipations] = useState<ParticipationItem[]>([])

  // Simulator target team selection
  const [selectedTargetTeamId, setSelectedTargetTeamId] = useState<string>("")

  const supabase = createClient()

  // 1. Load Teams, Events, Published IDs & Participations
  const loadData = async () => {
    try {
      setLoading(true)

      const [teamsRes, eventsRes, pubRes, partsRes] = await Promise.all([
        supabase.from("teams").select("*").order("name"),
        supabase.from("events").select("id, name, event_code, category, grade_type").order("name"),
        fetch("/api/admin/publish-event"),
        supabase
          .from("participations")
          .select("id, event_id, team_id, student_id, result_position, performance_grade, points_earned")
          .or("points_earned.gt.0,result_position.not.is.null,performance_grade.not.is.null"),
      ])

      const loadedTeams: Team[] = teamsRes.data || []
      setTeams(loadedTeams)

      const loadedEvents: EventItem[] = eventsRes.data || []
      setEvents(loadedEvents)

      const loadedParts: ParticipationItem[] = partsRes.data || []
      setParticipations(loadedParts)

      let publishedSet = new Set<string>()
      if (pubRes.ok) {
        const pubData = await pubRes.json()
        const pubList = (pubData.events || []).filter((e: any) => e.is_published).map((e: any) => e.id)
        publishedSet = new Set(pubList)
      }
      setPublishedEventIds(publishedSet)

      // Set initial target team if none selected
      if (!selectedTargetTeamId && loadedTeams.length > 0) {
        setSelectedTargetTeamId(loadedTeams[0].id)
      }
    } catch (err: any) {
      console.error("Error loading analysis data:", err)
      toast.error("Failed to load analysis data: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Helper to calculate standings given a set of published event IDs
  const computeStandings = (activeEventIds: Set<string>): TeamStanding[] => {
    if (teams.length === 0) return []

    const teamScores = teams.map((team) => {
      const teamParts = participations.filter(
        (p) => p.team_id === team.id && activeEventIds.has(p.event_id)
      )
      const earned = teamParts.reduce((sum, p) => sum + (p.points_earned || 0), 0)
      const penalty = team.penalty_points || 0
      const total = Math.max(0, earned - penalty)

      return {
        team,
        earnedPoints: earned,
        penaltyPoints: penalty,
        totalPoints: total,
      }
    })

    // Sort descending by totalPoints
    teamScores.sort((a, b) => b.totalPoints - a.totalPoints)

    const firstScore = teamScores[0]?.totalPoints || 0

    return teamScores.map((item, idx) => {
      const nextScore = teamScores[idx + 1]?.totalPoints ?? 0
      return {
        team: item.team,
        rank: idx + 1,
        totalPoints: item.totalPoints,
        earnedPoints: item.earnedPoints,
        penaltyPoints: item.penaltyPoints,
        leadOverNext: Math.max(0, item.totalPoints - nextScore),
        deficitFromFirst: Math.max(0, firstScore - item.totalPoints),
      }
    })
  }

  // 1. Live Published Standings (Current official public ranking)
  const publishedStandings = useMemo(() => {
    return computeStandings(publishedEventIds)
  }, [teams, participations, publishedEventIds])

  // 2. All Marked Standings (Published + All Unpublished marked results)
  const allMarkedStandings = useMemo(() => {
    // All events that have any participation with points_earned > 0 or position/grade
    const markedEventIds = new Set(participations.map((p) => p.event_id))
    return computeStandings(markedEventIds)
  }, [teams, participations])

  // Set default target team to 2nd place in live standings if available
  useEffect(() => {
    if (publishedStandings.length > 1 && !selectedTargetTeamId) {
      setSelectedTargetTeamId(publishedStandings[1].team.id)
    }
  }, [publishedStandings, selectedTargetTeamId])

  // 3. Simulation Analysis: "Make Target Team #1"
  const simulation = useMemo<SimulationResult | null>(() => {
    if (!selectedTargetTeamId || teams.length === 0 || publishedStandings.length === 0) {
      return null
    }

    const targetTeam = teams.find((t) => t.id === selectedTargetTeamId)
    if (!targetTeam) return null

    const currentLeaderStanding = publishedStandings[0]
    const currentLeader = currentLeaderStanding.team
    const currentTargetStanding = publishedStandings.find((s) => s.team.id === targetTeam.id)
    const currentTargetScore = currentTargetStanding?.totalPoints || 0
    const currentLeaderScore = currentLeaderStanding?.totalPoints || 0

    // Check if target team is already #1 in live standings
    if (currentLeader.id === targetTeam.id) {
      const runnerUp = publishedStandings[1]?.team || null
      const runnerUpScore = publishedStandings[1]?.totalPoints || 0

      return {
        isPossible: true,
        isAlreadyFirst: true,
        eventsToPublish: [],
        eventDetails: [],
        projectedTargetScore: currentTargetScore,
        projectedLeaderScore: currentTargetScore,
        projectedRunnerUpTeam: runnerUp,
        projectedMargin: currentTargetScore - runnerUpScore,
        currentLeader,
        currentDeficit: 0,
        maxPossibleScore: currentTargetScore,
        neededScoreToBeat: runnerUpScore,
      }
    }

    // Target team is not #1; analyze all unpublished marked events
    const markedEventIds = new Set(participations.map((p) => p.event_id))
    const unpublishedMarkedEventIds = Array.from(markedEventIds).filter(
      (id) => !publishedEventIds.has(id)
    )

    // For each unpublished event, calculate target team points & competitors points
    const eventStats = unpublishedMarkedEventIds
      .map((evId) => {
        const ev = events.find((e) => e.id === evId)
        if (!ev) return null

        const evParts = participations.filter((p) => p.event_id === evId)
        const targetParts = evParts.filter((p) => p.team_id === targetTeam.id)
        const targetPoints = targetParts.reduce((sum, p) => sum + (p.points_earned || 0), 0)

        // Find primary position and grade for target team
        const targetPos = targetParts.find((p) => p.result_position)?.result_position || null
        const targetGrade = targetParts.find((p) => p.performance_grade)?.performance_grade || null

        const competitorPoints: Record<string, number> = {}
        let maxCompetitorPts = 0

        teams.forEach((tm) => {
          if (tm.id === targetTeam.id) return
          const tmParts = evParts.filter((p) => p.team_id === tm.id)
          const pts = tmParts.reduce((sum, p) => sum + (p.points_earned || 0), 0)
          competitorPoints[tm.id] = pts
          if (pts > maxCompetitorPts) maxCompetitorPts = pts
        })

        // Net advantage over rivals in this event
        const netAdvantage = targetPoints - maxCompetitorPts

        return {
          event: ev,
          targetPoints,
          targetPosition: targetPos,
          targetGrade,
          competitorPoints,
          netAdvantage,
        }
      })
      .filter(Boolean) as Array<{
      event: EventItem
      targetPoints: number
      targetPosition: string | null
      targetGrade: string | null
      competitorPoints: Record<string, number>
      netAdvantage: number
    }>

    // Sort events: events where target team has points, prioritizing highest net advantage
    eventStats.sort((a, b) => {
      if (a.targetPoints > 0 && b.targetPoints === 0) return -1
      if (b.targetPoints > 0 && a.targetPoints === 0) return 1
      return b.netAdvantage - a.netAdvantage
    })

    // Run forward simulation: greedily add events to make target team strictly > all other teams
    const currentLiveScores: Record<string, number> = {}
    teams.forEach((tm) => {
      const standing = publishedStandings.find((s) => s.team.id === tm.id)
      currentLiveScores[tm.id] = standing?.totalPoints || 0
    })

    const selectedEvents: EventItem[] = []
    const selectedDetails: any[] = []
    const simulatedScores: Record<string, number> = { ...currentLiveScores }

    let achieved = false

    // Try adding favorable events one by one
    for (const stat of eventStats) {
      // Check if target is already strictly #1
      const isCurrentlyTop = teams.every((tm) => {
        if (tm.id === targetTeam.id) return true
        return simulatedScores[targetTeam.id] > simulatedScores[tm.id]
      })

      if (isCurrentlyTop) {
        achieved = true
        break
      }

      // Add this event
      selectedEvents.push(stat.event)
      selectedDetails.push(stat)

      simulatedScores[targetTeam.id] += stat.targetPoints
      Object.entries(stat.competitorPoints).forEach(([compTeamId, pts]) => {
        simulatedScores[compTeamId] = (simulatedScores[compTeamId] || 0) + pts
      })

      // Check again after adding
      const isTopAfterAdd = teams.every((tm) => {
        if (tm.id === targetTeam.id) return true
        return simulatedScores[targetTeam.id] > simulatedScores[tm.id]
      })

      if (isTopAfterAdd) {
        achieved = true
        break
      }
    }

    // Determine runner-up under this simulation
    let runnerUpTeam: Team | null = null
    let maxRunnerUpScore = 0

    teams.forEach((tm) => {
      if (tm.id === targetTeam.id) return
      const score = simulatedScores[tm.id] || 0
      if (score >= maxRunnerUpScore) {
        maxRunnerUpScore = score
        runnerUpTeam = tm
      }
    })

    // Calculate maximum possible score if ALL unpublished events were published
    const allMarkedTargetStanding = allMarkedStandings.find((s) => s.team.id === targetTeam.id)
    const maxPossibleTargetScore = allMarkedTargetStanding?.totalPoints || currentTargetScore

    // Leading team under all-marked scenario
    const allMarkedLeaderStanding = allMarkedStandings[0]

    return {
      isPossible: achieved,
      isAlreadyFirst: false,
      eventsToPublish: selectedEvents,
      eventDetails: selectedDetails,
      projectedTargetScore: simulatedScores[targetTeam.id] || currentTargetScore,
      projectedLeaderScore: simulatedScores[targetTeam.id] || currentTargetScore,
      projectedRunnerUpTeam: runnerUpTeam,
      projectedMargin: (simulatedScores[targetTeam.id] || 0) - maxRunnerUpScore,
      currentLeader,
      currentDeficit: Math.max(0, currentLeaderScore - currentTargetScore),
      maxPossibleScore: maxPossibleTargetScore,
      neededScoreToBeat: allMarkedLeaderStanding?.totalPoints || currentLeaderScore,
    }
  }, [
    selectedTargetTeamId,
    teams,
    events,
    participations,
    publishedEventIds,
    publishedStandings,
    allMarkedStandings,
  ])

  // Handle publishing all selected simulation events
  const handlePublishSolution = async (eventsToPublish: EventItem[]) => {
    if (eventsToPublish.length === 0) return

    try {
      setPublishing(true)
      const targetIds = eventsToPublish.map((e) => e.id)

      const res = await fetch("/api/admin/publish-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventIds: targetIds,
          isPublished: true,
        }),
      })

      if (res.ok) {
        toast.success(`Successfully published ${targetIds.length} strategic events!`)
        // Update local state
        setPublishedEventIds((prev) => {
          const next = new Set(prev)
          targetIds.forEach((id) => next.add(id))
          return next
        })
        if (onPublishChanged) onPublishChanged()
      } else {
        toast.error("Failed to publish selected events")
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Error publishing events: " + err.message)
    } finally {
      setPublishing(false)
    }
  }

  const selectedTargetTeam = teams.find((t) => t.id === selectedTargetTeamId)

  return (
    <div className="space-y-8 font-sans">
      {/* ============================================================== */}
      {/* SECTION 1: TWO TYPES OF TOP 3 STANDINGS                       */}
      {/* ============================================================== */}
      <div className="space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold text-gold uppercase tracking-wider">
            <Trophy className="size-3.5" />
            Top 3 Rankings Comparison
          </div>
          <h2 className="text-xl font-black text-navy mt-2">Current Top 3 Team Standings</h2>
          <p className="text-xs text-slatebrand">
            Comparison between officially published live public standings and true all-marked (published + unpublished) standings.
          </p>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-3xl border border-navy/10 bg-ivory/80">
            <Loader2 className="size-6 animate-spin text-gold" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1A. PUBLISHED RESULTS STANDINGS */}
            <div className="rounded-3xl border border-emerald-500/25 bg-emerald-50/40 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <Globe className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm text-navy">Live Published Top 3</h3>
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      Official Public Website ({publishedEventIds.size} Events Published)
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white font-bold text-[10px]">Live Standings</Badge>
              </div>

              {/* Top 3 Podium Cards */}
              <div className="space-y-2.5">
                {publishedStandings.slice(0, 3).map((standing, idx) => {
                  const medalIcons = ["🥇", "🥈", "🥉"]
                  const borderColors = [
                    "border-amber-400 bg-amber-500/10",
                    "border-slate-300 bg-slate-100/80",
                    "border-amber-700/30 bg-amber-700/10",
                  ]

                  return (
                    <div
                      key={standing.team.id}
                      className={`flex items-center justify-between rounded-2xl border p-3 transition-all ${
                        borderColors[idx] || "border-navy/10 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl select-none">{medalIcons[idx]}</span>
                        <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: standing.team.color_hex }} />
                        <div>
                          <div className="font-black text-sm text-navy">{standing.team.name}</div>
                          <div className="text-[10px] font-semibold text-slatebrand">
                            {idx === 0 ? (
                              <span className="text-emerald-700 font-bold">Leader (+{standing.leadOverNext} pts lead)</span>
                            ) : (
                              <span>-{standing.deficitFromFirst} pts behind 1st</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono text-lg font-black text-navy">{standing.totalPoints}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slatebrand">Points</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 1B. ALL MARKED STANDINGS (PUBLISHED + UNPUBLISHED) */}
            <div className="rounded-3xl border border-navy/15 bg-white/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-xl bg-navy text-gold">
                    <BarChart2 className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm text-navy">All Marked Top 3 (True Total)</h3>
                    <p className="text-[10px] font-bold text-slatebrand uppercase tracking-wider">
                      Published + Unpublished Draft Results
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-navy/20 text-navy font-bold text-[10px]">
                  Underlying Total
                </Badge>
              </div>

              {/* Top 3 Podium Cards */}
              <div className="space-y-2.5">
                {allMarkedStandings.slice(0, 3).map((standing, idx) => {
                  const medalIcons = ["🥇", "🥈", "🥉"]
                  const liveStanding = publishedStandings.find((s) => s.team.id === standing.team.id)
                  const rankDiff = (liveStanding?.rank || 99) - standing.rank

                  return (
                    <div
                      key={standing.team.id}
                      className="flex items-center justify-between rounded-2xl border border-navy/10 bg-ivory/60 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl select-none">{medalIcons[idx]}</span>
                        <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: standing.team.color_hex }} />
                        <div>
                          <div className="font-black text-sm text-navy flex items-center gap-2">
                            <span>{standing.team.name}</span>
                            {rankDiff > 0 && (
                              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                                ▲ Jumps to #{standing.rank}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-semibold text-slatebrand">
                            {idx === 0 ? (
                              <span className="text-emerald-700 font-bold">True Leader (+{standing.leadOverNext} pts lead)</span>
                            ) : (
                              <span>-{standing.deficitFromFirst} pts behind #1</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono text-lg font-black text-navy">{standing.totalPoints}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slatebrand">
                          {standing.totalPoints - (liveStanding?.totalPoints || 0) > 0 ? (
                            <span className="text-cyan-700 font-bold">
                              +{standing.totalPoints - (liveStanding?.totalPoints || 0)} unpublished
                            </span>
                          ) : (
                            "All Published"
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* SECTION 2: FIRST PLACE PUBLISHING STRATEGY SIMULATOR           */}
      {/* ============================================================== */}
      <div className="rounded-3xl border border-navy/10 bg-ivory/80 p-5 md:p-6 shadow-xs space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-800 uppercase tracking-wider">
            <Zap className="size-3.5 text-cyan-600" />
            Strategy Simulator
          </div>
          <h2 className="text-xl font-black text-navy mt-2 flex items-center gap-2">
            <span>Publishing Strategy: Make a Team #1</span>
          </h2>
          <p className="text-xs text-slatebrand mt-1">
            Select any team to see which unpublished results must be published right now to propel them into First Place.
          </p>
        </div>

        {/* Target Team Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-extrabold uppercase tracking-wider text-navy shrink-0">
            Select Target Team:
          </label>
          <div className="w-full sm:w-80">
            <Select value={selectedTargetTeamId} onValueChange={setSelectedTargetTeamId}>
              <SelectTrigger className="h-11 rounded-xl bg-white border-navy/15 text-navy font-bold shadow-xs">
                <SelectValue placeholder="Choose team to simulate..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-navy/15 bg-white shadow-xl">
                {teams.map((tm) => {
                  const live = publishedStandings.find((s) => s.team.id === tm.id)
                  return (
                    <SelectItem key={tm.id} value={tm.id} className="font-bold cursor-pointer text-navy">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: tm.color_hex }} />
                        <span>{tm.name}</span>
                        <span className="text-xs text-slatebrand font-normal">
                          (Live #{live?.rank || "-"} • {live?.totalPoints || 0} pts)
                        </span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Simulator Outcome Display */}
        {loading || !simulation ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-gold" />
          </div>
        ) : simulation.isAlreadyFirst ? (
          /* CASE 1: ALREADY #1 IN LIVE STANDINGS */
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/60 p-5 space-y-3">
            <div className="flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="size-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-black text-base text-navy">
                  {selectedTargetTeam?.name} is ALREADY #1 in Live Standings!
                </h4>
                <p className="text-xs text-emerald-900 mt-0.5">
                  Currently leading with <strong className="font-mono">{simulation.projectedTargetScore} pts</strong> (
                  {simulation.projectedMargin} points ahead of 2nd place{" "}
                  {simulation.projectedRunnerUpTeam?.name || "runner-up"}).
                </p>
              </div>
            </div>
          </div>
        ) : simulation.isPossible ? (
          /* CASE 2: POSSIBLE TO BECOME #1 BY PUBLISHING RESULTS */
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/35 bg-emerald-50/70 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-2xl bg-emerald-600 text-white shrink-0 shadow-xs">
                    <Trophy className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-navy">
                      Goal Achievable! Publish {simulation.eventsToPublish.length} Result
                      {simulation.eventsToPublish.length > 1 ? "s" : ""} to Take 1st Place
                    </h4>
                    <p className="text-xs text-emerald-950 mt-0.5">
                      By publishing the results below, <strong className="text-navy">{selectedTargetTeam?.name}</strong> will
                      surge into <strong>1st Place</strong> with{" "}
                      <strong className="font-mono text-emerald-800">{simulation.projectedTargetScore} pts</strong> (
                      <strong className="text-navy">+{simulation.projectedMargin} pts lead</strong> over{" "}
                      {simulation.projectedRunnerUpTeam?.name || "rivals"}).
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => handlePublishSolution(simulation.eventsToPublish)}
                  disabled={publishing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold h-11 px-5 rounded-xl shadow-xs gap-2 shrink-0 cursor-pointer"
                >
                  {publishing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Globe className="size-4" />
                  )}
                  <span>Publish These {simulation.eventsToPublish.length} Events Now</span>
                </Button>
              </div>
            </div>

            {/* List of Events to Publish */}
            <div className="rounded-2xl border border-navy/10 bg-white overflow-hidden shadow-xs">
              <div className="bg-navy px-4 py-2.5 text-ivory text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Unpublished Events Required to Take #1</span>
                <span>{simulation.eventsToPublish.length} Events</span>
              </div>

              <div className="divide-y divide-navy/5">
                {simulation.eventDetails.map((detail, idx) => {
                  return (
                    <div key={detail.event.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-navy/2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs font-black text-slatebrand bg-navy/6 px-2 py-1 rounded-md">
                          {detail.event.event_code}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-navy truncate">{detail.event.name}</div>
                          <div className="text-[11px] font-semibold text-slatebrand flex items-center gap-2">
                            <span className="uppercase">{detail.event.category}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              {selectedTargetTeam?.name} Earned: +{detail.targetPoints} pts
                              {detail.targetPosition && ` (${detail.targetPosition})`}
                              {detail.targetGrade && ` [Grade ${detail.targetGrade}]`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold text-xs">
                          +{detail.targetPoints} pts boost
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* CASE 3: NOT ENOUGH MARKS TO BECOME #1 AT THIS TIME */
          <div className="rounded-2xl border border-amber-500/35 bg-amber-50/70 p-5 space-y-3">
            <div className="flex items-start gap-3 text-amber-900">
              <AlertTriangle className="size-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-black text-base text-navy">
                  Not enough marks yet to make {selectedTargetTeam?.name} First at this moment.
                </h4>
                <p className="text-xs text-amber-950 leading-relaxed">
                  Even if all available unpublished results are published right now,{" "}
                  <strong>{selectedTargetTeam?.name}</strong> can only reach a maximum score of{" "}
                  <strong className="font-mono text-navy">{simulation.maxPossibleScore} pts</strong>, while{" "}
                  <strong>{simulation.currentLeader?.name}</strong> currently has or would have at least{" "}
                  <strong className="font-mono text-navy">{simulation.neededScoreToBeat} pts</strong>.
                </p>
                <div className="pt-2 text-xs font-semibold text-slatebrand flex items-center gap-3 flex-wrap">
                  <span className="bg-amber-500/15 text-amber-900 px-2.5 py-1 rounded-md font-bold">
                    Deficit: {Math.max(0, simulation.neededScoreToBeat - simulation.maxPossibleScore + 1)} more points needed
                  </span>
                  <span>More events must be evaluated before {selectedTargetTeam?.name} can take 1st place.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
