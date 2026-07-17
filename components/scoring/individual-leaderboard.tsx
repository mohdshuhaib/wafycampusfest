"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, Loader2, Medal, UserRound } from "lucide-react"
import { StudentDetailsModal } from "./student-details-modal"

interface StudentScore {
  id: string
  name: string
  chest_no: string | null
  section: string
  team: { name: string; color_hex: string }
  total: number
}

export function IndividualLeaderboard({ refreshTrigger }: { refreshTrigger: number }) {
  const [rankings, setRankings] = useState<StudentScore[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true)
      const { data } = await supabase
        .from("participations")
        .select(`
          points_earned,
          student_id,
          events ( grade_type, applicable_section ),
          students ( id, name, chest_no, section, team:teams(name, color_hex) )
        `)
        .not("student_id", "is", null)
        .gt("points_earned", 0)

      if (!data) {
        setLoading(false)
        return
      }

      const studentMap = new Map<string, StudentScore>()

      data.forEach((p: any) => {
        if (p.events?.grade_type === "C") return

        const sid = p.student_id
        if (!studentMap.has(sid)) {
          studentMap.set(sid, {
            id: sid,
            name: p.students.name,
            chest_no: p.students.chest_no,
            section: p.students.section,
            team: p.students.team,
            total: 0,
          })
        }

        const student = studentMap.get(sid)!
        student.total += p.points_earned
      })

      const allStudents = Array.from(studentMap.values())
        .filter((s) => s.section === "Senior")
        .sort((a, b) => b.total - a.total)
        .slice(0, 15)

      setRankings(allStudents)

      setLoading(false)
    }

    fetchRankings()
  }, [refreshTrigger])

  if (loading) {
    return (
      <div className="surface-elevated flex h-full items-center justify-center rounded-[2rem]">
        <Loader2 className="size-5 animate-spin text-gold" />
      </div>
    )
  }

  return (
    <div className="surface-elevated flex h-full flex-col overflow-hidden rounded-[2rem]">
      <div className="shrink-0 border-b border-navy/10 bg-ivory/70 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-navy text-gold">
            <UserRound className="size-4" />
          </div>
          <div>
            <h3 className="text-title text-lg text-navy">Individual Leaders</h3>
            <p className="text-xs font-semibold text-slatebrand">Top Senior individual scorers.</p>
          </div>
        </div>
      </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {rankings.map((student, idx) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(student.id)}
                    className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-navy/8 bg-ivory/75 p-3 text-left transition-all hover:border-gold/30 hover:bg-ivory hover:shadow-premium"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-navy/6 text-xs font-black text-slatebrand group-hover:bg-navy group-hover:text-ivory">
                        {idx < 3 ? (
                          <Medal className={idx === 0 ? "size-4 text-gold" : idx === 1 ? "size-4 text-slatebrand" : "size-4 text-[#c98743]"} />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-navy">{student.name}</div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-slatebrand">
                          <span className="rounded-full bg-navy/7 px-2 py-0.5 font-mono text-navy">#{student.chest_no || "NA"}</span>
                          <span className="truncate" style={{ color: student.team.color_hex }}>
                            {student.team.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <div className="text-xl font-black leading-none text-navy">{student.total}</div>
                        <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slatebrand">Points</div>
                      </div>
                      <ChevronRight className="size-4 text-slatebrand transition-colors group-hover:text-gold" />
                    </div>
                  </button>
                ))}

                {rankings.length === 0 && (
                  <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-navy/12 bg-ivory/45 text-center">
                    <Badge variant="outline" className="mb-3">Awaiting Scores</Badge>
                    <p className="text-sm font-bold text-navy">No Senior entries yet.</p>
                    <p className="mt-1 text-xs font-medium text-slatebrand">Students appear here after individual events are scored.</p>
                  </div>
                )}
              </div>
        </div>

      <StudentDetailsModal
        studentId={selectedStudentId}
        open={!!selectedStudentId}
        onOpenChange={(open) => !open && setSelectedStudentId(null)}
      />
    </div>
  )
}
