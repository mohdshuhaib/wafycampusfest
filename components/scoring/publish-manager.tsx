"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Globe,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Trophy,
  Filter,
  Radio,
  Layers,
  Check,
  Copy,
} from "lucide-react"

interface EnrichedEvent {
  id: string
  name: string
  event_code: string
  category: string
  grade_type: string
  is_marked: boolean
  is_published: boolean
  total_participants: number
  evaluated_count: number
  first_winner: string | null
  second_winner: string | null
  third_winner: string | null
}

export function PublishManager({ onPublishChanged }: { onPublishChanged?: () => void }) {
  const [events, setEvents] = useState<EnrichedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "UNPUBLISHED" | "MARKED">("ALL")
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [bulkPublishing, setBulkPublishing] = useState(false)
  const [copyingId, setCopyingId] = useState<string | null>(null)

  const supabase = createClient()

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/publish-event")
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      } else {
        toast.error("Failed to load events for publishing")
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to load events: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Copy Result formatted for WhatsApp & clipboard
  const handleCopyResult = async (evt: EnrichedEvent) => {
    try {
      setCopyingId(evt.id)
      const { data: parts, error } = await supabase
        .from("participations")
        .select(`
          id,
          result_position,
          performance_grade,
          student_id,
          students ( id, name, chest_no ),
          teams ( id, name, color_hex )
        `)
        .eq("event_id", evt.id)

      if (error) throw error

      const rawParts = (parts as any[]) || []
      const posRank: Record<string, number> = { FIRST: 1, SECOND: 2, THIRD: 3 }

      const winners = rawParts
        .filter((p) => p.result_position && posRank[p.result_position])
        .sort((a, b) => posRank[a.result_position] - posRank[b.result_position])

      const gradeRank: Record<string, number> = { "A+": 1, A: 2, B: 3, C: 4 }
      const gradeOnly = rawParts
        .filter(
          (p) =>
            (!p.result_position || !posRank[p.result_position]) &&
            p.performance_grade &&
            p.performance_grade !== "NONE"
        )
        .sort((a, b) => {
          const rankA = gradeRank[a.performance_grade] || 9
          const rankB = gradeRank[b.performance_grade] || 9
          return rankA - rankB
        })

      if (winners.length === 0 && gradeOnly.length === 0) {
        toast.info(`No marked positions or grades found for "${evt.name}".`)
        return
      }

      const isGroup =
        evt.grade_type === "C" ||
        evt.grade_type === "D" ||
        evt.category === "GENERAL" ||
        evt.category === "SPECIAL"

      const medalIcons: Record<string, string> = {
        FIRST: "🥇 1.",
        SECOND: "🥈 2.",
        THIRD: "🥉 3.",
      }

      const lines: string[] = []
      lines.push(`*${evt.name.trim()}*`)

      winners.forEach((p) => {
        const prefix = medalIcons[p.result_position] || `${posRank[p.result_position] || 1}.`
        const gradeStr =
          p.performance_grade && p.performance_grade !== "NONE"
            ? ` with ${p.performance_grade} Grade`
            : ""

        if (isGroup) {
          const teamName = p.teams?.name || "Team"
          lines.push(`${prefix} Team ${teamName}${gradeStr}`)
        } else {
          const studentName = p.students?.name || "Participant"
          const teamName = p.teams?.name || "Team"
          lines.push(`${prefix} ${studentName} Team ${teamName}${gradeStr}`)
        }
      })

      if (gradeOnly.length > 0) {
        lines.push("")
        lines.push(" *GRADE ONLY*")
        lines.push("")

        gradeOnly.forEach((p) => {
          const gradeStr = p.performance_grade ? ` with ${p.performance_grade} Grade` : ""
          if (isGroup) {
            const teamName = p.teams?.name || "Team"
            lines.push(`📌 Team ${teamName}${gradeStr}`)
          } else {
            const studentName = p.students?.name || "Participant"
            const teamName = p.teams?.name || "Team"
            lines.push(`📌 ${studentName} Team ${teamName}${gradeStr}`)
          }
        })
      }

      const textToCopy = lines.join("\n")
      await navigator.clipboard.writeText(textToCopy)
      toast.success(`Copied results for "${evt.name}" to clipboard!`)
    } catch (err: any) {
      console.error("Error copying result:", err)
      toast.error("Failed to copy result: " + (err?.message || "Unknown error"))
    } finally {
      setCopyingId(null)
    }
  }

  // Toggle publish status for a single event
  const handleTogglePublish = async (evt: EnrichedEvent) => {
    const newStatus = !evt.is_published
    setTogglingId(evt.id)

    // Optimistic update
    setEvents((prev) =>
      prev.map((e) => (e.id === evt.id ? { ...e, is_published: newStatus } : e))
    )

    try {
      const res = await fetch("/api/admin/publish-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: evt.id,
          isPublished: newStatus,
        }),
      })

      if (res.ok) {
        toast.success(
          newStatus
            ? `Published "${evt.name}" to public portal`
            : `Unpublished "${evt.name}" from public portal`
        )
        if (onPublishChanged) onPublishChanged()
      } else {
        // Rollback
        setEvents((prev) =>
          prev.map((e) => (e.id === evt.id ? { ...e, is_published: !newStatus } : e))
        )
        toast.error("Failed to update publish status")
      }
    } catch (err: any) {
      // Rollback
      setEvents((prev) =>
        prev.map((e) => (e.id === evt.id ? { ...e, is_published: !newStatus } : e))
      )
      toast.error("Network error: " + err.message)
    } finally {
      setTogglingId(null)
    }
  }

  // Bulk publish all marked events
  const handlePublishAllMarked = async () => {
    const markedUnpublished = events.filter((e) => e.is_marked && !e.is_published)
    if (markedUnpublished.length === 0) {
      toast.info("No unpublished marked events to publish")
      return
    }

    setBulkPublishing(true)
    const targetIds = markedUnpublished.map((e) => e.id)

    try {
      const res = await fetch("/api/admin/publish-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventIds: targetIds,
          isPublished: true,
        }),
      })

      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => (targetIds.includes(e.id) ? { ...e, is_published: true } : e))
        )
        toast.success(`Successfully published ${targetIds.length} marked events!`)
        if (onPublishChanged) onPublishChanged()
      } else {
        toast.error("Failed to publish all marked events")
      }
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setBulkPublishing(false)
    }
  }

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    return events.filter((e) => {
      // Category filter
      if (categoryFilter !== "ALL" && e.category !== categoryFilter) return false

      // Status filter
      if (statusFilter === "PUBLISHED" && !e.is_published) return false
      if (statusFilter === "UNPUBLISHED" && e.is_published) return false
      if (statusFilter === "MARKED" && !e.is_marked) return false

      if (!q) return true

      return (
        (e.name || "").toLowerCase().includes(q) ||
        (e.event_code || "").toLowerCase().includes(q) ||
        (e.first_winner || "").toLowerCase().includes(q)
      )
    })
  }, [events, searchQuery, categoryFilter, statusFilter])

  const totalPublished = events.filter((e) => e.is_published).length
  const totalMarked = events.filter((e) => e.is_marked).length
  const markedUnpublishedCount = events.filter((e) => e.is_marked && !e.is_published).length

  return (
    <div className="space-y-6">
      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-navy/10 bg-ivory/80 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slatebrand">Total Events</div>
          <div className="mt-1 text-2xl font-black font-mono text-navy">{events.length}</div>
        </div>

        <div className="rounded-2xl border border-navy/10 bg-ivory/80 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slatebrand">Results Marked</div>
          <div className="mt-1 text-2xl font-black font-mono text-cyan-700">{totalMarked}</div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Live Published</div>
          <div className="mt-1 text-2xl font-black font-mono text-emerald-700">{totalPublished}</div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Publish</div>
          <div className="mt-1 text-2xl font-black font-mono text-amber-700">{markedUnpublishedCount}</div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Bulk Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
            <Input
              placeholder="Search event code or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-ivory/90 border-navy/15 rounded-xl text-sm"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {["ALL", "ON STAGE", "OFF STAGE", "GENERAL", "SPECIAL"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-navy text-ivory border-navy shadow-xs"
                    : "bg-white/80 border-navy/15 text-slatebrand hover:text-navy hover:bg-white"
                }`}
              >
                {cat === "ALL" ? "All Categories" : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter Buttons */}
          <div className="inline-flex rounded-xl border border-navy/15 bg-white/80 p-0.5 text-xs font-bold">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "ALL" ? "bg-navy text-white" : "text-slatebrand hover:text-navy"
              }`}
            >
              All ({events.length})
            </button>
            <button
              onClick={() => setStatusFilter("MARKED")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "MARKED" ? "bg-cyan-700 text-white" : "text-slatebrand hover:text-navy"
              }`}
            >
              Marked ({totalMarked})
            </button>
            <button
              onClick={() => setStatusFilter("PUBLISHED")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "PUBLISHED" ? "bg-emerald-700 text-white" : "text-slatebrand hover:text-navy"
              }`}
            >
              Published ({totalPublished})
            </button>
          </div>

          {/* Bulk Publish Button */}
          {markedUnpublishedCount > 0 && (
            <Button
              onClick={handlePublishAllMarked}
              disabled={bulkPublishing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4 rounded-xl shadow-xs gap-1.5"
            >
              {bulkPublishing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Globe className="size-4" />
              )}
              <span>Publish All Marked ({markedUnpublishedCount})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Events List Table */}
      <div className="overflow-hidden rounded-3xl border border-navy/10 bg-ivory/80 shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slatebrand">
            <Loader2 className="size-8 animate-spin text-gold mb-2" />
            <p className="text-sm font-medium">Loading programmes for publishing...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slatebrand">
            <Globe className="size-12 mx-auto text-slate-300 mb-3" />
            <h4 className="font-bold text-navy text-base">No Programmes Found</h4>
            <p className="text-xs text-slatebrand mt-1">
              {searchQuery ? `No event matches "${searchQuery}".` : "No programmes match the active filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-navy/10 bg-navy text-ivory text-[11px] uppercase tracking-wider font-extrabold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[200px]">Programme</th>
                  <th className="py-3 px-3 text-center">Category</th>
                  <th className="py-3 px-3 text-center">Evaluation Status</th>
                  <th className="py-3 px-4 min-w-[240px]">Top Winners / Evaluated</th>
                  <th className="py-3 px-4 text-center w-36">Live Status</th>
                  <th className="py-3 px-4 text-right min-w-[220px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5 text-navy font-medium">
                {filteredEvents.map((evt, idx) => {
                  const isToggling = togglingId === evt.id

                  return (
                    <tr
                      key={evt.id}
                      className={`transition-colors ${
                        evt.is_published
                          ? "bg-emerald-500/6 hover:bg-emerald-500/10"
                          : evt.is_marked
                          ? "bg-amber-500/5 hover:bg-amber-500/8"
                          : "hover:bg-navy/4"
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center font-mono text-slatebrand font-bold">
                        {idx + 1}
                      </td>

                      {/* Code & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-black text-navy bg-navy/8 border border-navy/10 px-2 py-0.5 rounded-md">
                            {evt.event_code}
                          </span>
                          <span className="font-bold text-sm text-navy">{evt.name}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex rounded-full bg-navy/6 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-slatebrand">
                          {evt.category}
                        </span>
                      </td>

                      {/* Evaluation Marked Status */}
                      <td className="py-3.5 px-3 text-center">
                        {evt.is_marked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 text-cyan-800 px-2.5 py-0.5 text-[10px] font-bold">
                            <CheckCircle2 className="size-3 text-cyan-600" />
                            Results Ready ({evt.evaluated_count})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 px-2.5 py-0.5 text-[10px] font-semibold">
                            <Clock className="size-3 text-slate-400" />
                            Not Marked
                          </span>
                        )}
                      </td>

                      {/* Top Winners */}
                      <td className="py-3.5 px-4">
                        {evt.first_winner ? (
                          <div className="space-y-0.5 text-[11px]">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900 truncate">
                              <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="text-amber-700">1st:</span>
                              <span className="truncate">{evt.first_winner}</span>
                            </div>
                            {evt.second_winner && (
                              <div className="flex items-center gap-1.5 text-slate-700 truncate text-[10px]">
                                <span className="size-1.5 rounded-full bg-slate-400 shrink-0" />
                                <span className="text-slate-500">2nd:</span>
                                <span className="truncate">{evt.second_winner}</span>
                              </div>
                            )}
                          </div>
                        ) : evt.evaluated_count > 0 ? (
                          <span className="text-slate-600 text-[11px] font-medium">
                            {evt.evaluated_count} participants scored
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Live Public Status */}
                      <td className="py-3.5 px-4 text-center">
                        {evt.is_published ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 text-xs font-black shadow-xs">
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 text-xs font-bold">
                            <EyeOff className="size-3 text-slate-400" />
                            Draft / Hidden
                          </span>
                        )}
                      </td>

                      {/* Action Buttons: Copy Result & Publish / Unpublish */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyResult(evt)}
                            disabled={copyingId === evt.id}
                            className="border-navy/15 text-navy hover:bg-gold/10 hover:border-gold/40 hover:text-navy font-bold h-9 px-2.5 rounded-xl transition-all cursor-pointer gap-1.5 shadow-xs"
                            title="Copy formatted result for WhatsApp"
                          >
                            {copyingId === evt.id ? (
                              <Loader2 className="size-3.5 animate-spin text-gold" />
                            ) : (
                              <Copy className="size-3.5 text-gold" />
                            )}
                            <span className="text-xs">Copy Result</span>
                          </Button>

                          {evt.is_published ? (
                            <Button
                              size="sm"
                              onClick={() => handleTogglePublish(evt)}
                              disabled={isToggling}
                              className="bg-emerald-600 hover:bg-rose-600 text-white font-bold h-9 px-3.5 rounded-xl transition-all group shadow-xs cursor-pointer"
                              title="Click to unpublish from public portal"
                            >
                              {isToggling ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Check className="size-3.5 group-hover:hidden" />
                                  <EyeOff className="size-3.5 hidden group-hover:inline" />
                                  <span className="group-hover:hidden">Published</span>
                                  <span className="hidden group-hover:inline">Unpublish</span>
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleTogglePublish(evt)}
                              disabled={isToggling}
                              className={`font-bold h-9 px-3.5 rounded-xl transition-all shadow-xs cursor-pointer gap-1.5 ${
                                evt.is_marked
                                  ? "bg-navy hover:bg-navy/90 text-ivory border-2 border-gold/40 shadow-premium"
                                  : "bg-slate-200 hover:bg-navy hover:text-ivory text-slate-700"
                              }`}
                              title="Publish results to public website"
                            >
                              {isToggling ? (
                                <Loader2 className="size-3.5 animate-spin text-gold" />
                              ) : (
                                <>
                                  <Globe className="size-3.5 text-gold" />
                                  <span>Publish</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
