"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Scale,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ClipboardList,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react"

interface AssignedProgramme {
  id: string
  judge_id: string
  event_id: string
  rule_criterion_1: string
  rule_criterion_2: string
  rule_criterion_3: string
  rule_criterion_4: string
  overall_remarks?: string | null
  created_at: string
  evaluations_count?: number
  event?: {
    id: string
    name: string
    event_code: string | null
    category: string
    grade_type?: string
  }
}

export default function JudgeDashboard() {
  const [assignments, setAssignments] = useState<AssignedProgramme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAssignments = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/judge/assignments")
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to load assigned programmes.")
      }
      setAssignments(data.assignments || [])
    } catch (err: any) {
      console.error("Error loading judge programmes:", err)
      setError(err.message || "Failed to load assigned programmes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignments()
  }, [])

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl border border-gold/30 bg-gradient-to-r from-navy via-deepblue to-navy p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold">
              <Sparkles className="size-3.5" />
              Official Judge Evaluation System
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-ivory">
              Welcome to Your Judging Portal
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-ivory/80 leading-relaxed">
              Below are the festival programmes assigned to you. Select a programme to enter participant scores, apply evaluation rules, provide remarks, and submit results.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAssignments}
            className="self-start sm:self-center border-gold/40 text-black hover:bg-gold/10 text-xs"
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh List
          </Button>
        </div>
      </div>

      {/* Error Notice if any */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertCircle className="size-5 shrink-0" />
          <div>
            <p className="font-bold">Notice</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Assigned Programmes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-navy flex items-center gap-2">
            <BookOpen className="size-5 text-gold" />
            Your Assigned Programmes ({assignments.length})
          </h2>
          <span className="text-xs text-slatebrand">
            Click on any programme to start scoring
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-navy/10 bg-white/60 py-16 text-slatebrand">
            <Loader2 className="size-8 animate-spin text-gold" />
            <p className="mt-3 text-sm font-bold text-navy">Loading your assigned programmes...</p>
            <p className="text-xs text-slatebrand">Please wait a moment</p>
          </div>
        ) : assignments.length === 0 ? (
          <Card className="border-dashed border-2 border-navy/15 bg-white/70 p-12 text-center">
            <Scale className="mx-auto size-12 text-navy/20" />
            <h3 className="mt-3 text-base font-bold text-navy">No Programmes Assigned Yet</h3>
            <p className="mt-1 text-xs text-slatebrand max-w-md mx-auto">
              You do not have any programmes assigned for scoring at the moment. Please contact the festival coordinator or administrator to assign your events.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((item) => {
              const evalCount = item.evaluations_count || 0
              return (
                <Card
                  key={item.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-navy/15 bg-white/90 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-lg bg-navy px-2.5 py-1 font-mono text-xs font-bold text-gold">
                        {item.event?.event_code || "EVENT"}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-navy/15 bg-navy/5 text-navy text-[10px] uppercase font-bold"
                      >
                        {item.event?.category || "Standard"}
                      </Badge>
                    </div>

                    <CardTitle className="mt-3 text-lg font-black text-navy leading-snug">
                      {item.event?.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-slatebrand line-clamp-1">
                      Wafy Campus Kalikkav Arts Fest 2026
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-4">
                    {/* Rubrics snapshot */}
                    <div className="rounded-xl border border-navy/10 bg-mist/80 p-3 text-[11px] space-y-1.5 text-slatebrand">
                      <div className="font-bold text-navy text-xs mb-1 flex items-center gap-1.5">
                        <ClipboardList className="size-3.5 text-gold" />
                        Scoring Breakdown (100 Marks):
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">1. {item.rule_criterion_1}</span>
                        <span className="font-bold text-navy shrink-0">30m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">2. {item.rule_criterion_2}</span>
                        <span className="font-bold text-navy shrink-0">30m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">3. {item.rule_criterion_3}</span>
                        <span className="font-bold text-navy shrink-0">20m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">4. {item.rule_criterion_4}</span>
                        <span className="font-bold text-navy shrink-0">20m</span>
                      </div>
                    </div>

                    {/* Progress Bar & Status */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slatebrand font-medium">Evaluation Status:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="size-3.5" />
                        {evalCount} Participant{evalCount === 1 ? "" : "s"} Evaluated
                      </span>
                    </div>

                    {/* Enter / Continue Button */}
                    <Link href={`/judge/${item.id}`} className="block">
                      <Button className="w-full bg-navy hover:bg-deepblue text-white shadow-sm font-bold text-xs h-10 group-hover:bg-deepblue">
                        <span>{evalCount > 0 ? "Continue Scoring / Edit" : "Start Evaluating"}</span>
                        <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
