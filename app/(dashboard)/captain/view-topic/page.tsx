"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { BookOpen, Search, Loader2 } from "lucide-react"

interface ProgrammeEvent {
  id: string
  name: string
  event_code: string | null
  category: "OFF STAGE" | "ON STAGE" | "GENERAL" | "SPECIAL"
  topic: string | null
  topic_language: "english" | "malayalam" | "arabic" | null
}

export default function CaptainViewTopicPage() {
  const [events, setEvents] = useState<ProgrammeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const supabase = createClient()

  const fetchTopics = async () => {
    setLoading(true)
    const { data, error } = await (supabase.from("events") as any)
      .select("id, name, event_code, category, topic, topic_language")
      .not("topic", "is", null)
      .neq("topic", "")
      .order("event_code", { ascending: true })

    if (error) {
      console.error("Error fetching programme topics:", error)
    } else {
      setEvents((data as ProgrammeEvent[]) || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTopics()
  }, [])

  const filteredEvents = events.filter((e) => {
    const q = searchQuery.toLowerCase()
    return (
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.event_code && e.event_code.toLowerCase().includes(q)) ||
      (e.topic && e.topic.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy flex items-center gap-2">
          <BookOpen className="size-6 text-gold" />
          View Programme Topics
        </h1>
        <p className="text-sm text-slatebrand mt-1">
          Assigned topics and subjects for released festival programmes.
        </p>
      </div>

      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
          <Input
            placeholder="Search by programme code, name, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-ivory/80 border-navy/10 focus:border-gold rounded-xl shadow-xs"
          />
        </div>

        <div className="text-xs font-semibold text-slatebrand bg-ivory/60 px-4 py-2.5 rounded-xl border border-navy/10 self-start sm:self-auto">
          Showing <span className="font-extrabold text-navy">{filteredEvents.length}</span> assigned topic{filteredEvents.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-3xl border border-navy/10 bg-ivory/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slatebrand">
            <Loader2 className="size-8 animate-spin text-gold mb-2" />
            <p className="text-sm font-medium">Loading programme topics...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="size-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-3">
              <BookOpen className="size-7" />
            </div>
            <h3 className="text-base font-bold text-navy">No Topics Found</h3>
            <p className="text-sm text-slatebrand max-w-sm mt-1">
              {searchQuery
                ? "No programme topics match your search."
                : "No topics have been assigned to any programme yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy text-ivory text-xs uppercase tracking-wider font-extrabold border-b border-navy/10">
                <tr>
                  <th scope="col" className="px-5 py-4 w-20 text-center">
                    Sl No
                  </th>
                  <th scope="col" className="px-5 py-4 w-36">
                    Programme Code
                  </th>
                  <th scope="col" className="px-5 py-4 min-w-[200px]">
                    Programme Name
                  </th>
                  <th scope="col" className="px-6 py-4 min-w-[300px]">
                    Topic
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5 text-navy font-medium">
                {filteredEvents.map((evt, index) => {
                  const isArabic = evt.topic_language === "arabic"
                  return (
                    <tr
                      key={evt.id}
                      className="hover:bg-navy/4 transition-colors"
                    >
                      {/* Sl No */}
                      <td className="px-5 py-4 text-center font-mono font-bold text-slatebrand">
                        {index + 1}
                      </td>

                      {/* Programme Code */}
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-extrabold text-navy bg-navy/8 px-2.5 py-1 rounded-lg border border-navy/10">
                          {evt.event_code || "N/A"}
                        </span>
                      </td>

                      {/* Programme Name */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-navy">{evt.name}</div>
                        <div className="text-[11px] font-semibold text-slatebrand uppercase tracking-wider">
                          {evt.category}
                        </div>
                      </td>

                      {/* Topic Content */}
                      <td className="px-6 py-4">
                        <div
                          className={`p-3 rounded-2xl bg-white/70 border border-navy/10 text-navy font-semibold font-sans ${
                            isArabic
                              ? "text-right text-lg leading-relaxed text-emerald-950"
                              : "text-left text-sm"
                          }`}
                          dir={isArabic ? "rtl" : "ltr"}
                        >
                          {evt.topic}
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
