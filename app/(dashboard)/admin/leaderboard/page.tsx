"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LiveLeaderboard } from "@/components/scoring/live-leaderboard"
import { IndividualLeaderboard } from "@/components/scoring/individual-leaderboard"
import { ChampionsBoard } from "@/components/scoring/champions-board"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, Edit3, RefreshCw, Sparkles, Trophy } from "lucide-react"

export default function LeaderboardPage() {
  const router = useRouter()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-5 pb-20 md:pb-4">
      <section className="surface-dark relative overflow-hidden rounded-[2rem] p-5 sm:p-6">
        <div className="absolute left-1/3 top-0 h-px w-64 bg-linear-to-r from-transparent via-gold/40 to-transparent" />

        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <Badge variant="gold" className="h-8 gap-2 px-3">
              <Sparkles className="size-3.5" />
              Live Championship Board
            </Badge>
            <h1 className="text-display mt-4 text-3xl text-ivory sm:text-4xl">
              Rankings that feel official.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/62">
              Track team movement, individual champions, and current podium status from one polished control room.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button variant="outline" onClick={handleRefresh} className="border-ivory/15 bg-ivory/8 text-ivory hover:bg-ivory/14">
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button onClick={() => router.push("/admin/scoring")} className="bg-gold text-navy hover:bg-gold/90">
              <Edit3 className="size-4" />
              Mark Score
              <ArrowUpRight className="size-4 opacity-70" />
            </Button>
          </div>
        </div>
      </section>

      <ChampionsBoard refreshTrigger={refreshTrigger} />

      <section className="grid min-h-[680px] grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
        <div className="min-h-[560px] overflow-hidden rounded-[2rem]">
          <LiveLeaderboard refreshTrigger={refreshTrigger} />
        </div>

        <div className="min-h-[560px] overflow-hidden rounded-[2rem]">
          <IndividualLeaderboard refreshTrigger={refreshTrigger} />
        </div>
      </section>

      <div className="surface-panel flex flex-col gap-3 rounded-[2rem] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-navy text-ivory">
            <Trophy className="size-4 text-gold" />
          </div>
          <div>
            <p className="text-sm font-bold text-navy">Scoring note</p>
            <p className="text-xs font-medium text-slatebrand">Team totals include earned judging points; individual rankings exclude Special Grade D team items.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => router.push("/admin/scoring")}>
          Open Scoring Studio
        </Button>
      </div>
    </div>
  )
}
