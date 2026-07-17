"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Layers3 } from "lucide-react"

interface ClassStats {
  className: string
  studentCount: number
  totalPoints: number
  first: number
  second: number
  third: number
  positionCount: number
  pointsPerStudent: number
  positionsPerStudent: number
}

export function SectionAnalysis({ data }: { data: ClassStats[] }) {
  const byPoints = [...data].sort((a, b) => b.totalPoints - a.totalPoints)
  const byPositions = [...data].sort((a, b) => b.positionCount - a.positionCount)
  const totalPoints = data.reduce((sum, row) => sum + row.totalPoints, 0)
  const totalPositions = data.reduce((sum, row) => sum + row.positionCount, 0)

  return (
    <div className="surface-elevated overflow-hidden rounded-[2rem]">
      <div className="flex flex-col gap-3 border-b border-navy/10 bg-ivory/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-deepblue text-ivory">
            <Layers3 className="size-5 text-gold" />
          </div>
          <div>
            <h2 className="text-title text-lg text-navy">Class Performance</h2>
            <p className="text-xs font-semibold text-slatebrand">Senior classes compared by totals and student strength.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="points" className="p-4">
        <TabsList className="mb-4 grid h-auto w-full grid-cols-2 rounded-2xl bg-navy/6 p-1">
          <TabsTrigger value="points" className="rounded-xl py-2 text-xs font-black data-[state=active]:bg-navy data-[state=active]:text-ivory">Total Points</TabsTrigger>
          <TabsTrigger value="positions" className="rounded-xl py-2 text-xs font-black data-[state=active]:bg-navy data-[state=active]:text-ivory">Total Positions</TabsTrigger>
        </TabsList>

        <TabsContent value="points" className="m-0 space-y-3">
          <ClassRows data={byPoints} total={totalPoints} mode="points" />
        </TabsContent>

        <TabsContent value="positions" className="m-0 space-y-3">
          <ClassRows data={byPositions} total={totalPositions} mode="positions" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ClassRows({ data, total, mode }: { data: ClassStats[]; total: number; mode: "points" | "positions" }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-3xl border border-dashed border-navy/12 bg-mist/55 text-sm font-bold text-slatebrand">
        No class data yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.map((row, index) => {
        const value = mode === "points" ? row.totalPoints : row.positionCount
        const normalized = mode === "points" ? row.pointsPerStudent : row.positionsPerStudent
        const percentage = total > 0 ? Math.round((value / total) * 100) : 0

        return (
          <div key={row.className} className="rounded-2xl border border-navy/8 bg-ivory/70 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-xl bg-navy/7 text-xs font-black text-navy">{index + 1}</span>
                  <h3 className="text-title text-lg text-navy">{row.className}</h3>
                </div>
                <p className="mt-1 text-xs font-semibold text-slatebrand">{row.studentCount} students</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-navy">{value}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slatebrand">{mode === "points" ? "points" : "positions"}</div>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-navy/8">
              <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(3, percentage)}%` }} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slatebrand sm:grid-cols-4">
              <div className="rounded-xl bg-navy/5 px-3 py-2">{percentage}% share</div>
              <div className="rounded-xl bg-navy/5 px-3 py-2">{normalized} per student</div>
              <div className="rounded-xl bg-navy/5 px-3 py-2">1st {row.first}</div>
              <div className="rounded-xl bg-navy/5 px-3 py-2">2nd {row.second} · 3rd {row.third}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
