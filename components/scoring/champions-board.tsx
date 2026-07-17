"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Crown, Loader2, Sparkles, Star, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Winner {
  name: string
  team: string
  total: number
  section: string
  type: "KALA" | "SARGGA"
}

export function ChampionsBoard({ refreshTrigger }: { refreshTrigger: number }) {
  const [champions, setChampions] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function calculateChampions() {
      setLoading(true)
      const { data } = await supabase.from("participations")
        .select(`
          points_earned, student_id, result_position, performance_grade,
          events ( category, grade_type, applicable_section ),
          students ( id, name, section, team:teams(name) )
        `)
        .not("student_id", "is", null)
        .gt("points_earned", 0)

      if (!data) {
        setChampions([])
        setLoading(false)
        return
      }

      const students: Record<string, any> = {}

      data.forEach((p: any) => {
        if (p.events?.grade_type === "C") return

        const sid = p.student_id
        if (!students[sid]) {
          students[sid] = {
            id: sid,
            name: p.students.name,
            team: p.students.team.name,
            section: p.students.section,
            total: 0,
            has_on_stage_A_win: false,
            has_off_stage_A_win: false,
            a_grade_count: 0,
          }
        }

        const s = students[sid]
        s.total += p.points_earned

        const isGeneral = Array.isArray(p.events?.applicable_section)
          ? p.events.applicable_section.includes("General")
          : p.events?.applicable_section === "General"

        const isCategoryAEvent = p.events.grade_type === "A"

        if (!isGeneral && isCategoryAEvent && p.result_position === "FIRST" && p.performance_grade === "A") {
          s.a_grade_count++
          if (p.events.category === "ON STAGE") s.has_on_stage_A_win = true
          if (p.events.category === "OFF STAGE") s.has_off_stage_A_win = true
        }
      })

      const results: Winner[] = []
      const sections = ["Senior", "Junior", "Sub-Junior"]

      sections.forEach((sectionName) => {
        const sectionStudents = Object.values(students).filter((s: any) => s.section === sectionName)
        const kalaCandidates = sectionStudents.filter((s: any) => s.has_on_stage_A_win && s.has_off_stage_A_win)
        let kalaWinner: any = null

        if (kalaCandidates.length > 0) {
          kalaCandidates.sort((a: any, b: any) => {
            if (b.total !== a.total) return b.total - a.total
            return b.a_grade_count - a.a_grade_count
          })
          kalaWinner = kalaCandidates[0]

          results.push({
            name: kalaWinner.name,
            team: kalaWinner.team,
            total: kalaWinner.total,
            section: sectionName,
            type: "KALA",
          })
        }

        const sarggaCandidates = sectionStudents.filter((s: any) => s.id !== kalaWinner?.id)

        if (sarggaCandidates.length > 0) {
          sarggaCandidates.sort((a: any, b: any) => {
            if (b.total !== a.total) return b.total - a.total
            return b.a_grade_count - a.a_grade_count
          })

          const sarggaWinner = sarggaCandidates[0]
          results.push({
            name: sarggaWinner.name,
            team: sarggaWinner.team,
            total: sarggaWinner.total,
            section: sectionName,
            type: "SARGGA",
          })
        }
      })

      setChampions(results)
      setLoading(false)
    }

    calculateChampions()
  }, [refreshTrigger])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-[2rem] border border-navy/8 bg-ivory/50" />
        ))}
      </div>
    )
  }

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {["Senior", "Junior", "Sub-Junior"].map((section) => {
        const kala = champions.find((c) => c.section === section && c.type === "KALA")
        const sargga = champions.find((c) => c.section === section && c.type === "SARGGA")

        return (
          <div key={section} className="surface-dark group relative overflow-hidden rounded-[2rem] p-4 shadow-premium">
            <div className="relative mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow text-gold/80">{section}</p>
                <h2 className="text-title mt-1 text-xl text-ivory">Championship</h2>
              </div>
              <div className="flex size-10 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
                <Trophy className="size-4" />
              </div>
            </div>

            <div className="relative grid grid-cols-2 gap-3">
              <ChampionSlot
                icon="kala"
                label="Kala Prathibha"
                winner={kala}
                emptyLabel="Not declared"
              />
              <ChampionSlot
                icon="sargga"
                label="Sargga Prathibha"
                winner={sargga}
                emptyLabel="Awaiting leader"
              />
            </div>
          </div>
        )
      })}
    </section>
  )
}

function ChampionSlot({
  icon,
  label,
  winner,
  emptyLabel,
}: {
  icon: "kala" | "sargga"
  label: string
  winner?: Winner
  emptyLabel: string
}) {
  const Icon = icon === "kala" ? Crown : Star

  return (
    <div className="min-w-0 rounded-2xl border border-ivory/10 bg-ivory/7 p-3">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={icon === "kala" ? "size-4 text-gold" : "size-4 text-[#8fd4ff]"} />
        <span className="truncate text-[10px] font-black uppercase tracking-[0.1em] text-ivory/62">{label}</span>
      </div>

      {winner ? (
        <div className="space-y-2">
          <p className="truncate text-sm font-black leading-tight text-ivory" title={winner.name}>{winner.name}</p>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="truncate text-[10px] font-bold text-ivory/48">{winner.team}</span>
            <Badge variant={icon === "kala" ? "gold" : "outline"} className="h-5 shrink-0 px-2 text-[10px]">
              {winner.total} pts
            </Badge>
          </div>
        </div>
      ) : (
        <div className="flex min-h-12 items-end">
          <div className="flex items-center gap-2 text-xs font-semibold text-ivory/38">
            <Sparkles className="size-3" />
            {emptyLabel}
          </div>
        </div>
      )}
    </div>
  )
}
