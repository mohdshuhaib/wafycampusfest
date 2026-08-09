"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Plus,
  Search,
  BookOpen,
  Edit2,
  Trash2,
  Loader2,
  Sparkles,
  Check,
  Globe,
  AlertTriangle,
  Users,
  User,
  Clock,
  Zap,
  Calendar,
} from "lucide-react"

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

interface Participant {
  participation_id: string
  student_id: string
  student_name: string
  chest_no: string | null
  team_id: string
  team_name: string
  team_color: string
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

export default function AdminTopicAssignPage() {
  const [events, setEvents] = useState<ProgrammeEvent[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [topicRecords, setTopicRecords] = useState<EventTopicRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [programmeSearch, setProgrammeSearch] = useState("")
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  
  // Topic Config State
  const [topicType, setTopicType] = useState<"general" | "personal" | "participant">("general")
  const [topicLanguage, setTopicLanguage] = useState<"english" | "malayalam" | "arabic">("english")
  
  // Publish Schedule State
  const [publishType, setPublishType] = useState<"immediate" | "scheduled">("immediate")
  const [scheduledTime, setScheduledTime] = useState<string>("")

  // Topic Content State
  const [generalTopicText, setGeneralTopicText] = useState("")
  const [teamTopicsMap, setTeamTopicsMap] = useState<Record<string, string>>({})
  const [participantTopicsMap, setParticipantTopicsMap] = useState<Record<string, string>>({})
  
  // Participants for selected programme
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)

  const [saving, setSaving] = useState(false)
  const [deleteRecord, setDeleteRecord] = useState<EventTopicRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [dbColumnMissing, setDbColumnMissing] = useState(false)

  const supabase = createClient()

  // Load Events, Teams, and Topic Records
  const fetchData = async () => {
    setLoading(true)
    setDbColumnMissing(false)

    // 1. Fetch Teams
    const { data: teamsData } = await (supabase.from("teams") as any)
      .select("id, name, slug, color_hex")
      .order("name")
    if (teamsData) setTeams(teamsData as Team[])

    // 2. Fetch Events
    const { data: eventsData } = await (supabase.from("events") as any)
      .select("id, name, event_code, category, topic, topic_language")
      .order("event_code", { ascending: true })

    if (eventsData) setEvents((eventsData as ProgrammeEvent[]) || [])

    // 3. Fetch EventTopics Table
    const { data: topicsData, error: topicsError } = await (supabase.from("event_topics") as any)
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
        event:events ( id, name, event_code, category )
      `)
      .order("created_at", { ascending: false })

    if (topicsError) {
      console.warn("Could not fetch event_topics table (migration script may be required):", topicsError)
      setDbColumnMissing(true)

      // Fallback: construct records from legacy events.topic
      if (eventsData) {
        const legacyRecords: EventTopicRecord[] = (eventsData as ProgrammeEvent[])
          .filter((e) => e.topic && e.topic.trim().length > 0)
          .map((e) => ({
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
    } else {
      setTopicRecords((topicsData as EventTopicRecord[]) || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Fetch registered participants when selected event changes or when mode changes to 'participant'
  const fetchParticipantsForEvent = async (eventId: string) => {
    setLoadingParticipants(true)
    const { data, error } = await (supabase.from("participations") as any)
      .select(`
        id,
        student_id,
        students ( id, name, chest_no ),
        teams ( id, name, color_hex )
      `)
      .eq("event_id", eventId)

    if (error) {
      console.error("Error fetching participants:", error)
      setParticipants([])
    } else if (data) {
      const formatted: Participant[] = data.map((p: any) => ({
        participation_id: p.id,
        student_id: p.student_id || p.id,
        student_name: p.students?.name || "Unknown Student",
        chest_no: p.students?.chest_no || "N/A",
        team_id: p.teams?.id || "",
        team_name: p.teams?.name || "Team",
        team_color: p.teams?.color_hex || "#1e3a8a",
      }))
      setParticipants(formatted)
    }
    setLoadingParticipants(false)
  }

  useEffect(() => {
    if (selectedEventId && topicType === "participant") {
      fetchParticipantsForEvent(selectedEventId)
    }
  }, [selectedEventId, topicType])

  const handleOpenAddModal = (recordToEdit?: EventTopicRecord) => {
    if (recordToEdit) {
      setSelectedEventId(recordToEdit.event_id)
      setTopicType(recordToEdit.topic_type || "general")
      setTopicLanguage(recordToEdit.topic_language || "english")
      setPublishType(recordToEdit.publish_type || "immediate")
      
      // Datetime input formatting
      if (recordToEdit.scheduled_publish_time) {
        const dt = new Date(recordToEdit.scheduled_publish_time)
        const formatted = dt.toISOString().slice(0, 16)
        setScheduledTime(formatted)
      } else {
        setScheduledTime("")
      }

      setGeneralTopicText(recordToEdit.general_topic || "")
      setTeamTopicsMap(recordToEdit.team_topics || {})
      setParticipantTopicsMap(recordToEdit.participant_topics || {})

      if (recordToEdit.topic_type === "participant") {
        fetchParticipantsForEvent(recordToEdit.event_id)
      }
    } else {
      setSelectedEventId(null)
      setTopicType("general")
      setTopicLanguage("english")
      setPublishType("immediate")
      setScheduledTime("")
      setGeneralTopicText("")
      setTeamTopicsMap({})
      setParticipantTopicsMap({})
      setParticipants([])
    }
    setProgrammeSearch("")
    setIsModalOpen(true)
  }

  const handleSaveTopic = async () => {
    if (!selectedEventId) {
      toast.error("Please select a programme")
      return
    }

    if (publishType === "scheduled" && !scheduledTime) {
      toast.error("Please specify a scheduled date and time")
      return
    }

    // Validate inputs per mode
    if (topicType === "general" && !generalTopicText.trim()) {
      toast.error("Please enter the general topic content")
      return
    }

    if (topicType === "personal") {
      const hasAnyTeamTopic = Object.values(teamTopicsMap).some((t) => t && t.trim().length > 0)
      if (!hasAnyTeamTopic) {
        toast.error("Please enter a topic for at least one team")
        return
      }
    }

    if (topicType === "participant") {
      const hasAnyParticipantTopic = Object.values(participantTopicsMap).some((t) => t && t.trim().length > 0)
      if (!hasAnyParticipantTopic) {
        toast.error("Please enter a topic for at least one participant")
        return
      }
    }

    setSaving(true)
    const payload = {
      event_id: selectedEventId,
      topic_type: topicType,
      topic_language: topicLanguage,
      publish_type: publishType,
      scheduled_publish_time: publishType === "scheduled" && scheduledTime ? new Date(scheduledTime).toISOString() : null,
      general_topic: topicType === "general" ? generalTopicText.trim() : null,
      team_topics: topicType === "personal" ? teamTopicsMap : {},
      participant_topics: topicType === "participant" ? participantTopicsMap : {},
      updated_at: new Date().toISOString(),
    }

    // Upsert into event_topics table
    const { error: topicTableError } = await (supabase.from("event_topics") as any)
      .upsert(payload, { onConflict: "event_id" })

    if (topicTableError) {
      console.error("Error upserting event_topics:", topicTableError)
      if (topicTableError.message?.includes("table") || topicTableError.code === "42P01") {
        toast.error("Database table 'event_topics' missing. Run 20260809010000_create_event_topics.sql script.")
        setDbColumnMissing(true)
      } else {
        toast.error("Failed to save topic: " + (topicTableError.message || "Unknown error"))
      }
    } else {
      // Also sync events table legacy columns for compatibility
      const legacyTopicSummary =
        topicType === "general"
          ? generalTopicText.trim()
          : topicType === "personal"
          ? Object.values(teamTopicsMap).filter(Boolean).join(" | ")
          : `${Object.keys(participantTopicsMap).length} Participant Topics Assigned`

      await (supabase.from("events") as any)
        .update({
          topic: legacyTopicSummary,
          topic_language: topicLanguage,
        })
        .eq("id", selectedEventId)

      toast.success("Programme topic saved & published successfully!")
      setIsModalOpen(false)
      fetchData()
    }

    setSaving(false)
  }

  const handleDeleteTopic = async () => {
    if (!deleteRecord) return
    setDeleting(true)

    // Delete from event_topics
    await (supabase.from("event_topics") as any)
      .delete()
      .eq("id", deleteRecord.id)

    // Clear legacy columns on events table
    await (supabase.from("events") as any)
      .update({ topic: null, topic_language: null })
      .eq("id", deleteRecord.event_id)

    toast.success("Topic removed successfully")
    setDeleteRecord(null)
    fetchData()
    setDeleting(false)
  }

  // Filter topics for main display
  const filteredTopicRecords = topicRecords.filter((rec) => {
    const q = searchQuery.toLowerCase()
    const eventName = rec.event?.name || ""
    const eventCode = rec.event?.event_code || ""
    const generalTopic = rec.general_topic || ""

    return (
      eventName.toLowerCase().includes(q) ||
      eventCode.toLowerCase().includes(q) ||
      generalTopic.toLowerCase().includes(q)
    )
  })

  // Modal programme search filter
  const filteredModalEvents = events.filter((e) => {
    const q = programmeSearch.toLowerCase()
    return (
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.event_code && e.event_code.toLowerCase().includes(q))
    )
  })

  // Set of assigned event IDs
  const assignedEventIds = new Set(topicRecords.map((r) => r.event_id))

  return (
    <div className="space-y-6 font-sans">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy flex items-center gap-2">
            <BookOpen className="size-6 text-gold" />
            Topic Assign Portal
          </h1>
          <p className="text-sm text-slatebrand mt-1">
            Assign General, Team-wise (Personal), or Participant-wise topics with At-Spot or Scheduled Publishing.
          </p>
        </div>

        <Button
          onClick={() => handleOpenAddModal()}
          className="bg-navy hover:bg-navy/90 text-ivory gap-2 shadow-premium rounded-xl px-5 h-11 cursor-pointer font-bold"
        >
          <Plus className="size-4 text-gold" />
          <span>Add / Assign Topic</span>
        </Button>
      </div>

      {/* Database Missing Banner Notice */}
      {dbColumnMissing && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-950 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-navy">Database Migration Required</p>
              <p className="text-slatebrand font-medium">
                The <code className="font-mono bg-amber-500/15 px-1 py-0.5 rounded text-navy font-bold">event_topics</code> table is not present in your Supabase database yet.
              </p>
            </div>
          </div>
          <div className="font-mono text-[11px] bg-navy text-ivory p-2.5 rounded-xl select-all shrink-0">
            Run script: 20260809010000_create_event_topics.sql
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
          <Input
            placeholder="Search assigned topics by code, name, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-ivory/80 border-navy/10 focus:border-gold rounded-xl shadow-xs"
          />
        </div>

        {/* Assigned Topics Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-ivory/60 rounded-3xl border border-navy/10 text-slatebrand">
            <Loader2 className="size-8 animate-spin text-gold mb-2" />
            <p className="text-sm font-medium">Loading topics & schedules...</p>
          </div>
        ) : filteredTopicRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-ivory/60 rounded-3xl border border-navy/10">
            <div className="size-16 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-4">
              <BookOpen className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-navy">No Topics Assigned</h3>
            <p className="text-sm text-slatebrand max-w-md mt-1 mb-6">
              {searchQuery
                ? "No topic records match your search criteria."
                : "No programme topics have been configured yet. Click 'Add / Assign Topic' to get started."}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => handleOpenAddModal()}
                className="bg-navy hover:bg-navy/90 text-ivory gap-2 rounded-xl cursor-pointer"
              >
                <Plus className="size-4 text-gold" /> Assign First Topic
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTopicRecords.map((rec) => {
              const isArabic = rec.topic_language === "arabic"
              const isScheduled = rec.publish_type === "scheduled" && rec.scheduled_publish_time
              const scheduledDate = isScheduled ? new Date(rec.scheduled_publish_time!) : null
              const isFutureSchedule = scheduledDate ? scheduledDate > new Date() : false

              return (
                <div
                  key={rec.id}
                  className="rounded-3xl border border-navy/10 bg-ivory/80 p-5 shadow-xs hover:border-gold/30 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-navy bg-navy/8 px-2.5 py-1 rounded-lg">
                          {rec.event?.event_code || "N/A"}
                        </span>
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-navy bg-gold/20 px-2.5 py-0.5 rounded-full border border-gold/30 flex items-center gap-1">
                          {rec.topic_type === "general" ? (
                            <>
                              <Globe className="size-3" /> General
                            </>
                          ) : rec.topic_type === "personal" ? (
                            <>
                              <Users className="size-3" /> Team-wise
                            </>
                          ) : (
                            <>
                              <User className="size-3" /> Participant-wise
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Publish Status Badge */}
                        {isFutureSchedule ? (
                          <span className="text-[11px] font-bold bg-amber-500/10 text-amber-800 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="size-3 text-amber-600" />
                            <span>
                              Scheduled: {scheduledDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Zap className="size-3 text-emerald-600" />
                            <span>Published (Spot)</span>
                          </span>
                        )}

                        <span className="text-[11px] font-bold uppercase tracking-wider text-slatebrand bg-navy/5 px-2 py-0.5 rounded-md">
                          {rec.topic_language}
                        </span>
                      </div>
                    </div>

                    {/* Programme Name */}
                    <h3 className="font-bold text-navy text-base leading-snug">
                      {rec.event?.name}
                    </h3>

                    {/* Topic Preview Content based on Mode */}
                    {rec.topic_type === "general" && rec.general_topic && (
                      <div
                        className={`p-3.5 rounded-2xl bg-navy/5 border border-navy/10 text-navy font-semibold text-sm ${
                          isArabic ? "text-right text-base" : "text-left"
                        }`}
                        dir={isArabic ? "rtl" : "ltr"}
                      >
                        {rec.general_topic}
                      </div>
                    )}

                    {rec.topic_type === "personal" && rec.team_topics && (
                      <div className="space-y-2 pt-1">
                        {teams.map((tm) => {
                          const topicVal = rec.team_topics?.[tm.id]
                          if (!topicVal) return null
                          return (
                            <div
                              key={tm.id}
                              className="p-3 rounded-2xl bg-white/80 border border-navy/10 space-y-1"
                            >
                              <div className="flex items-center gap-2 text-xs font-bold">
                                <span
                                  className="size-2.5 rounded-full"
                                  style={{ backgroundColor: tm.color_hex }}
                                />
                                <span className="text-navy">{tm.name}</span>
                              </div>
                              <p
                                className={`text-xs font-semibold text-slatebrand ${
                                  isArabic ? "text-right text-sm" : "text-left"
                                }`}
                                dir={isArabic ? "rtl" : "ltr"}
                              >
                                {topicVal}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {rec.topic_type === "participant" && rec.participant_topics && (
                      <div className="p-3 rounded-2xl bg-navy/5 border border-navy/10 text-xs font-semibold text-navy flex items-center justify-between">
                        <span>Participant-specific Topics</span>
                        <span className="bg-navy text-ivory px-2.5 py-0.5 rounded-full font-bold">
                          {Object.keys(rec.participant_topics).length} Assigned
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-navy/5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenAddModal(rec)}
                      className="h-9 px-3 text-navy hover:bg-navy/8 rounded-xl gap-1.5 cursor-pointer font-bold text-xs"
                    >
                      <Edit2 className="size-3.5 text-navy" />
                      <span>Edit Topic</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteRecord(rec)}
                      className="h-9 px-3 text-destructive hover:bg-destructive/10 rounded-xl gap-1.5 cursor-pointer font-bold text-xs"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Topic Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-ivory border border-navy/10 shadow-2xl rounded-3xl p-6 sm:p-8 scrollbar-thin">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-black text-navy flex items-center gap-2">
              <Sparkles className="size-5 text-gold" />
              {selectedEventId ? "Edit Programme Topic" : "Assign Topic to Programme"}
            </DialogTitle>
            <DialogDescription className="text-slatebrand text-sm">
              Choose assignment mode (General, Personal/Team, or Participant), set publishing schedule, and enter topic content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-3">
            {/* 1. Programme Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                1. Select Programme
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
                <Input
                  placeholder="Search programme by code or name..."
                  value={programmeSearch}
                  onChange={(e) => setProgrammeSearch(e.target.value)}
                  className="pl-9 h-10 bg-ivory/90 border-navy/15 rounded-xl text-sm"
                />
              </div>

              <div className="max-h-40 overflow-y-auto rounded-2xl border border-navy/15 bg-white/70 p-1.5 space-y-1 scrollbar-thin">
                {filteredModalEvents.length === 0 ? (
                  <p className="p-3 text-xs text-center text-slatebrand">
                    No programmes found matching search.
                  </p>
                ) : (
                  filteredModalEvents.map((evt) => {
                    const isSelected = selectedEventId === evt.id
                    const isAssigned = assignedEventIds.has(evt.id)

                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => {
                          setSelectedEventId(evt.id)
                          // If editing existing record, prefill
                          const existing = topicRecords.find((r) => r.event_id === evt.id)
                          if (existing) {
                            handleOpenAddModal(existing)
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-navy text-ivory font-bold shadow-xs"
                            : isAssigned
                            ? "bg-emerald-500/10 text-emerald-950 border border-emerald-500/25 font-semibold"
                            : "hover:bg-navy/6 text-navy font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span
                            className={`font-mono text-[11px] px-2 py-0.5 rounded-md font-extrabold shrink-0 ${
                              isSelected
                                ? "bg-gold text-navy"
                                : isAssigned
                                ? "bg-emerald-600 text-white"
                                : "bg-navy/8 text-navy"
                            }`}
                          >
                            {evt.event_code || "N/A"}
                          </span>
                          <span className="truncate">{evt.name}</span>
                        </div>

                        {isAssigned && (
                          <span
                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              isSelected ? "bg-emerald-500 text-white" : "bg-emerald-600/15 text-emerald-700"
                            }`}
                          >
                            <Check className="size-3 stroke-[3]" />
                            <span>Assigned</span>
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* 2. Topic Assignment Mode Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                2. Topic Assignment Mode
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "general", label: "General", desc: "Same for all 3 teams", icon: Globe },
                  { id: "personal", label: "Personal", desc: "Distinct topic per team", icon: Users },
                  { id: "participant", label: "Participant", desc: "Distinct per participant", icon: User },
                ].map((mode) => {
                  const IconComp = mode.icon
                  const isActive = topicType === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setTopicType(mode.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isActive
                          ? "bg-navy text-ivory border-navy shadow-md ring-2 ring-gold/40"
                          : "bg-white/70 border-navy/15 text-navy hover:border-navy/30"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-extrabold text-xs">
                        <IconComp className={`size-4 ${isActive ? "text-gold" : "text-navy"}`} />
                        <span>{mode.label}</span>
                      </div>
                      <span className={`text-[10px] ${isActive ? "text-ivory/80" : "text-slatebrand"}`}>
                        {mode.desc}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Language & Font Style */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                3. Topic Language / Direction
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "english", label: "English (LTR)" },
                  { id: "malayalam", label: "Malayalam (Anek)" },
                  { id: "arabic", label: "Arabic (RTL)" },
                ].map((lang) => {
                  const isActive = topicLanguage === lang.id
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setTopicLanguage(lang.id as any)}
                      className={`h-10 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                        isActive
                          ? "bg-navy text-ivory border-navy shadow-xs"
                          : "bg-white/60 border-navy/15 text-slatebrand hover:border-navy/30"
                      }`}
                    >
                      <Globe className="size-3.5" />
                      <span>{lang.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 4. Publishing Schedule Setup */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                4. Publishing Time & Schedule
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPublishType("immediate")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    publishType === "immediate"
                      ? "bg-navy text-ivory border-navy shadow-xs"
                      : "bg-white/60 border-navy/15 text-navy hover:border-navy/30"
                  }`}
                >
                  <Zap className={`size-4 ${publishType === "immediate" ? "text-gold" : "text-emerald-600"}`} />
                  <div>
                    <div className="text-xs font-bold">At Spot / Sudden</div>
                    <div className={`text-[10px] ${publishType === "immediate" ? "text-ivory/80" : "text-slatebrand"}`}>
                      Publish immediately in Captain UI
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPublishType("scheduled")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    publishType === "scheduled"
                      ? "bg-navy text-ivory border-navy shadow-xs"
                      : "bg-white/60 border-navy/15 text-navy hover:border-navy/30"
                  }`}
                >
                  <Clock className={`size-4 ${publishType === "scheduled" ? "text-gold" : "text-amber-600"}`} />
                  <div>
                    <div className="text-xs font-bold">Schedule Time</div>
                    <div className={`text-[10px] ${publishType === "scheduled" ? "text-ivory/80" : "text-slatebrand"}`}>
                      Visible after scheduled time arrives
                    </div>
                  </div>
                </button>
              </div>

              {publishType === "scheduled" && (
                <div className="pt-2">
                  <Label className="text-xs font-bold text-slatebrand mb-1 block">
                    Select Scheduled Publish Date & Time
                  </Label>
                  <Input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="h-11 bg-white border-navy/15 rounded-xl text-sm font-semibold text-navy"
                  />
                </div>
              )}
            </div>

            {/* 5. Dynamic Topic Input Content based on Mode */}
            <div className="space-y-3 pt-2 border-t border-navy/10">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy block">
                5. Enter Topic Content
              </Label>

              {/* Mode A: General */}
              {topicType === "general" && (
                <Textarea
                  placeholder={
                    topicLanguage === "arabic"
                      ? "اكتب الموضوع العام هنا..."
                      : "Enter the general topic applicable for all teams..."
                  }
                  value={generalTopicText}
                  onChange={(e) => setGeneralTopicText(e.target.value)}
                  dir={topicLanguage === "arabic" ? "rtl" : "ltr"}
                  className={`min-h-[110px] bg-white/80 border-navy/15 focus:border-gold rounded-2xl text-base p-3.5 font-sans ${
                    topicLanguage === "arabic" ? "text-lg" : ""
                  }`}
                />
              )}

              {/* Mode B: Personal (Team-wise) */}
              {topicType === "personal" && (
                <div className="space-y-3">
                  <p className="text-xs text-slatebrand">
                    Enter specific topic for each of the 3 teams below:
                  </p>
                  {teams.map((tm) => (
                    <div key={tm.id} className="p-3.5 rounded-2xl bg-white/80 border border-navy/15 space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: tm.color_hex }}
                        />
                        <span className="font-extrabold text-navy text-xs">{tm.name}</span>
                      </div>
                      <Textarea
                        placeholder={`Enter topic for ${tm.name}...`}
                        value={teamTopicsMap[tm.id] || ""}
                        onChange={(e) =>
                          setTeamTopicsMap({
                            ...teamTopicsMap,
                            [tm.id]: e.target.value,
                          })
                        }
                        dir={topicLanguage === "arabic" ? "rtl" : "ltr"}
                        className={`min-h-[75px] bg-ivory/60 border-navy/10 rounded-xl text-sm p-2.5 font-sans ${
                          topicLanguage === "arabic" ? "text-base" : ""
                        }`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Mode C: Participant-wise */}
              {topicType === "participant" && (
                <div className="space-y-3">
                  <p className="text-xs text-slatebrand">
                    Enter individual topic for registered participants in this programme:
                  </p>

                  {!selectedEventId ? (
                    <p className="p-4 text-xs text-center text-slatebrand bg-white/60 rounded-2xl">
                      Please select a programme first to load participants.
                    </p>
                  ) : loadingParticipants ? (
                    <div className="flex items-center justify-center p-6 text-slatebrand">
                      <Loader2 className="size-6 animate-spin text-gold mr-2" />
                      <span className="text-xs font-semibold">Loading registered participants...</span>
                    </div>
                  ) : participants.length === 0 ? (
                    <div className="p-4 text-xs text-center text-slatebrand bg-white/60 rounded-2xl">
                      No participants registered for this programme yet. You can type manual participant topic entries below or register students first.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                      {participants.map((pt) => (
                        <div
                          key={pt.participation_id}
                          className="p-3 rounded-2xl bg-white/80 border border-navy/15 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-extrabold bg-navy/8 px-2 py-0.5 rounded-md text-navy">
                                #{pt.chest_no}
                              </span>
                              <span className="font-bold text-navy">{pt.student_name}</span>
                            </div>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: pt.team_color }}
                            >
                              {pt.team_name}
                            </span>
                          </div>

                          <Textarea
                            placeholder={`Enter topic for ${pt.student_name}...`}
                            value={participantTopicsMap[pt.student_id] || ""}
                            onChange={(e) =>
                              setParticipantTopicsMap({
                                ...participantTopicsMap,
                                [pt.student_id]: e.target.value,
                              })
                            }
                            dir={topicLanguage === "arabic" ? "rtl" : "ltr"}
                            className={`min-h-[70px] bg-ivory/60 border-navy/10 rounded-xl text-sm p-2.5 font-sans ${
                              topicLanguage === "arabic" ? "text-base" : ""
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-navy/15 text-navy hover:bg-navy/5 rounded-xl h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTopic}
              disabled={saving || !selectedEventId}
              className="bg-navy hover:bg-navy/90 text-ivory gap-2 rounded-xl h-11 px-6 shadow-premium cursor-pointer font-bold"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin text-gold" />
                  Saving Topic...
                </>
              ) : (
                <>
                  <Check className="size-4 text-gold" />
                  Save & Publish Topic
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteRecord} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <DialogContent className="max-w-md bg-ivory border border-navy/10 shadow-2xl rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-black text-navy flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Remove Topic Configuration
            </DialogTitle>
            <DialogDescription className="text-slatebrand text-sm">
              Are you sure you want to delete the assigned topic for{" "}
              <span className="font-bold text-navy">{deleteRecord?.event?.name}</span>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteRecord(null)}
              className="border-navy/15 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTopic}
              disabled={deleting}
              className="rounded-xl gap-2 cursor-pointer font-bold"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Remove Topic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
