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
} from "lucide-react"

interface ProgrammeEvent {
  id: string
  name: string
  event_code: string | null
  category: "OFF STAGE" | "ON STAGE" | "GENERAL" | "SPECIAL"
  topic: string | null
  topic_language: "english" | "malayalam" | "arabic" | null
}

export default function AdminTopicAssignPage() {
  const [events, setEvents] = useState<ProgrammeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [programmeSearch, setProgrammeSearch] = useState("")
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [topicText, setTopicText] = useState("")
  const [topicLanguage, setTopicLanguage] = useState<"english" | "malayalam" | "arabic">("english")
  const [saving, setSaving] = useState(false)

  // Delete Confirmation Modal
  const [deleteEvent, setDeleteEvent] = useState<ProgrammeEvent | null>(null)
  const [dbColumnMissing, setDbColumnMissing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()

  const fetchEvents = async () => {
    setLoading(true)
    setDbColumnMissing(false)

    const { data, error } = await (supabase.from("events") as any)
      .select("id, name, event_code, category, topic, topic_language")
      .order("event_code", { ascending: true })

    if (error) {
      console.warn("Could not query topic columns (migration may be needed):", error)
      const fallback = await (supabase.from("events") as any)
        .select("id, name, event_code, category")
        .order("event_code", { ascending: true })

      if (fallback.error) {
        toast.error("Failed to load programmes")
        console.error(fallback.error)
      } else {
        setEvents(
          (fallback.data || []).map((e: any) => ({
            ...e,
            topic: null,
            topic_language: null,
          }))
        )
        setDbColumnMissing(true)
      }
    } else {
      setEvents((data as ProgrammeEvent[]) || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleOpenAddModal = (eventToEdit?: ProgrammeEvent) => {
    if (eventToEdit) {
      setSelectedEventId(eventToEdit.id)
      setTopicText(eventToEdit.topic || "")
      setTopicLanguage(eventToEdit.topic_language || "english")
    } else {
      setSelectedEventId(null)
      setTopicText("")
      setTopicLanguage("english")
    }
    setProgrammeSearch("")
    setIsModalOpen(true)
  }

  const handleSaveTopic = async () => {
    if (!selectedEventId) {
      toast.error("Please select a programme")
      return
    }
    if (!topicText.trim()) {
      toast.error("Please enter a topic")
      return
    }

    setSaving(true)
    const { error } = await (supabase.from("events") as any)
      .update({
        topic: topicText.trim(),
        topic_language: topicLanguage,
      })
      .eq("id", selectedEventId)

    if (error) {
      if (error.message?.includes("column") || error.code === "42703") {
        toast.error("Database column 'topic' missing. Please run SQL migration script 20260809000000_add_event_topics.sql in Supabase SQL editor.")
        setDbColumnMissing(true)
      } else {
        toast.error("Failed to save topic: " + (error.message || "Unknown error"))
      }
      console.error(error)
    } else {
      toast.success("Topic assigned successfully")
      setIsModalOpen(false)
      fetchEvents()
    }
    setSaving(false)
  }

  const handleDeleteTopic = async () => {
    if (!deleteEvent) return
    setDeleting(true)

    const { error } = await (supabase.from("events") as any)
      .update({
        topic: null,
        topic_language: null,
      })
      .eq("id", deleteEvent.id)

    if (error) {
      toast.error("Failed to delete topic")
      console.error(error)
    } else {
      toast.success("Topic removed successfully")
      setDeleteEvent(null)
      fetchEvents()
    }
    setDeleting(false)
  }

  // Filter programmes that ALREADY have topics assigned for the main list
  const assignedEvents = events.filter(
    (e) => e.topic && e.topic.trim().length > 0
  )

  const filteredAssignedEvents = assignedEvents.filter((e) => {
    const q = searchQuery.toLowerCase()
    return (
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.event_code && e.event_code.toLowerCase().includes(q)) ||
      (e.topic && e.topic.toLowerCase().includes(q))
    )
  })

  // Filter for modal programme selector
  const filteredModalEvents = events.filter((e) => {
    const q = programmeSearch.toLowerCase()
    return (
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.event_code && e.event_code.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy flex items-center gap-2">
            <BookOpen className="size-6 text-gold" />
            Topic Assign
          </h1>
          <p className="text-sm text-slatebrand mt-1">
            Assign, manage, and release subjects or topics for festival programmes.
          </p>
        </div>

        <Button
          onClick={() => handleOpenAddModal()}
          className="bg-navy hover:bg-navy/90 text-ivory gap-2 shadow-premium rounded-xl px-5 h-11 cursor-pointer"
        >
          <Plus className="size-4 text-gold" />
          <span>Add a Topic</span>
        </Button>
      </div>

      {/* Database Column Missing Notice Banner */}
      {dbColumnMissing && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-950 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-navy">Database Migration Required</p>
              <p className="text-slatebrand font-medium">
                The <code className="font-mono bg-amber-500/15 px-1 py-0.5 rounded text-navy font-bold">topic</code> column does not exist in your Supabase <code className="font-mono bg-amber-500/15 px-1 py-0.5 rounded text-navy font-bold">events</code> table yet.
              </p>
            </div>
          </div>
          <div className="font-mono text-[11px] bg-navy text-ivory p-2.5 rounded-xl select-all shrink-0">
            ALTER TABLE public.events ADD COLUMN IF NOT EXISTS topic TEXT, ADD COLUMN IF NOT EXISTS topic_language TEXT;
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
          <Input
            placeholder="Search by programme code, name, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-ivory/80 border-navy/10 focus:border-gold rounded-xl shadow-xs"
          />
        </div>

        {/* Assigned Topics List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-ivory/60 rounded-3xl border border-navy/10 text-slatebrand">
            <Loader2 className="size-8 animate-spin text-gold mb-2" />
            <p className="text-sm font-medium">Loading topics...</p>
          </div>
        ) : filteredAssignedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-ivory/60 rounded-3xl border border-navy/10">
            <div className="size-16 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-4">
              <BookOpen className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-navy">No Topics Found</h3>
            <p className="text-sm text-slatebrand max-w-md mt-1 mb-6">
              {searchQuery
                ? "No assigned topics match your search criteria."
                : "No topics have been assigned to any programme yet. Click 'Add a Topic' to get started."}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => handleOpenAddModal()}
                className="bg-navy hover:bg-navy/90 text-ivory gap-2 rounded-xl cursor-pointer"
              >
                <Plus className="size-4 text-gold" /> Add First Topic
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssignedEvents.map((evt) => {
              const isArabic = evt.topic_language === "arabic"
              return (
                <div
                  key={evt.id}
                  className="rounded-3xl border border-navy/10 bg-ivory/80 p-5 shadow-xs hover:border-gold/30 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    {/* Badge & Meta Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-navy bg-navy/8 px-2.5 py-1 rounded-lg">
                          {evt.event_code || "N/A"}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slatebrand bg-navy/5 px-2 py-0.5 rounded-md">
                          {evt.category}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          isArabic
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                            : evt.topic_language === "malayalam"
                            ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                            : "bg-blue-500/10 text-blue-700 border-blue-500/20"
                        }`}
                      >
                        {evt.topic_language || "english"}
                      </span>
                    </div>

                    {/* Programme Title */}
                    <h3 className="font-bold text-navy text-base leading-snug">
                      {evt.name}
                    </h3>

                    {/* Topic Box */}
                    <div
                      className={`p-4 rounded-2xl bg-navy/5 border border-navy/10 text-navy font-semibold text-base font-sans ${
                        isArabic ? "text-right text-lg" : "text-left"
                      }`}
                      dir={isArabic ? "rtl" : "ltr"}
                    >
                      {evt.topic}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-navy/5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenAddModal(evt)}
                      className="h-9 px-3 text-navy hover:bg-navy/8 rounded-xl gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="size-3.5 text-navy" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteEvent(evt)}
                      className="h-9 px-3 text-destructive hover:bg-destructive/10 rounded-xl gap-1.5 cursor-pointer"
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
        <DialogContent className="max-w-xl bg-ivory border border-navy/10 shadow-2xl rounded-3xl p-6 sm:p-8">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-black text-navy flex items-center gap-2">
              <Sparkles className="size-5 text-gold" />
              {selectedEventId ? "Edit Programme Topic" : "Assign Topic to Programme"}
            </DialogTitle>
            <DialogDescription className="text-slatebrand text-sm">
              Select a programme, choose the topic language style, and enter the topic.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Programme Selector with Search */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                Select Programme
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

              {/* Scrollable Programme Selection List */}
              <div className="max-h-48 overflow-y-auto rounded-2xl border border-navy/15 bg-white/70 p-1.5 space-y-1 scrollbar-thin">
                {filteredModalEvents.length === 0 ? (
                  <p className="p-3 text-xs text-center text-slatebrand">
                    No programmes found matching search.
                  </p>
                ) : (
                  filteredModalEvents.map((evt) => {
                    const isSelected = selectedEventId === evt.id
                    const isAssigned = !!(evt.topic && evt.topic.trim().length > 0)

                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => {
                          setSelectedEventId(evt.id)
                          // Pre-fill topic if assigned
                          if (evt.topic) {
                            setTopicText(evt.topic)
                            setTopicLanguage(evt.topic_language || "english")
                          } else if (!selectedEventId) {
                            setTopicText("")
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

                        {/* Assigned Green Tick Indicator */}
                        {isAssigned && (
                          <span
                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              isSelected
                                ? "bg-emerald-500 text-white"
                                : "bg-emerald-600/15 text-emerald-700"
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

            {/* Language Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                Topic Language / Display Style
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "english", label: "English (LTR)" },
                  { id: "malayalam", label: "Malayalam (LTR)" },
                  { id: "arabic", label: "Arabic (RTL)" },
                ].map((lang) => {
                  const isActive = topicLanguage === lang.id
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() =>
                        setTopicLanguage(lang.id as "english" | "malayalam" | "arabic")
                      }
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

            {/* Topic Text Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                  Topic Content
                </Label>
                <span className="text-[11px] font-semibold text-slatebrand">
                  Direction: {topicLanguage === "arabic" ? "Right-to-Left (RTL)" : "Left-to-Right (LTR)"}
                </span>
              </div>
              <Textarea
                placeholder={
                  topicLanguage === "arabic"
                    ? "اكتب الموضوع هنا..."
                    : "Enter the topic or subject text here..."
                }
                value={topicText}
                onChange={(e) => setTopicText(e.target.value)}
                dir={topicLanguage === "arabic" ? "rtl" : "ltr"}
                className={`min-h-[110px] bg-white/80 border-navy/15 focus:border-gold rounded-2xl text-base p-3.5 font-sans ${
                  topicLanguage === "arabic" ? "text-lg" : ""
                }`}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-navy/15 text-navy hover:bg-navy/5 rounded-xl h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTopic}
              disabled={saving || !selectedEventId || !topicText.trim()}
              className="bg-navy hover:bg-navy/90 text-ivory gap-2 rounded-xl h-11 px-6 shadow-premium cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin text-gold" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="size-4 text-gold" />
                  Save Topic
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteEvent} onOpenChange={(open) => !open && setDeleteEvent(null)}>
        <DialogContent className="max-w-md bg-ivory border border-navy/10 shadow-2xl rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-black text-navy flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Remove Topic
            </DialogTitle>
            <DialogDescription className="text-slatebrand text-sm">
              Are you sure you want to remove the assigned topic for{" "}
              <span className="font-bold text-navy">{deleteEvent?.name}</span> ({deleteEvent?.event_code})?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteEvent(null)}
              className="border-navy/15 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTopic}
              disabled={deleting}
              className="rounded-xl gap-2 cursor-pointer"
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
