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
  Clock,
  Edit2,
  Trash2,
  Loader2,
  Sparkles,
  Check,
  Globe,
  Share2,
  ExternalLink,
  AlertTriangle,
  Copy,
} from "lucide-react"

interface ProgrammeEvent {
  id: string
  name: string
  event_code: string | null
  category: string
}

interface ProgrammeTimerRecord {
  id: string
  programme_id: string
  language: "english" | "malayalam" | "arabic"
  subject: string
  duration_seconds: number
  created_at?: string
  programme?: ProgrammeEvent
}

// Convert seconds to HH:MM:SS string
function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function AdminTimerPage() {
  const [events, setEvents] = useState<ProgrammeEvent[]>([])
  const [timers, setTimers] = useState<ProgrammeTimerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [programmeSearch, setProgrammeSearch] = useState("")
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null)
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>("")
  const [language, setLanguage] = useState<"english" | "malayalam" | "arabic">("english")
  const [subjectText, setSubjectText] = useState("")
  const [hours, setHours] = useState<number>(0)
  const [minutes, setMinutes] = useState<number>(10)
  const [seconds, setSeconds] = useState<number>(0)

  const [saving, setSaving] = useState(false)
  const [deleteTimer, setDeleteTimer] = useState<ProgrammeTimerRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [dbTableMissing, setDbTableMissing] = useState(false)

  const supabase = createClient()

  // Fetch Events and Timers
  const fetchData = async () => {
    setLoading(true)
    setDbTableMissing(false)

    // 1. Fetch Events / Programmes
    const { data: eventsData } = await (supabase.from("events") as any)
      .select("id, name, event_code, category")
      .order("event_code", { ascending: true })

    if (eventsData) setEvents((eventsData as ProgrammeEvent[]) || [])

    // 2. Fetch Programme Timers
    const { data: timersData, error } = await (supabase.from("programme_timers") as any)
      .select(`
        id,
        programme_id,
        language,
        subject,
        duration_seconds,
        created_at,
        programme:events ( id, name, event_code, category )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Could not fetch programme_timers table (migration required):", error)
      setDbTableMissing(true)
      setTimers([])
    } else if (timersData) {
      setTimers((timersData as ProgrammeTimerRecord[]) || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Open Modal for Create or Edit
  const handleOpenModal = (timerToEdit?: ProgrammeTimerRecord) => {
    if (timerToEdit) {
      setEditingTimerId(timerToEdit.id)
      setSelectedProgrammeId(timerToEdit.programme_id)
      setLanguage(timerToEdit.language || "english")
      setSubjectText(timerToEdit.subject || "")

      const total = timerToEdit.duration_seconds || 600
      const h = Math.floor(total / 3600)
      const m = Math.floor((total % 3600) / 60)
      const s = total % 60
      setHours(h)
      setMinutes(m)
      setSeconds(s)
    } else {
      setEditingTimerId(null)
      setSelectedProgrammeId("")
      setLanguage("english")
      setSubjectText("")
      setHours(0)
      setMinutes(10)
      setSeconds(0)
    }
    setProgrammeSearch("")
    setIsModalOpen(true)
  }

  // Save Timer Record
  const handleSaveTimer = async () => {
    if (!selectedProgrammeId) {
      toast.error("Please select a programme")
      return
    }
    if (!subjectText.trim()) {
      toast.error("Please enter the subject / topic content")
      return
    }

    const totalSecs = (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0)
    if (totalSecs <= 0) {
      toast.error("Please specify a duration greater than 0 seconds")
      return
    }

    setSaving(true)

    const payload = {
      programme_id: selectedProgrammeId,
      language,
      subject: subjectText.trim(),
      duration_seconds: totalSecs,
      updated_at: new Date().toISOString(),
    }

    if (editingTimerId) {
      const { error } = await (supabase.from("programme_timers") as any)
        .update(payload)
        .eq("id", editingTimerId)

      if (error) {
        toast.error("Failed to update timer: " + error.message)
        console.error(error)
      } else {
        toast.success("Programme timer updated successfully")
        setIsModalOpen(false)
        fetchData()
      }
    } else {
      const { error } = await (supabase.from("programme_timers") as any)
        .insert(payload)

      if (error) {
        if (error.message?.includes("table") || error.code === "42P01") {
          toast.error("Database table 'programme_timers' missing. Run migration script 20260813000000_create_programme_timers.sql")
          setDbTableMissing(true)
        } else {
          toast.error("Failed to create timer: " + error.message)
        }
        console.error(error)
      } else {
        toast.success("Programme timer created successfully!")
        setIsModalOpen(false)
        fetchData()
      }
    }

    setSaving(false)
  }

  // Delete Timer Record
  const handleDeleteTimer = async () => {
    if (!deleteTimer) return
    setDeleting(true)

    const { error } = await (supabase.from("programme_timers") as any)
      .delete()
      .eq("id", deleteTimer.id)

    if (error) {
      toast.error("Failed to delete timer: " + error.message)
    } else {
      toast.success("Timer deleted successfully")
      setDeleteTimer(null)
      fetchData()
    }
    setDeleting(false)
  }

  // Copy Shareable Link to Clipboard
  const handleCopyLink = (timerId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const shareUrl = `${origin}/timer/${timerId}`

    navigator.clipboard.writeText(shareUrl)
    toast.success("Share link copied to clipboard!", {
      description: shareUrl,
    })
  }

  // Filter timers for search
  const filteredTimers = timers.filter((t) => {
    const q = searchQuery.toLowerCase()
    const code = t.programme?.event_code?.toLowerCase() || ""
    const name = t.programme?.name?.toLowerCase() || ""
    const subject = t.subject?.toLowerCase() || ""

    return code.includes(q) || name.includes(q) || subject.includes(q)
  })

  // Filter modal programmes
  const filteredModalEvents = events.filter((e) => {
    const q = programmeSearch.toLowerCase()
    return (
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.event_code && e.event_code.toLowerCase().includes(q))
    )
  })

  const configuredEventIds = new Set(timers.map((t) => t.programme_id))

  return (
    <div className="space-y-6 font-sans">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy flex items-center gap-2">
            <Clock className="size-6 text-gold" />
            Programme Timer & Subject Reveal Portal
          </h1>
          <p className="text-sm text-slatebrand mt-1">
            Create programme-specific timers, set subject text in English/Malayalam/Arabic, and generate shareable reveal screen links.
          </p>
        </div>

        <Button
          onClick={() => handleOpenModal()}
          className="bg-navy hover:bg-navy/90 text-ivory gap-2 shadow-premium rounded-xl px-5 h-11 cursor-pointer font-bold shrink-0"
        >
          <Plus className="size-4 text-gold" />
          <span>+ Create Timer</span>
        </Button>
      </div>

      {/* Database Missing Notice */}
      {dbTableMissing && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-950 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-navy">Database Migration Required</p>
              <p className="text-slatebrand font-medium">
                The <code className="font-mono bg-amber-500/15 px-1 py-0.5 rounded text-navy font-bold">programme_timers</code> table is not present in your Supabase database yet.
              </p>
            </div>
          </div>
          <div className="font-mono text-[11px] bg-navy text-ivory p-2.5 rounded-xl select-all shrink-0">
            Run migration: 20260813000000_create_programme_timers.sql
          </div>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
        <Input
          placeholder="Search timer records by code, programme, or subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-ivory/80 border-navy/10 focus:border-gold rounded-xl shadow-xs text-sm"
        />
      </div>

      {/* Timers Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-ivory/60 rounded-3xl border border-navy/10 text-slatebrand">
          <Loader2 className="size-8 animate-spin text-gold mb-2" />
          <p className="text-sm font-medium">Loading programme timers...</p>
        </div>
      ) : filteredTimers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-ivory/60 rounded-3xl border border-navy/10">
          <div className="size-16 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-4">
            <Clock className="size-8" />
          </div>
          <h3 className="text-lg font-bold text-navy">No Timers Configured</h3>
          <p className="text-sm text-slatebrand max-w-md mt-1 mb-6">
            {searchQuery
              ? "No timer records match your search criteria."
              : "No programme timers have been created yet. Click '+ Create Timer' to get started."}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => handleOpenModal()}
              className="bg-navy hover:bg-navy/90 text-ivory gap-2 rounded-xl cursor-pointer font-bold"
            >
              <Plus className="size-4 text-gold" /> Create First Timer
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTimers.map((tm) => {
            const isArabic = tm.language === "arabic"

            return (
              <div
                key={tm.id}
                className="rounded-3xl border border-navy/10 bg-ivory/80 p-5 shadow-xs hover:border-gold/30 transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Card Header Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-navy bg-navy/8 px-2.5 py-1 rounded-lg">
                        {tm.programme?.event_code || "N/A"}
                      </span>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slatebrand bg-navy/5 px-2 py-0.5 rounded-md">
                        {tm.programme?.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-extrabold bg-navy text-ivory px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="size-3 text-gold" />
                        <span>{formatDuration(tm.duration_seconds)}</span>
                      </span>

                      <span className="text-[11px] font-bold uppercase tracking-wider text-slatebrand bg-navy/5 px-2.5 py-0.5 rounded-md">
                        {tm.language}
                      </span>
                    </div>
                  </div>

                  {/* Programme Name */}
                  <h3 className="font-bold text-navy text-base leading-snug">
                    {tm.programme?.name}
                  </h3>

                  {/* Subject Preview Box */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slatebrand">
                      {tm.language === "malayalam"
                        ? "വിഷയം (Subject)"
                        : tm.language === "arabic"
                        ? "عنوان (Subject)"
                        : "Subject"}
                    </span>
                    <div
                      className={`p-3 rounded-2xl bg-white/80 border border-navy/10 text-navy font-semibold text-sm leading-relaxed ${
                        isArabic ? "text-right font-sans text-base text-emerald-950" : "text-left"
                      }`}
                      dir={isArabic ? "rtl" : "ltr"}
                    >
                      {tm.subject}
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-navy/5 flex-wrap">
                  <div className="flex items-center gap-2">
                    {/* Copy Share Link */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(tm.id)}
                      className="h-9 px-3 border-navy/15 text-navy hover:bg-navy/5 rounded-xl gap-1.5 cursor-pointer font-bold text-xs"
                    >
                      <Copy className="size-3.5 text-navy" />
                      <span>Copy Link</span>
                    </Button>

                    {/* Open Reveal Screen */}
                    <a
                      href={`/timer/${tm.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 h-9 px-3 bg-gold/15 hover:bg-gold/25 text-navy font-bold text-xs rounded-xl transition-all border border-gold/30"
                    >
                      <ExternalLink className="size-3.5 text-navy" />
                      <span>Open Screen</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(tm)}
                      className="size-8 p-0 text-navy hover:bg-navy/8 rounded-lg cursor-pointer"
                      title="Edit Timer"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTimer(tm)}
                      className="size-8 p-0 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                      title="Delete Timer"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Timer Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-ivory border border-navy/10 shadow-2xl rounded-3xl p-6 sm:p-8">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-black text-navy flex items-center gap-2">
              <Sparkles className="size-5 text-gold" />
              {editingTimerId ? "Edit Programme Timer" : "Create Programme Timer"}
            </DialogTitle>
            <DialogDescription className="text-slatebrand text-sm">
              Select a programme, choose language style, enter topic, and set timer duration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* 1. Programme Selector */}
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

              <div className="max-h-40 overflow-y-auto rounded-2xl border border-navy/15 bg-white/80 p-1.5 space-y-1 scrollbar-thin">
                {filteredModalEvents.length === 0 ? (
                  <p className="p-3 text-xs text-center text-slatebrand">
                    No programmes found matching search.
                  </p>
                ) : (
                  filteredModalEvents.map((evt) => {
                    const isSelected = selectedProgrammeId === evt.id
                    const hasTimer = configuredEventIds.has(evt.id)

                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => setSelectedProgrammeId(evt.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-navy text-ivory border-2 border-gold ring-2 ring-gold/40 font-black shadow-md"
                            : hasTimer
                            ? "bg-emerald-500/10 text-emerald-950 border border-emerald-500/25 font-semibold"
                            : "hover:bg-navy/6 text-navy font-medium bg-white/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span
                            className={`font-mono text-[11px] px-2 py-0.5 rounded-md font-extrabold shrink-0 ${
                              isSelected
                                ? "bg-gold text-navy font-black"
                                : hasTimer
                                ? "bg-emerald-600 text-white"
                                : "bg-navy/8 text-navy"
                            }`}
                          >
                            {evt.event_code || "N/A"}
                          </span>
                          <span className={`truncate ${isSelected ? "text-ivory font-black text-sm" : ""}`}>{evt.name}</span>
                        </div>

                        {isSelected ? (
                          <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-gold text-navy shadow-sm shrink-0">
                            <Check className="size-3 stroke-[3]" />
                            <span>SELECTED</span>
                          </span>
                        ) : hasTimer ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600/15 text-emerald-700 shrink-0">
                            <Check className="size-3 stroke-[3]" />
                            <span>Has Timer</span>
                          </span>
                        ) : null}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* 2. Language Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                Language & Subject Heading Style
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "english", label: "English", heading: "Subject" },
                  { id: "malayalam", label: "Malayalam", heading: "വിഷയം" },
                  { id: "arabic", label: "Arabic", heading: "عنوان" },
                ].map((lang) => {
                  const isActive = language === lang.id
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setLanguage(lang.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        isActive
                          ? "bg-navy text-ivory border-navy shadow-xs font-bold"
                          : "bg-white/70 border-navy/15 text-slatebrand hover:border-navy/30"
                      }`}
                    >
                      <span className="text-xs">{lang.label}</span>
                      <span className={`text-[10px] ${isActive ? "text-gold" : "text-slatebrand"}`}>
                        ({lang.heading})
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Subject / Topic Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                  Subject Content ({language === "malayalam" ? "വിഷയം" : language === "arabic" ? "عنوان" : "Subject"})
                </Label>
              </div>
              <Textarea
                placeholder={
                  language === "arabic"
                    ? "اكتب الموضوع هنا..."
                    : language === "malayalam"
                    ? "വിഷയം ഇവിടെ നൽകുക..."
                    : "Enter subject topic text..."
                }
                value={subjectText}
                onChange={(e) => setSubjectText(e.target.value)}
                dir={language === "arabic" ? "rtl" : "ltr"}
                className={`min-h-[90px] bg-white border-navy/15 focus:border-gold rounded-2xl text-sm p-3 font-sans ${
                  language === "arabic" ? "text-base" : ""
                }`}
              />
            </div>

            {/* 4. Timer Duration Setup (Hours, Minutes, Seconds) */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                Timer Duration (HH:MM:SS)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slatebrand block text-center">Hours</span>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={hours}
                    onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-10 text-center font-mono font-bold text-navy text-sm bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slatebrand block text-center">Minutes</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-10 text-center font-mono font-bold text-navy text-sm bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slatebrand block text-center">Seconds</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={seconds}
                    onChange={(e) => setSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-10 text-center font-mono font-bold text-navy text-sm bg-white"
                  />
                </div>
              </div>
              <p className="text-[11px] font-semibold text-center text-slatebrand pt-1">
                Configured Duration:{" "}
                <span className="font-mono font-black text-navy">
                  {formatDuration(hours * 3600 + minutes * 60 + seconds)}
                </span>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-navy/15 text-navy hover:bg-navy/5 rounded-xl h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTimer}
              disabled={saving || !selectedProgrammeId || !subjectText.trim()}
              className="bg-navy hover:bg-navy/90 text-ivory gap-2 rounded-xl h-11 px-6 shadow-premium cursor-pointer font-bold"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin text-gold" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="size-4 text-gold" />
                  Save & Generate Link
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTimer} onOpenChange={(open) => !open && setDeleteTimer(null)}>
        <DialogContent className="max-w-md bg-ivory border border-navy/10 shadow-2xl rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-black text-navy flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Remove Timer Configuration
            </DialogTitle>
            <DialogDescription className="text-slatebrand text-sm">
              Are you sure you want to remove the timer for{" "}
              <span className="font-bold text-navy">{deleteTimer?.programme?.name}</span>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTimer(null)}
              className="border-navy/15 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTimer}
              disabled={deleting}
              className="rounded-xl gap-2 cursor-pointer font-bold"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Remove Timer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
