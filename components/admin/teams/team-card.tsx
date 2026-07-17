"use client"

import { Button } from "@/components/ui/button"
import { Edit2, Eye, Shield, Trophy, Users } from "lucide-react"

interface Team {
  id: string
  name: string
  slug: string
  color_hex: string
  access_override: boolean | null
}

interface TeamWithCounts extends Team {
  student_count: number
}

interface TeamCardProps {
  team: TeamWithCounts
  onEdit: (team: TeamWithCounts) => void
  onView: (team: TeamWithCounts) => void
}

export function TeamCard({ team, onEdit, onView }: TeamCardProps) {
  return (
    <article className="surface-elevated group relative flex h-full min-h-[18rem] flex-col overflow-hidden rounded-[2rem] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-premium">
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: team.color_hex }} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-navy/10 bg-navy/6 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slatebrand">
            <Shield className="size-3" />
            {team.slug.toUpperCase()}
          </div>
          <h2 className="text-title text-2xl text-navy">{team.name}</h2>
        </div>
        <div
          className="grid size-12 shrink-0 place-items-center rounded-2xl text-ivory shadow-premium"
          style={{ backgroundColor: team.color_hex }}
        >
          <Trophy className="size-5" />
        </div>
      </div>

      <div className="relative mt-8 rounded-3xl border border-navy/10 bg-ivory/70 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Team Members</div>
            <div className="text-display mt-3 text-5xl text-navy">{team.student_count}</div>
          </div>
          <div className="grid size-11 place-items-center rounded-2xl bg-navy/7 text-navy">
            <Users className="size-5" />
          </div>
        </div>
      </div>

      <div className="relative mt-auto grid grid-cols-2 gap-2 pt-5">
        <Button variant="outline" onClick={() => onEdit(team)}>
          <Edit2 className="size-4" />
          Edit
        </Button>
        <Button variant="secondary" onClick={() => onView(team)}>
          <Eye className="size-4" />
          Report
        </Button>
      </div>
    </article>
  )
}
