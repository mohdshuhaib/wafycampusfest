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
  ExternalLink,
  AlertTriangle,
  Copy,
  Layers,
  KeyRound,
  RefreshCw,
} from "lucide-react"

interface ProgrammeEvent {
  id: string
  name: string
  event_code: string | null
  category: string
}

interface ProgrammeSlotData {
  programme_id: string
  language: "english" | "malayalam" | "arabic"
  subject: string
  duration_seconds: number
  programme?: ProgrammeEvent
}

interface ProgrammeTimerRecord {
  id: string
  programme_id?: string | null
  language?: "english" | "malayalam" | "arabic" | null
  subject?: string | null
  duration_seconds?: number | null
  slots_count: number
  programme_slots?: ProgrammeSlotData[]
  access_code?: string
  created_at?: string
  programme?: ProgrammeEvent
}

interface SlotFormState {
  programme_id: string
  language: "english" | "malayalam" | "arabic"
  subject: string
  hours: number
  minutes: number
  seconds: number
}

// Convert seconds to HH:MM:SS string
function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function generateRandomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default function AdminTimerPage() {
  const [events, setEvents] = useState<ProgrammeEvent[]>([])
  const [timers, setTimers] = useState<ProgrammeTimerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null)
  const [slotsCount, setSlotsCount] = useState<1 | 2 | 3>(1)
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0)
  const [accessCode, setAccessCode] = useState<string>("")
  const [programmeSearch, setProgrammeSearch] = useState("")

  const defaultSlotForm = (): SlotFormState => ({
    programme_id: "",
    language: "english",
    subject: "",
    hours: 0,
    minutes: 10,
    seconds: 0,
  })

  const [slotsForm, setSlotsForm] = useState<SlotFormState[]>([
    defaultSlotForm(),
    defaultSlotForm(),
    defaultSlotForm(),
  ])

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

    const eventsList = (eventsData as ProgrammeEvent[]) || []
    setEvents(eventsList)

    const eventsMap = new Map<string, ProgrammeEvent>()
    eventsList.forEach((e) => eventsMap.set(e.id, e))

    // 2. Fetch Programme Timers
    const { data: timersData, error } = await (supabase.from("programme_timers") as any)
      .select(`
        id,
        programme_id,
        language,
        subject,
        duration_seconds,
        slots_count,
        programme_slots,
        access_code,
        created_at,
        programme:events ( id, name, event_code, category )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Could not fetch programme_timers table:", error)
      setDbTableMissing(true)
      setTimers([])
    } else if (timersData) {
      const formatted: ProgrammeTimerRecord[] = (timersData as any[]).map((row) => {
        let count = row.slots_count || 1
        let slots: ProgrammeSlotData[] = row.programme_slots || []

        if (!slots || slots.length === 0) {
          if (row.programme_id) {
            slots = [
              {
                programme_id: row.programme_id,
                language: row.language || "english",
                subject: row.subject || "",
                duration_seconds: row.duration_seconds || 600,
                programme: row.programme,
              },
            ]
            count = 1
          }
        } else {
          slots = slots.map((s) => ({
            ...s,
            programme: eventsMap.get(s.programme_id),
          }))
        }

        return {
          ...row,
          slots_count: count,
          programme_slots: slots,
          access_code: row.access_code || generateRandomCode(),
        }
      })
      setTimers(formatted)
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
      const count = (timerToEdit.slots_count || 1) as 1 | 2 | 3
      setSlotsCount(count)
      setActiveSlotIdx(0)
      setAccessCode(timerToEdit.access_code || generateRandomCode())

      const slots = timerToEdit.programme_slots || []
      const newFormState: SlotFormState[] = [
        defaultSlotForm(),
        defaultSlotForm(),
        defaultSlotForm(),
      ]

      for (let i = 0; i < 3; i++) {
        if (i < slots.length && slots[i]) {
          const totalSecs = slots[i].duration_seconds || 600
          newFormState[i] = {
            programme_id: slots[i].programme_id || "",
            language: slots[i].language || "english",
            subject: slots[i].subject || "",
            hours: Math.floor(totalSecs / 3600),
            minutes: Math.floor((totalSecs % 3600) / 60),
            seconds: totalSecs % 60,
          }
        }
      }
      setSlotsForm(newFormState)
    } else {
      setEditingTimerId(null)
      setSlotsCount(1)
      setActiveSlotIdx(0)
      setAccessCode(generateRandomCode())
      setSlotsForm([defaultSlotForm(), defaultSlotForm(), defaultSlotForm()])
    }
    setProgrammeSearch("")
    setIsModalOpen(true)
  }

  // Update specific slot form value
  const updateSlotForm = (idx: number, key: keyof SlotFormState, val: any) => {
    setSlotsForm((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: val }
      return next
    })
  }

  // Save Timer Record
  const handleSaveTimer = async () => {
    const activeSlots = slotsForm.slice(0, slotsCount)

    for (let i = 0; i < activeSlots.length; i++) {
      const s = activeSlots[i]
      if (!s.programme_id) {
        toast.error(`Please select a programme for Slot #${i + 1}`)
        setActiveSlotIdx(i)
        return
      }
      if (!s.subject.trim()) {
        toast.error(`Please enter the subject content for Slot #${i + 1}`)
        setActiveSlotIdx(i)
        return
      }
      const totalSecs = (s.hours || 0) * 3600 + (s.minutes || 0) * 60 + (s.seconds || 0)
      if (totalSecs <= 0) {
        toast.error(`Please specify a duration > 0 seconds for Slot #${i + 1}`)
        setActiveSlotIdx(i)
        return
      }
    }

    if (!accessCode || accessCode.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit access code")
      return
    }

    setSaving(true)

    const programmeSlots = activeSlots.map((s) => {
      const prog = events.find((e) => e.id === s.programme_id)
      return {
        programme_id: s.programme_id,
        language: s.language,
        subject: s.subject.trim(),
        duration_seconds: (s.hours || 0) * 3600 + (s.minutes || 0) * 60 + (s.seconds || 0),
        programme: prog ? { id: prog.id, name: prog.name, event_code: prog.event_code, category: prog.category } : undefined,
      }
    })

    const slot0 = programmeSlots[0]

    const payload = {
      slots_count: slotsCount,
      programme_slots: programmeSlots,
      programme_id: slot0.programme_id,
      language: slot0.language,
      subject: slot0.subject,
      duration_seconds: slot0.duration_seconds,
      access_code: accessCode.trim(),
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
        toast.success("Programme timer session updated successfully")
        setIsModalOpen(false)
        fetchData()
      }
    } else {
      const { error } = await (supabase.from("programme_timers") as any)
        .insert(payload)

      if (error) {
        toast.error("Failed to create timer: " + error.message)
        console.error(error)
      } else {
        toast.success("Programme timer session created successfully!")
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
      toast.success("Timer session deleted successfully")
      setDeleteTimer(null)
      fetchData()
    }
    setDeleting(false)
  }

  // Copy Shareable Link to Clipboard
  const handleCopyLink = (timerId: string, code?: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const shareUrl = `${origin}/timer/${timerId}`

    const textToCopy = code
      ? `Timer Link: ${shareUrl}\nPasscode: ${code}`
      : shareUrl

    navigator.clipboard.writeText(textToCopy)
    toast.success("Share link & passcode copied!", {
      description: textToCopy,
    })
  }

  // Filter timers for search
  const filteredTimers = timers.filter((t) => {
    const q = searchQuery.toLowerCase()
    const codeStr = (t.access_code || "").toLowerCase()
    const slotsStr = (t.programme_slots || [])
      .map((s) => `${s.programme?.event_code} ${s.programme?.name} ${s.subject}`)
      .join(" ")
      .toLowerCase()

    return slotsStr.includes(q) || codeStr.includes(q)
  })

  // Filter modal programmes
  const filteredModalEvents = events.filter((e) => {
    const q = programmeSearch.toLowerCase()
    return (
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.event_code && e.event_code.toLowerCase().includes(q))
    )
  })

  const currentSlotForm = slotsForm[activeSlotIdx]

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
            Create 6-digit passcode protected timer screens (1, 2, or 3 programmes at a time) with shareable reveal links.
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

      {/* Search Toolbar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
        <Input
          placeholder="Search timer sessions by code, programme, or passcode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-ivory/80 border-navy/10 focus:border-gold rounded-xl shadow-xs text-sm"
        />
      </div>

      {/* Timers Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-ivory/60 rounded-3xl border border-navy/10 text-slatebrand">
          <Loader2 className="size-8 animate-spin text-gold mb-2" />
          <p className="text-sm font-medium">Loading programme timer sessions...</p>
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
              : "No programme timer screens have been created yet. Click '+ Create Timer' to get started."}
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
            const slots = tm.programme_slots || []
            const count = tm.slots_count || slots.length || 1

            return (
              <div
                key={tm.id}
                className="rounded-3xl border border-navy/10 bg-ivory/80 p-5 shadow-xs hover:border-gold/30 transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Card Header Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap border-b border-navy/5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider bg-gold/20 text-navy px-3 py-1 rounded-full border border-gold/30 flex items-center gap-1.5">
                        <Layers className="size-3.5 text-navy" />
                        <span>{count} Programme{count === 1 ? "" : "s"} Screen</span>
                      </span>

                      {/* 6-Digit Passcode Badge */}
                      <span className="text-xs font-mono font-extrabold bg-navy text-gold px-3 py-1 rounded-full border border-gold/40 flex items-center gap-1 shadow-xs">
                        <KeyRound className="size-3.5 text-gold" />
                        <span>Code: {tm.access_code}</span>
                      </span>
                    </div>
                  </div>

                  {/* List of Slots in this Session */}
                  <div className="space-y-2.5">
                    {slots.map((s, sIdx) => {
                      const isArabic = s.language === "arabic"
                      return (
                        <div
                          key={sIdx}
                          className="p-3.5 rounded-2xl bg-white/80 border border-navy/10 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-xs font-black text-navy bg-navy/8 px-2 py-0.5 rounded">
                                {s.programme?.event_code || "N/A"}
                              </span>
                              <span className="font-bold text-navy text-sm truncate">
                                {s.programme?.name || "Programme"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs font-mono font-bold bg-navy text-ivory px-2 py-0.5 rounded">
                                {formatDuration(s.duration_seconds)}
                              </span>
                              <span className="text-[10px] font-bold uppercase text-slatebrand bg-navy/5 px-1.5 py-0.5 rounded">
                                {s.language}
                              </span>
                            </div>
                          </div>

                          <p
                            className={`text-xs text-slatebrand font-medium truncate ${
                              isArabic ? "text-right" : "text-left"
                            }`}
                            dir={isArabic ? "rtl" : "ltr"}
                          >
                            <span className="font-bold text-navy">Topic:</span> {s.subject}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-navy/5 flex-wrap">
                  <div className="flex items-center gap-2">
                    {/* Copy Share Link + Passcode */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(tm.id, tm.access_code)}
                      className="h-9 px-3 border-navy/15 text-navy hover:bg-navy/5 rounded-xl gap-1.5 cursor-pointer font-bold text-xs"
                    >
                      <Copy className="size-3.5 text-navy" />
                      <span>Copy Link & Code</span>
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

      {/* Create / Edit Multi-Slot Timer Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-ivory border border-navy/10 shadow-2xl rounded-3xl p-6 sm:p-8 scrollbar-thin">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-black text-navy flex items-center gap-2">
              <Sparkles className="size-5 text-gold" />
              {editingTimerId ? "Edit Programme Timer Session" : "Create Programme Timer Session"}
            </DialogTitle>
            <DialogDescription className="text-slatebrand text-sm">
              Configure programmes on screen, set topics/durations, and specify the 6-digit passcode.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 6-DIGIT PASSCODE INPUT & REGENERATE */}
            <div className="p-3.5 bg-gold/15 border border-gold/30 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                  <KeyRound className="size-4 text-gold" /> 6-Digit Screen Access Passcode
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAccessCode(generateRandomCode())}
                  className="h-7 text-[11px] font-bold text-navy hover:bg-gold/20 rounded-lg gap-1"
                >
                  <RefreshCw className="size-3" />
                  <span>Random Code</span>
                </Button>
              </div>
              <Input
                type="text"
                maxLength={6}
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit passcode e.g. 581932"
                className="h-11 text-center font-mono font-black text-xl tracking-[0.25em] bg-white border-navy/20 rounded-xl text-navy"
              />
              <p className="text-[10px] text-slatebrand font-semibold text-center">
                Users must enter this 6-digit code on the room PC to unlock the timer screen.
              </p>
            </div>

            {/* SELECT NUMBER OF PROGRAMMES ON SCREEN (1, 2, or 3) */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                Number of Programmes on Screen
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((count) => {
                  const isActive = slotsCount === count
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        setSlotsCount(count as 1 | 2 | 3)
                        if (activeSlotIdx >= count) setActiveSlotIdx(0)
                      }}
                      className={`p-3 rounded-2xl border text-center font-black text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isActive
                          ? "bg-navy text-ivory border-2 border-gold ring-2 ring-gold/40 shadow-md"
                          : "bg-white/80 border-navy/15 text-navy hover:bg-navy/6"
                      }`}
                    >
                      <span>{count} Programme{count > 1 ? "s" : ""}</span>
                      {isActive && <Check className="size-4 text-gold stroke-[3]" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* SLOT TABS SELECTOR */}
            {slotsCount > 1 && (
              <div className="flex items-center gap-2 border-b border-navy/10 pb-2">
                {Array.from({ length: slotsCount }).map((_, idx) => {
                  const isActive = activeSlotIdx === idx
                  const slotForm = slotsForm[idx]
                  const selectedProg = events.find((e) => e.id === slotForm.programme_id)

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveSlotIdx(idx)
                        setProgrammeSearch("")
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-between gap-1.5 ${
                        isActive
                          ? "bg-gold text-navy border-gold shadow-xs font-black"
                          : "bg-white/60 border-navy/15 text-slatebrand hover:border-navy/30"
                      }`}
                    >
                      <span className="truncate">
                        Slot #{idx + 1}: {selectedProg?.event_code || "Select"}
                      </span>
                      {selectedProg && <Check className="size-3 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* CURRENT SLOT FORM INPUTS */}
            <div className="space-y-4 bg-white/70 p-4 rounded-2xl border border-navy/10">
              <div className="flex items-center justify-between border-b border-navy/5 pb-2">
                <span className="font-extrabold text-xs text-navy uppercase tracking-wider">
                  Configuring Slot #{activeSlotIdx + 1} of {slotsCount}
                </span>
                <span className="text-[11px] font-bold text-slatebrand">
                  {currentSlotForm.language.toUpperCase()}
                </span>
              </div>

              {/* Programme Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                  Select Programme for Slot #{activeSlotIdx + 1}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slatebrand" />
                  <Input
                    placeholder="Search programme by code or name..."
                    value={programmeSearch}
                    onChange={(e) => setProgrammeSearch(e.target.value)}
                    className="pl-9 h-10 bg-white border-navy/15 rounded-xl text-sm"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto rounded-2xl border border-navy/15 bg-white p-1.5 space-y-1 scrollbar-thin">
                  {filteredModalEvents.length === 0 ? (
                    <p className="p-3 text-xs text-center text-slatebrand">
                      No programmes found matching search.
                    </p>
                  ) : (
                    filteredModalEvents.map((evt) => {
                      const isSelected = currentSlotForm.programme_id === evt.id

                      return (
                        <button
                          key={evt.id}
                          type="button"
                          onClick={() => updateSlotForm(activeSlotIdx, "programme_id", evt.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                            isSelected
                              ? "bg-navy text-ivory font-black shadow-xs"
                              : "hover:bg-navy/6 text-navy font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span
                              className={`font-mono text-[11px] px-2 py-0.5 rounded font-extrabold shrink-0 ${
                                isSelected ? "bg-gold text-navy" : "bg-navy/8 text-navy"
                              }`}
                            >
                              {evt.event_code || "N/A"}
                            </span>
                            <span className="truncate">{evt.name}</span>
                          </div>

                          {isSelected && <Check className="size-3.5 text-gold shrink-0" />}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Language Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                  Language & Subject Heading
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "english", label: "English", heading: "Subject" },
                    { id: "malayalam", label: "Malayalam", heading: "വിഷയം" },
                    { id: "arabic", label: "Arabic", heading: "عنوان" },
                  ].map((lang) => {
                    const isActive = currentSlotForm.language === lang.id
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => updateSlotForm(activeSlotIdx, "language", lang.id)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isActive
                            ? "bg-navy text-ivory border-navy font-bold"
                            : "bg-white border-navy/15 text-slatebrand hover:border-navy/30"
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

              {/* Subject Content */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                  Subject Topic ({currentSlotForm.language === "malayalam" ? "വിഷയം" : currentSlotForm.language === "arabic" ? "عنوان" : "Subject"})
                </Label>
                <Textarea
                  placeholder={
                    currentSlotForm.language === "arabic"
                      ? "اكتب الموضوع هنا..."
                      : currentSlotForm.language === "malayalam"
                      ? "വിഷയം ഇവിടെ നൽകുക..."
                      : "Enter subject topic text..."
                  }
                  value={currentSlotForm.subject}
                  onChange={(e) => updateSlotForm(activeSlotIdx, "subject", e.target.value)}
                  dir={currentSlotForm.language === "arabic" ? "rtl" : "ltr"}
                  className="min-h-[75px] bg-white border-navy/15 focus:border-gold rounded-xl text-sm p-3 font-sans"
                />
              </div>

              {/* Duration Pickers */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-navy">
                  Timer Duration (HH:MM:SS)
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slatebrand block text-center">Hours</span>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={currentSlotForm.hours}
                      onChange={(e) => updateSlotForm(activeSlotIdx, "hours", Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-9 text-center font-mono font-bold text-navy text-sm bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slatebrand block text-center">Minutes</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={currentSlotForm.minutes}
                      onChange={(e) => updateSlotForm(activeSlotIdx, "minutes", Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-9 text-center font-mono font-bold text-navy text-sm bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slatebrand block text-center">Seconds</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={currentSlotForm.seconds}
                      onChange={(e) => updateSlotForm(activeSlotIdx, "seconds", Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-9 text-center font-mono font-bold text-navy text-sm bg-white"
                    />
                  </div>
                </div>
              </div>
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
              disabled={saving}
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
              Are you sure you want to remove this timer screen configuration?
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
