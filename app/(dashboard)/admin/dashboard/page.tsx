"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  Activity,
  BarChart3,
  Calendar,
  CircleDollarSign,
  Crown,
  Loader2,
  Medal,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

interface Team {
  id: string
  name: string
  color_hex: string
}

interface ParticipationRow {
  team_id: string
  points_earned: number | null
  result_position: "FIRST" | "SECOND" | "THIRD" | null
  events: { category: "ON STAGE" | "OFF STAGE" } | null
}

interface TeamChartRow {
  name: string
  fullName: string
  points: number
  participants: number
  gold: number
  silver: number
  bronze: number
  fill: string
}

interface PieRow {
  [key: string]: string | number
  name: string
  value: number
  color: string
}

interface DashboardStats {
  totalStudents: number
  totalEvents: number
  totalRegistrations: number
  totalPointsAwarded: number
  leadingTeam: {
    name: string
    points: number
    color: string
    medals: { gold: number; silver: number; bronze: number }
  }
}

const emptyLeader = {
  name: "No results yet",
  points: 0,
  color: "#0A1D2C",
  medals: { gold: 0, silver: 0, bronze: 0 },
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "navy",
}: {
  label: string
  value: number | string
  helper: string
  icon: typeof Users
  tone?: "navy" | "gold" | "green" | "blue"
}) {
  const toneClass = {
    navy: "bg-navy/8 text-navy",
    gold: "bg-gold/16 text-navy",
    green: "bg-success/12 text-success",
    blue: "bg-deepblue/12 text-deepblue",
  }[tone]

  return (
    <div className="surface-panel group rounded-3xl p-5 transition duration-300 hover:-translate-y-1 hover:shadow-premium">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow">{label}</div>
          <div className="text-title mt-4 text-3xl text-navy">{value}</div>
        </div>
        <div className={`grid size-11 place-items-center rounded-2xl ${toneClass}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slatebrand">{helper}</p>
    </div>
  )
}

function MedalPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-ivory/12 bg-ivory/10 px-3 py-2 backdrop-blur">
      <Medal className={`size-4 ${color}`} />
      <span className="text-sm font-bold text-ivory">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ivory/45">{label}</span>
    </div>
  )
}

export default function AdminOverview() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalEvents: 0,
    totalRegistrations: 0,
    totalPointsAwarded: 0,
    leadingTeam: emptyLeader,
  })
  const [chartData, setChartData] = useState<TeamChartRow[]>([])
  const [pieData, setPieData] = useState<PieRow[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        const { count: studentCount } = await supabase.from("students").select("*", { count: "exact", head: true })
        const { count: eventCount } = await supabase.from("events").select("*", { count: "exact", head: true })
        const { count: regCount } = await supabase.from("participations").select("*", { count: "exact", head: true })

        const { data: teams } = await supabase.from("teams").select("id, name, color_hex") as { data: Team[] | null }
        const { data: participationRows } = await supabase
          .from("participations")
          .select(`
            team_id,
            points_earned,
            result_position,
            events ( category )
          `)

        const participations = (participationRows || []) as unknown as ParticipationRow[]

        if (teams) {
          let totalPoints = 0
          const categories = { "ON STAGE": 0, "OFF STAGE": 0 }

          const teamStats = teams.map((team) => {
            const teamParts = participations.filter((p) => p.team_id === team.id)
            const points = teamParts.reduce((sum, p) => sum + (p.points_earned || 0), 0)
            const participants = teamParts.length
            const gold = teamParts.filter((p) => p.result_position === "FIRST").length
            const silver = teamParts.filter((p) => p.result_position === "SECOND").length
            const bronze = teamParts.filter((p) => p.result_position === "THIRD").length

            totalPoints += points

            return {
              name: team.name.replace(" House", ""),
              fullName: team.name,
              points,
              participants,
              gold,
              silver,
              bronze,
              fill: team.color_hex || "#123B4F",
            }
          })

          participations.forEach((p) => {
            const cat = p.events?.category
            if (cat) categories[cat]++
          })

          const sortedTeams = teamStats.sort((a, b) => b.points - a.points)
          const leader = sortedTeams[0]

          setChartData(sortedTeams)
          setPieData([
            { name: "On Stage", value: categories["ON STAGE"], color: "#D4AF37" },
            { name: "Off Stage", value: categories["OFF STAGE"], color: "#123B4F" },
          ])

          setStats({
            totalStudents: studentCount || 0,
            totalEvents: eventCount || 0,
            totalRegistrations: regCount || 0,
            totalPointsAwarded: totalPoints,
            leadingTeam: leader
              ? {
                  name: leader.fullName,
                  points: leader.points,
                  color: leader.fill,
                  medals: { gold: leader.gold, silver: leader.silver, bronze: leader.bronze },
                }
              : emptyLeader,
          })
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="surface-panel flex items-center gap-3 rounded-3xl px-6 py-5 text-navy">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold">Loading festival command center</span>
        </div>
      </div>
    )
  }

  const podium = chartData.slice(0, 3)

  return (
    <div className="space-y-6 pb-10 md:space-y-8">
      <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="surface-dark relative overflow-hidden rounded-[2rem] p-6 sm:p-7">
          <div className="relative flex flex-col gap-8 lg:min-h-[330px] lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-gold">
                <Sparkles className="size-3.5" />
                Admin Command Center
              </div>
              <h1 className="text-display mt-5 max-w-2xl text-4xl text-ivory sm:text-5xl">
                Festival operations at a glance.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-ivory/62 sm:text-base">
                Monitor registrations, team momentum, scoring output, and event distribution from one executive surface.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4 backdrop-blur">
                <div className="text-title text-2xl text-ivory">{stats.totalRegistrations}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Registrations</div>
              </div>
              <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4 backdrop-blur">
                <div className="text-title text-2xl text-ivory">{stats.totalPointsAwarded}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Points Awarded</div>
              </div>
              <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4 backdrop-blur">
                <div className="text-title text-2xl text-ivory">{stats.totalEvents}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Events</div>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-elevated gold-rule relative overflow-hidden rounded-[2rem] p-6">
          <div
            className="absolute right-0 top-0 h-28 w-28 rounded-bl-[4rem] opacity-25"
            style={{ backgroundColor: stats.leadingTeam.color }}
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow">Current Leader</div>
                <h2 className="text-title mt-4 text-3xl text-navy">{stats.leadingTeam.name}</h2>
              </div>
              <div className="grid size-12 place-items-center rounded-2xl bg-gold text-navy shadow-gold">
                <Crown className="size-5" />
              </div>
            </div>

            <div className="mt-8 flex items-end gap-3">
              <div className="text-display text-6xl text-navy">{stats.leadingTeam.points}</div>
              <div className="pb-2 text-sm font-bold uppercase tracking-[0.14em] text-slatebrand">points</div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-navy p-3 text-center">
                <Medal className="mx-auto mb-2 size-4 text-gold" />
                <div className="text-title text-xl text-ivory">{stats.leadingTeam.medals.gold}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">First</div>
              </div>
              <div className="rounded-2xl bg-navy/90 p-3 text-center">
                <Medal className="mx-auto mb-2 size-4 text-ivory/65" />
                <div className="text-title text-xl text-ivory">{stats.leadingTeam.medals.silver}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Second</div>
              </div>
              <div className="rounded-2xl bg-navy/80 p-3 text-center">
                <Medal className="mx-auto mb-2 size-4 text-[#c98743]" />
                <div className="text-title text-xl text-ivory">{stats.leadingTeam.medals.bronze}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Third</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Students" value={stats.totalStudents} helper="Registered across all teams and sections." icon={Users} tone="navy" />
        <MetricCard label="Events" value={stats.totalEvents} helper="On-stage and off-stage competitions configured." icon={Calendar} tone="gold" />
        <MetricCard label="Participation" value={stats.totalRegistrations} helper="Total event entries submitted by teams." icon={BarChart3} tone="blue" />
        <MetricCard label="Scoring" value={stats.totalPointsAwarded} helper="Cumulative points already distributed." icon={Activity} tone="green" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="surface-elevated rounded-[2rem] p-5 sm:p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="eyebrow">Performance Insight</div>
              <h2 className="text-title mt-2 text-2xl text-navy">Team points vs participation</h2>
              <p className="mt-2 text-sm leading-6 text-slatebrand">
                Bars show awarded points, while the line tracks participation volume.
              </p>
            </div>
            <div className="hidden rounded-full border border-gold/25 bg-gold/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-navy sm:block">
              Live analytics
            </div>
          </div>

          <div className="h-[360px] min-h-[360px] min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <ComposedChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -22 }}>
                <CartesianGrid stroke="#0A1D2C" strokeOpacity={0.08} vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#5A6D7E", fontSize: 11, fontWeight: 700 }}
                  dy={12}
                  interval={0}
                />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#5A6D7E", fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} hide />
                <Tooltip
                  contentStyle={{
                    borderRadius: "18px",
                    border: "1px solid rgb(10 29 44 / 0.1)",
                    boxShadow: "0 18px 50px rgb(10 29 44 / 0.16)",
                    backgroundColor: "#F6F2E8",
                    color: "#0A1D2C",
                  }}
                  cursor={{ fill: "rgb(212 175 55 / 0.10)" }}
                />
                <Bar yAxisId="left" dataKey="points" barSize={34} radius={[10, 10, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.fullName} fill={entry.fill} />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="participants"
                  stroke="#D4AF37"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#0A1D2C", stroke: "#D4AF37", strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="surface-elevated rounded-[2rem] p-5 sm:p-6">
            <div className="mb-4">
              <div className="eyebrow">Event Mix</div>
              <h2 className="text-title mt-2 text-2xl text-navy">Stage distribution</h2>
            </div>
            <div className="relative h-[260px] min-h-[260px] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={86}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid rgb(10 29 44 / 0.1)",
                      backgroundColor: "#F6F2E8",
                      boxShadow: "0 18px 50px rgb(10 29 44 / 0.14)",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={30} iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-7">
                <div className="text-center">
                  <div className="text-title text-3xl text-navy">{stats.totalEvents}</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slatebrand">Events</div>
                </div>
              </div>
            </div>
          </div>

          <div className="surface-dark rounded-[2rem] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="eyebrow text-gold">Podium Watch</div>
                <h2 className="text-title mt-2 text-2xl text-ivory">Top teams</h2>
              </div>
              <Trophy className="size-6 text-gold" />
            </div>

            <div className="space-y-3">
              {podium.length > 0 ? podium.map((team, index) => (
                <div key={team.fullName} className="flex items-center gap-3 rounded-2xl border border-ivory/10 bg-ivory/8 p-3">
                  <div className="grid size-9 place-items-center rounded-xl bg-gold text-navy text-sm font-black">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-ivory">{team.fullName}</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ivory/10">
                      <div
                        className="h-full rounded-full bg-gold"
                        style={{ width: `${Math.min(100, Math.max(6, team.points))}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-black text-gold">{team.points}</div>
                </div>
              )) : (
                <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4 text-sm leading-6 text-ivory/60">
                  No scoring data is available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <TrendingUp className="size-4 text-gold" />
            Momentum
          </div>
          <p className="text-sm leading-6 text-slatebrand">
            Use scoring and leaderboard pages to review category-level movement.
          </p>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <CircleDollarSign className="size-4 text-gold" />
            Finance signal
          </div>
          <p className="text-sm leading-6 text-slatebrand">
            Finance dashboard continues the same premium metric-card language.
          </p>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <Trophy className="size-4 text-gold" />
            Results
          </div>
          <p className="text-sm leading-6 text-slatebrand">
            Live result data is protected by role policies and pulled directly from Supabase.
          </p>
        </div>
      </section>
    </div>
  )
}
