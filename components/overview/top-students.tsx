"use client"

import { Badge } from "@/components/ui/badge"
import { Medal, Trophy } from "lucide-react"

interface StudentStats {
  name: string
  chestNo: string
  section: string
  teamName: string
  teamColor: string
  totalPoints: number
  first: number
  second: number
  third: number
}

export function TopStudents({ data }: { data: StudentStats[] }) {
  const top5 = [...data].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5)

  return (
    <aside className="surface-elevated overflow-hidden rounded-[2rem]">
      <div className="border-b border-navy/10 bg-ivory/70 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gold/14 text-gold">
            <Trophy className="size-5" />
          </div>
          <div>
            <h2 className="text-title text-lg text-navy">Top Performers</h2>
            <p className="text-xs font-semibold text-slatebrand">Individual leaders excluding group events.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {top5.map((student, idx) => (
          <div key={`${student.chestNo}-${idx}`} className="group rounded-2xl border border-navy/8 bg-ivory/70 p-3 transition-all hover:border-gold/30 hover:bg-ivory hover:shadow-premium">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-navy/6 font-black text-slatebrand group-hover:bg-navy group-hover:text-ivory">
                  {idx < 3 ? (
                    <Medal className={idx === 0 ? "size-4 text-gold" : idx === 1 ? "size-4 text-slatebrand" : "size-4 text-[#c98743]"} />
                  ) : (
                    idx + 1
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-navy">{student.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                    <span className="rounded-full bg-navy/7 px-2 py-0.5 font-mono text-navy">#{student.chestNo || "NA"}</span>
                    <Badge variant="outline" className="h-5 px-2 text-[9px]">{student.section}</Badge>
                    <span className="truncate" style={{ color: student.teamColor }}>{student.teamName}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-2xl font-black leading-none text-navy">{student.totalPoints}</div>
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slatebrand">Points</div>
              </div>
            </div>

            <div className="mt-3 flex gap-1.5 border-t border-navy/8 pt-2">
              {student.first > 0 && <AwardPill label="First" value={student.first} tone="gold" />}
              {student.second > 0 && <AwardPill label="Second" value={student.second} tone="slate" />}
              {student.third > 0 && <AwardPill label="Third" value={student.third} tone="bronze" />}
              {student.first + student.second + student.third === 0 && (
                <span className="text-[10px] font-semibold text-slatebrand">Performance points only</span>
              )}
            </div>
          </div>
        ))}

        {top5.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-navy/12 bg-mist/55 text-center">
            <Trophy className="mb-3 size-8 text-slatebrand" />
            <p className="text-sm font-bold text-navy">No performers yet</p>
            <p className="mt-1 text-xs font-medium text-slatebrand">Individual results will appear after scoring begins.</p>
          </div>
        )}
      </div>
    </aside>
  )
}

function AwardPill({ label, value, tone }: { label: string; value: number; tone: "gold" | "slate" | "bronze" }) {
  const toneClasses = {
    gold: "border-gold/25 bg-gold/10 text-gold",
    slate: "border-navy/10 bg-navy/6 text-slatebrand",
    bronze: "border-[#c98743]/25 bg-[#c98743]/10 text-[#a56529]",
  }

  return (
    <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] ${toneClasses[tone]}`}>
      {label} {value}
    </span>
  )
}
