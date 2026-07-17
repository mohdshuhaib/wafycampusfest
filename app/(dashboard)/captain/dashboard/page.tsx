"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Activity, BookOpen, CheckCircle, ExternalLink, Sparkles, TrendingUp, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface Profile { team_id: string }
interface Team { id: string; name: string; color_hex: string }

interface DashboardData {
  team: Team
  totalStudents: number
  totalRegistrations: number
  categoryData: { name: string; value: number; color: string }[]
  sectionData: { name: string; students: number }[]
  recentActivity: any[]
  handbookUrl: string | null
}

export default function CaptainOverview() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profileData } = await supabase
          .from("profiles")
          .select("team_id")
          .eq("id", user.id)
          .single()

        const profile = profileData as unknown as Profile
        if (!profile?.team_id) return

        const { data: teamData } = await supabase
          .from("teams")
          .select("*")
          .eq("id", profile.team_id)
          .single()

        const team = teamData as unknown as Team

        const [studentsRes, partsRes, assetRes] = await Promise.all([
          supabase.from("students").select("class_grade, section").eq("team_id", profile.team_id),
          supabase.from("participations")
            .select("created_at, events ( name, category, applicable_section )")
            .eq("team_id", profile.team_id)
            .order("created_at", { ascending: false }),
          supabase.from("site_assets").select("value").eq("key", "rulebook_link").single(),
        ])

        const students = studentsRes.data || []
        const participations = partsRes.data || []
        const handbookUrl = (assetRes.data as { value: string } | null)?.value || null

        const classes: Record<string, number> = {}
        students.forEach((student: any) => {
          if (student.section !== "Senior") return
          const className = student.class_grade || "Unassigned"
          classes[className] = (classes[className] || 0) + 1
        })
        const sectionData = Object.entries(classes).map(([name, count]) => ({
          name,
          students: count,
        }))

        const categories = { "ON STAGE": 0, "OFF STAGE": 0 }

        participations.forEach((participation: any) => {
          const event = participation.events
          if (!event) return

          const cat = event.category
          if (cat && categories[cat as keyof typeof categories] !== undefined) {
            categories[cat as keyof typeof categories]++
          }
        })

        const categoryData = [
          { name: "On Stage", value: categories["ON STAGE"], color: "#D4AF37" },
          { name: "Off Stage", value: categories["OFF STAGE"], color: "#123B4F" },
        ]

        setData({
          team,
          totalStudents: students.length,
          totalRegistrations: participations.length,
          sectionData,
          categoryData,
          recentActivity: participations.slice(0, 5),
          handbookUrl,
        })
      } catch (err) {
        console.error("Error loading dashboard", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="surface-elevated flex items-center gap-3 rounded-3xl px-5 py-4">
          <div className="size-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          <span className="text-sm font-bold text-navy">Loading team command center</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="surface-elevated rounded-[2rem] p-8 text-center text-sm font-bold text-slatebrand">
        No team data found.
      </div>
    )
  }

  const participationRate = data.totalStudents > 0
    ? Math.round((data.totalRegistrations / (data.totalStudents * 3)) * 100)
    : 0

  return (
    <div className="space-y-5 pb-20 md:pb-4">
      <section className="surface-dark relative overflow-hidden rounded-[2rem] p-5 sm:p-6">

        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <Badge variant="gold" className="h-8 gap-2 px-3">
              <Sparkles className="size-3.5" />
              Captain Command Center
            </Badge>
            <h1 className="text-display mt-4 text-3xl text-ivory sm:text-4xl">{data.team.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/62">
              Monitor your roster, registration mix, and latest event activity before the festival desk starts moving fast.
            </p>
            {data.handbookUrl && (
              <Button onClick={() => window.open(data.handbookUrl!, "_blank")} className="mt-5 bg-gold text-navy hover:bg-gold/90">
                <BookOpen className="size-4" />
                View Fest Handbook
                <ExternalLink className="size-3.5 opacity-70" />
              </Button>
            )}
          </div>

          <div className="rounded-3xl border border-ivory/10 bg-ivory/8 p-5 text-left xl:text-right">
            <div className="text-4xl font-black text-ivory">{data.totalRegistrations}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-ivory/48">Active entries</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Team Strength" value={data.totalStudents} helper="Students registered" icon={Users} tone="navy" />
        <MetricCard label="Participation Rate" value={`${participationRate}%`} helper="Engagement estimate" icon={TrendingUp} tone="success" />
        <MetricCard label="Latest Activity" value={`+${data.recentActivity.length}`} helper="Recent entries" icon={Activity} tone="gold" />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
          <ChartPanel title="Team Composition" helper="Senior student distribution by class">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={data.sectionData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid stroke="#0A1D2C14" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} tick={{ fill: "#5A6D7E", fontSize: 12, fontWeight: 700 }} />
              <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "16px", border: "1px solid #0A1D2C14", background: "#F6F2E8" }} />
              <Bar dataKey="students" fill={data.team.color_hex} radius={[0, 10, 10, 0]} barSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Event Distribution" helper="Registrations by event category">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Pie data={data.categoryData} cx="50%" cy="48%" innerRadius={62} outerRadius={88} paddingAngle={5} dataKey="value">
                {data.categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "16px", border: "1px solid #0A1D2C14", background: "#F6F2E8" }} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "12px", fontWeight: 700 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="surface-elevated overflow-hidden rounded-[2rem]">
        <div className="border-b border-navy/10 bg-ivory/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-navy text-gold">
              <CheckCircle className="size-5" />
            </div>
            <div>
              <h2 className="text-title text-lg text-navy">Recent Registrations</h2>
              <p className="text-xs font-semibold text-slatebrand">Latest entries submitted by your team.</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-navy/8 p-2">
          {data.recentActivity.map((activity: any, index) => (
            <div key={index} className="flex items-center justify-between gap-3 rounded-2xl p-3 hover:bg-gold/6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold">
                  <CheckCircle className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy">{activity.events?.name}</p>
                  <p className="text-xs font-semibold text-slatebrand">{activity.events?.category}</p>
                </div>
              </div>
              <div className="shrink-0 font-mono text-xs font-bold text-slatebrand">
                {new Date(activity.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
          {data.recentActivity.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slatebrand">
              <Activity className="mb-2 size-8 opacity-30" />
              <p className="text-sm font-bold">No recent activity.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  helper: string
  icon: typeof Trophy
  tone: "navy" | "success" | "gold"
}) {
  const toneClasses = {
    navy: "bg-navy text-gold",
    success: "bg-success/10 text-success",
    gold: "bg-gold/12 text-gold",
  }

  return (
    <div className="surface-elevated rounded-[2rem] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-slatebrand">{label}</p>
          <div className="mt-2 text-3xl font-black text-navy">{value}</div>
          <p className="mt-1 text-xs font-semibold text-slatebrand">{helper}</p>
        </div>
        <div className={`flex size-11 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  )
}

function ChartPanel({ title, helper, children }: { title: string; helper: string; children: React.ReactNode }) {
  return (
    <div className="surface-elevated rounded-[2rem] p-4">
      <div className="mb-4">
        <h2 className="text-title text-lg text-navy">{title}</h2>
        <p className="text-xs font-semibold text-slatebrand">{helper}</p>
      </div>
      <div className="h-[320px] min-h-[320px] min-w-0 w-full">
        {children}
      </div>
    </div>
  )
}
