"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { BookOpen, Search, Loader2, Globe, Users, User, ShieldCheck } from "lucide-react"

interface ProgrammeEvent {
  id: string
  name: string
  event_code: string | null
  category: "OFF STAGE" | "ON STAGE" | "GENERAL" | "SPECIAL"
  topic?: string | null
  topic_language?: "english" | "malayalam" | "arabic" | null
}

interface Team {
  id: string
  name: string
  slug: string
  color_hex: string
}

interface StudentInfo {
  id: string
  name: string
  chest_no: string | null
  team_id: string
}

interface EventTopicRecord {
  id: string
  event_id: string
  topic_type: "general" | "personal" | "participant"
  topic_language: "english" | "malayalam" | "arabic"
  publish_type: "immediate" | "scheduled"
  scheduled_publish_time: string | null
  general_topic: string | null
  team_topics: Record<string, string> | null
  participant_topics: Record<string, string> | null
  created_at?: string
  event?: ProgrammeEvent
}

export default function CaptainViewTopicPage() {
  const [topicRecords, setTopicRecords] = useState<EventTopicRecord[]>([])
  const [teamsMap, setTeamsMap] = useState<Record<string, Team>>({})
  const [studentsMap, setStudentsMap] = useState<Record<string, StudentInfo>>({})
  const [captainTeamId, setCaptainTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const supabase = createClient()

  const fetchTopics = async () => {
    setLoading(true)

    // 1. Fetch Logged-in Captain's Profile Team ID
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("team_id")
        .eq("id", user.id)
        .single()
      if (profile?.team_id) {
        setCaptainTeamId(profile.team_id)
      }
    }

    // 2. Fetch Teams for lookup
    const { data: teamsData } = await (supabase.from("teams") as any).select("id, name, slug, color_hex")
    if (teamsData) {
      const map: Record<string, Team> = {}
      ;(teamsData as Team[]).forEach((t) => {
        map[t.id] = t
      })
      setTeamsMap(map)
    }

    // 3. Fetch Students for lookup in participant-wise topics
    const { data: studentsData } = await (supabase.from("students") as any).select("id, name, chest_no, team_id")
    if (studentsData) {
      const map: Record<string, StudentInfo> = {}
      ;(studentsData as StudentInfo[]).forEach((s) => {
        map[s.id] = s
      })
      setStudentsMap(map)
    }

    // 4. Fetch EventTopics with Event details
    const { data: topicsData, error } = await (supabase.from("event_topics") as any)
      .select(`
        id,
        event_id,
        topic_type,
        topic_language,
        publish_type,
        scheduled_publish_time,
        general_topic,
        team_topics,
        participant_topics,
        created_at,
        event:events ( id, name, event_code, category, topic, topic_language )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Could not query event_topics (falling back to events table):", error)

      // Fallback query legacy events table
      const { data: legacyData } = await (supabase.from("events") as any)
        .select("id, name, event_code, category, topic, topic_language")
        .not("topic", "is", null)
        .neq("topic", "")
        .order("event_code", { ascending: true })

      if (legacyData) {
        const legacyRecords: EventTopicRecord[] = (legacyData as ProgrammeEvent[]).map((e) => ({
          id: e.id,
          event_id: e.id,
          topic_type: "general",
          topic_language: e.topic_language || "english",
          publish_type: "immediate",
          scheduled_publish_time: null,
          general_topic: e.topic || null,
          team_topics: {},
          participant_topics: {},
          event: e,
        }))
        setTopicRecords(legacyRecords)
      }
    } else if (topicsData) {
      const now = new Date()
      // Filter ONLY published topics: immediate or scheduled_publish_time <= now
      const published = (topicsData as EventTopicRecord[]).filter((rec) => {
        if (rec.publish_type === "immediate") return true
        if (rec.scheduled_publish_time) {
          const scheduled = new Date(rec.scheduled_publish_time)
          return scheduled <= now
        }
        return true
      })
      setTopicRecords(published)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchTopics()
  }, [])

  // Search Filter
  const filteredRecords = topicRecords.filter((rec) => {
    const q = searchQuery.toLowerCase()
    const code = rec.event?.event_code?.toLowerCase() || ""
    const name = rec.event?.name?.toLowerCase() || ""
    const genTopic = rec.general_topic?.toLowerCase() || ""
    const teamTopicsStr = rec.team_topics ? Object.values(rec.team_topics).join(" ").toLowerCase() : ""
    const partTopicsStr = rec.participant_topics ? Object.values(rec.participant_topics).join(" ").toLowerCase() : ""

    return (
      code.includes(q) ||
      name.includes(q) ||
      genTopic.includes(q) ||
      teamTopicsStr.includes(q) ||
      partTopicsStr.includes(q)
    )
  })

  const currentTeamName = captainTeamId && teamsMap[captainTeamId] ? teamsMap[captainTeamId].name : null

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy flex items-center gap-2">
            <BookOpen className="size-6 text-gold" />
            View Programme Topics
          </h1>
          <p className="text-sm text-slatebrand mt-1">
            Released topics and subjects for festival programmes.
          </p>
        </div>

        {currentTeamName && (
          <div className="flex items-center gap-2 bg-navy text-ivory px-4 py-2 rounded-2xl shadow-xs self-start sm:self-auto border border-gold/30">
            <ShieldCheck className="size-4 text-gold" />
            <span className="text-xs font-extrabold">{currentTeamName} Portal</span>
          </div>
        )}
      </div>

      {/* Top Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
          <Input
            placeholder="Search by programme code, name, chest no, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-ivory/80 border-navy/10 focus:border-gold rounded-xl shadow-xs text-sm"
          />
        </div>

        <div className="text-xs font-semibold text-slatebrand bg-ivory/60 px-4 py-2.5 rounded-xl border border-navy/10 self-start sm:self-auto">
          Showing <span className="font-extrabold text-navy">{filteredRecords.length}</span> published programme topic{filteredRecords.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-ivory/60 rounded-3xl border border-navy/10 text-slatebrand">
          <Loader2 className="size-8 animate-spin text-gold mb-2" />
          <p className="text-sm font-medium">Loading published topics...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-ivory/60 rounded-3xl border border-navy/10">
          <div className="size-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-3">
            <BookOpen className="size-7" />
          </div>
          <h3 className="text-base font-bold text-navy">No Topics Released Yet</h3>
          <p className="text-sm text-slatebrand max-w-sm mt-1">
            {searchQuery
              ? "No released topics match your search."
              : "No topics have been published by the festival committee yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRecords.map((rec) => {
            const isArabic = rec.topic_language === "arabic"

            return (
              <div
                key={rec.id}
                className="rounded-3xl border border-navy/10 bg-ivory/80 p-5 sm:p-6 shadow-xs hover:border-gold/30 transition-all space-y-4"
              >
                {/* Programme Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy/5 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-extrabold text-navy bg-navy/8 px-3 py-1 rounded-xl border border-navy/10">
                      {rec.event?.event_code || "N/A"}
                    </span>
                    <h3 className="font-bold text-navy text-lg leading-snug">
                      {rec.event?.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-navy bg-gold/20 px-3 py-1 rounded-full border border-gold/30 flex items-center gap-1">
                      {rec.topic_type === "general" ? (
                        <>
                          <Globe className="size-3" /> General Topic
                        </>
                      ) : rec.topic_type === "personal" ? (
                        <>
                          <Users className="size-3" /> Team-wise Topic
                        </>
                      ) : (
                        <>
                          <User className="size-3" /> Participant-wise Topic
                        </>
                      )}
                    </span>

                    <span className="text-[11px] font-bold uppercase tracking-wider text-slatebrand bg-navy/5 px-2.5 py-1 rounded-md">
                      {rec.topic_language}
                    </span>
                  </div>
                </div>

                {/* MODE 1: GENERAL TOPIC (Shown for all teams) */}
                {rec.topic_type === "general" && (
                  <div
                    className={`p-4 rounded-2xl bg-white/80 border border-navy/10 text-navy font-semibold text-base leading-relaxed ${
                      isArabic ? "text-right font-sans text-lg text-emerald-950" : "text-left text-sm"
                    }`}
                    dir={isArabic ? "rtl" : "ltr"}
                  >
                    {rec.general_topic}
                  </div>
                )}

                {/* MODE 2: PERSONAL (TEAM-WISE) TOPIC (Isolated to Captain's own team) */}
                {rec.topic_type === "personal" && rec.team_topics && (
                  <div>
                    {captainTeamId && rec.team_topics[captainTeamId] ? (
                      <div className="p-4 rounded-2xl bg-white/90 border border-navy/10 space-y-2">
                        <div className="flex items-center justify-between font-bold text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3 rounded-full shrink-0"
                              style={{ backgroundColor: teamsMap[captainTeamId]?.color_hex || "#1e3a8a" }}
                            />
                            <span className="text-navy font-extrabold text-sm">{teamsMap[captainTeamId]?.name}</span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider bg-gold/20 text-navy px-2.5 py-0.5 rounded-full border border-gold/30">
                            Your Team Topic
                          </span>
                        </div>

                        <div
                          className={`p-3 rounded-xl bg-navy/4 text-navy font-semibold text-sm leading-relaxed ${
                            isArabic ? "text-right font-sans text-lg text-emerald-950" : "text-left"
                          }`}
                          dir={isArabic ? "rtl" : "ltr"}
                        >
                          {rec.team_topics[captainTeamId]}
                        </div>
                      </div>
                    ) : (
                      /* Fallback for Admins or if captainTeamId is not set */
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {Object.entries(rec.team_topics).map(([teamId, topicVal]) => {
                          const team = teamsMap[teamId]
                          return (
                            <div
                              key={teamId}
                              className="p-4 rounded-2xl bg-white/80 border border-navy/10 space-y-2 flex flex-col justify-between"
                            >
                              <div className="flex items-center gap-2 font-bold text-xs">
                                <span
                                  className="size-3 rounded-full shrink-0"
                                  style={{ backgroundColor: team?.color_hex || "#1e3a8a" }}
                                />
                                <span className="text-navy">{team?.name || "Team"}</span>
                              </div>

                              <div
                                className={`text-sm font-semibold text-slatebrand p-2.5 rounded-xl bg-navy/4 ${
                                  isArabic ? "text-right text-base text-emerald-950" : "text-left"
                                }`}
                                dir={isArabic ? "rtl" : "ltr"}
                              >
                                {topicVal}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* MODE 3: PARTICIPANT-WISE TOPIC (Isolated to Captain's own team participants) */}
                {rec.topic_type === "participant" && rec.participant_topics && (
                  <div>
                    {(() => {
                      // Filter participant entries by captain's team_id if captainTeamId exists
                      const participantEntries = Object.entries(rec.participant_topics).filter(([studentId]) => {
                        if (!captainTeamId) return true
                        const student = studentsMap[studentId]
                        return student?.team_id === captainTeamId
                      })

                      if (participantEntries.length === 0) {
                        return (
                          <p className="p-3 text-xs text-center text-slatebrand bg-white/60 rounded-xl">
                            No participant topics assigned for your team in this programme.
                          </p>
                        )
                      }

                      return (
                        <div className="overflow-x-auto rounded-2xl border border-navy/10 bg-white/80">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-navy text-ivory text-xs uppercase tracking-wider font-extrabold">
                              <tr>
                                <th className="px-4 py-3.5 w-16 text-center">#</th>
                                <th className="px-4 py-3.5 w-28">Chest No</th>
                                <th className="px-4 py-3.5 min-w-[160px]">Participant</th>
                                <th className="px-4 py-3.5 min-w-[260px]">Assigned Topic</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-navy/5 font-medium">
                              {participantEntries.map(([studentId, topicVal], idx) => {
                                const student = studentsMap[studentId]
                                return (
                                  <tr key={studentId} className="hover:bg-navy/4 transition-colors">
                                    <td className="px-4 py-3 text-center font-mono font-bold text-slatebrand">
                                      {idx + 1}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="font-mono text-xs font-extrabold text-navy bg-navy/8 px-2 py-0.5 rounded-md">
                                        #{student?.chest_no || "N/A"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-navy">
                                      {student?.name || "Participant"}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div
                                        className={`p-2.5 rounded-xl bg-navy/4 text-navy font-semibold text-xs ${
                                          isArabic ? "text-right text-sm text-emerald-950" : "text-left"
                                        }`}
                                        dir={isArabic ? "rtl" : "ltr"}
                                      >
                                        {topicVal}
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
