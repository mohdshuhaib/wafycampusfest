"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpRight, Loader2, Medal, Shield, Trophy } from "lucide-react"
import { TeamDetailsModal } from "./team-details-modal"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

export function LiveLeaderboard({ refreshTrigger }: { refreshTrigger: number }) {
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  const supabase = createClient()

  const calculateScores = async () => {
    setLoading(true)

    const { data: parts } = await supabase
      .from("participations")
      .select(`
          points_earned,
          teams ( id, name, color_hex ),
          events ( category )
        `)
      .gt("points_earned", 0)

    const { data: teams } = await supabase.from("teams").select("*")

    if (!parts || !teams) {
      setScores([])
      setLoading(false)
      return
    }

    const leaderboard = teams.map((team: any) => {
      const teamParts = parts.filter((p: any) => p.teams?.id === team.id)
      const earnedTotal = teamParts.reduce((sum: number, p: any) => sum + (p.points_earned || 0), 0)
      return {
        id: team.id,
        name: team.name,
        color: team.color_hex,
        total: earnedTotal,
        rawTotal: earnedTotal,
      }
    })

    leaderboard.sort((a: any, b: any) => b.total - a.total)
    setScores(leaderboard)
    setLoading(false)
  }

  useEffect(() => {
    calculateScores()
  }, [refreshTrigger])

  if (loading) {
    return (
      <div className="surface-elevated flex h-full items-center justify-center rounded-[2rem]">
        <Loader2 className="size-5 animate-spin text-gold" />
      </div>
    )
  }

  const leaderTotal = scores[0]?.total || 0

  return (
    <>
      <div className="surface-elevated flex h-full flex-col overflow-hidden rounded-[2rem]">
        <div className="shrink-0 border-b border-navy/10 bg-ivory/70 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-navy text-gold">
                <Trophy className="size-4" />
              </div>
              <div>
                <h3 className="text-title text-lg text-navy">Team Standings</h3>
                <p className="text-xs font-semibold text-slatebrand">Senior-only championship standings.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-navy/7 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slatebrand">
                {scores.length} Teams
              </span>
            </div>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <ScrollArea className="h-full w-full">
            <div className="w-full min-w-max">
              <Table>
                <TableHeader className="sticky top-0 z-20 bg-mist shadow-sm">
                  <TableRow className="h-10 border-navy/10 hover:bg-transparent">
                    <TableHead className="h-10 w-[70px] pl-4 text-[10px] font-black uppercase tracking-[0.12em] text-slatebrand">Rank</TableHead>
                    <TableHead className="sticky left-0 z-10 h-10 min-w-[210px] border-r border-navy/10 bg-mist text-[10px] font-black uppercase tracking-[0.12em] text-slatebrand">Team</TableHead>
                    <TableHead className="h-10 w-28 border-x border-gold/20 bg-gold/10 text-center text-[10px] font-black uppercase tracking-[0.12em] text-navy">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((team, idx) => {
                    const progress = leaderTotal > 0 ? Math.round((team.total / leaderTotal) * 100) : 0

                    return (
                      <TableRow
                        key={team.id}
                        className="group h-16 cursor-pointer border-navy/8 transition-colors hover:bg-gold/6"
                        onClick={() => setSelectedTeamId(team.id)}
                      >
                        <TableCell className="py-2 pl-4">
                          <div className="flex size-9 items-center justify-center rounded-2xl bg-navy/6 text-xs font-black text-slatebrand group-hover:bg-navy group-hover:text-ivory">
                            {idx < 3 ? (
                              <Medal className={idx === 0 ? "size-4 text-gold" : idx === 1 ? "size-4 text-slatebrand" : "size-4 text-[#c98743]"} />
                            ) : (
                              `#${idx + 1}`
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="sticky left-0 z-10 border-r border-navy/10 bg-ivory py-2 group-hover:bg-[#f3ead8]">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-10 w-1.5 rounded-full" style={{ backgroundColor: team.color }} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-black text-navy">{team.name}</span>
                                <ArrowUpRight className="size-3 shrink-0 text-slatebrand opacity-0 transition-opacity group-hover:opacity-100" />
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy/8">
                                <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="border-x border-gold/20 bg-gold/10 py-2 text-center text-2xl font-black text-navy">
                          {team.total}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {scores.length === 0 && (
                <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
                  <Shield className="size-8 text-slatebrand" />
                  <p className="text-sm font-bold text-navy">No team scores yet</p>
                  <p className="text-xs font-medium text-slatebrand">Scores will appear after events are judged.</p>
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      <TeamDetailsModal
        teamId={selectedTeamId}
        open={!!selectedTeamId}
        onOpenChange={(open) => !open && setSelectedTeamId(null)}
      />

    </>
  )
}
