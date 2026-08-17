"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { CalendarClock, ArrowLeft, Clock, Calendar, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ProgrammeEvent {
  id: string
  name: string
  event_code: string | null
  category: string
}

interface ProgrammeSchedule {
  id: string
  programme_id: string
  schedule_date: string
  start_time: string
  end_time: string
  programme?: ProgrammeEvent
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(":")
  const h = parseInt(parts[0], 10) || 0
  const m = parseInt(parts[1], 10) || 0
  return h * 60 + m
}

function format12Hour(timeStr: string): string {
  if (!timeStr) return ""
  const mins = timeToMinutes(timeStr)
  const hours = Math.floor(mins / 60)
  const m = mins % 60
  const suffix = hours >= 12 ? "PM" : "AM"
  const h12 = hours % 12 || 12
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const dt = new Date(dateStr + "T00:00:00")
    return dt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "long",
    })
  } catch {
    return dateStr
  }
}

export default function PublicSchedulePage() {
  const [schedules, setSchedules] = useState<ProgrammeSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const supabase = createClient()

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true)
      const { data, error } = await (supabase.from("programme_schedules") as any)
        .select(`
          id,
          programme_id,
          schedule_date,
          start_time,
          end_time,
          programme:events ( id, name, event_code, category )
        `)
        .order("schedule_date", { ascending: true })
        .order("start_time", { ascending: true })

      if (error) {
        console.error("Error fetching schedules:", error)
      } else if (data) {
        setSchedules((data as ProgrammeSchedule[]) || [])
      }
      setLoading(false)
    }

    fetchSchedules()
  }, [])

  const filteredSchedules = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return schedules.filter((s) => {
      const code = s.programme?.event_code?.toLowerCase() || ""
      const name = s.programme?.name?.toLowerCase() || ""
      const category = s.programme?.category?.toLowerCase() || ""
      return code.includes(q) || name.includes(q) || category.includes(q)
    })
  }, [schedules, searchQuery])

  // Group schedules by schedule_date
  const groupedByDate = useMemo(() => {
    const map = new Map<string, ProgrammeSchedule[]>()
    filteredSchedules.forEach((s) => {
      if (!map.has(s.schedule_date)) {
        map.set(s.schedule_date, [])
      }
      map.get(s.schedule_date)!.push(s)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredSchedules])

  return (
    <main className="app-shell min-h-screen text-navy font-sans">
      <header className="border-b border-navy/10 bg-ivory/72 backdrop-blur-2xl sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <CalendarClock className="size-6 text-gold" />
            <div>
              <div className="font-extrabold text-navy text-base">Wafy Campus Kalikavu</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slatebrand">
                Arts Fest Official Schedule
              </div>
            </div>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm" className="rounded-xl border-navy/15">
              <ArrowLeft className="size-4 mr-1" />
              Back Home
            </Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-navy flex items-center justify-center gap-2">
            <CalendarClock className="size-7 text-gold" />
            Arts Fest Programme Schedule
          </h1>
          <p className="text-sm font-medium text-slatebrand max-w-lg mx-auto">
            Official chronological timeline of festival events and competitions.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
          <Input
            placeholder="Search by code, programme name, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-ivory border-navy/15 focus:border-gold rounded-2xl shadow-xs text-sm"
          />
        </div>

        {/* Schedule Listing */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slatebrand">
            <Loader2 className="size-8 animate-spin text-gold mb-2" />
            <p className="text-sm font-medium">Loading official schedule...</p>
          </div>
        ) : groupedByDate.length === 0 ? (
          <div className="surface-elevated max-w-md mx-auto rounded-3xl p-8 text-center space-y-3">
            <CalendarClock className="size-10 text-gold mx-auto" />
            <h3 className="text-lg font-bold text-navy">No Schedule Found</h3>
            <p className="text-sm text-slatebrand">
              {searchQuery
                ? "No scheduled programmes match your search criteria."
                : "The official programme schedule is being prepared and will be published here soon."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByDate.map(([dateStr, items]) => (
              <div key={dateStr} className="space-y-3">
                {/* Date Header Badge */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-navy text-ivory px-4 py-2 rounded-2xl font-extrabold text-sm shadow-xs border border-gold/30">
                    <Calendar className="size-4 text-gold" />
                    <span>{formatDateLabel(dateStr)}</span>
                  </div>
                  <span className="text-xs font-bold text-slatebrand">
                    ({items.length} programme{items.length === 1 ? "" : "s"})
                  </span>
                </div>

                {/* Table Container */}
                <div className="rounded-3xl border border-navy/10 bg-ivory/80 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-navy text-ivory text-xs uppercase tracking-wider font-extrabold">
                        <tr>
                          <th className="px-5 py-3.5 w-16 text-center">#</th>
                          <th className="px-5 py-3.5 min-w-[220px]">Programme</th>
                          <th className="px-5 py-3.5 w-32">Start Time</th>
                          <th className="px-5 py-3.5 w-32">End Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-navy/5 text-navy font-medium">
                        {items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-navy/4 transition-colors">
                            <td className="px-5 py-4 text-center font-mono font-bold text-slatebrand">
                              {idx + 1}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-mono text-xs font-extrabold text-navy bg-navy/8 px-2.5 py-0.5 rounded-md border border-navy/10">
                                  {item.programme?.event_code || "N/A"}
                                </span>
                                <span className="text-[10px] font-extrabold uppercase text-slatebrand bg-navy/5 px-2 py-0.5 rounded-md">
                                  {item.programme?.category}
                                </span>
                              </div>
                              <div className="font-bold text-navy text-base leading-snug">
                                {item.programme?.name}
                              </div>
                            </td>
                            <td className="px-5 py-4 font-mono font-extrabold text-navy">
                              <div className="flex items-center gap-1.5">
                                <Clock className="size-3.5 text-slatebrand" />
                                <span>{format12Hour(item.start_time)}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 font-mono font-extrabold text-navy">
                              <div className="flex items-center gap-1.5">
                                <Clock className="size-3.5 text-slatebrand" />
                                <span>{format12Hour(item.end_time)}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
