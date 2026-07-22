"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Loader2, Trophy, Save, User, Users, CheckCircle2, ChevronsUpDown, Check, Award, Search } from "lucide-react"
import { cn } from "@/lib/utils"

// --- TYPES ---
interface Event {
  id: string
  name: string
  event_code: string
  grade_type: 'A' | 'B' | 'C' | 'D'
  category: string
  applicable_section: string[]
}

interface Team { id: string; name: string; color_hex: string }

interface Participant {
  id: string
  student_id: string | null
  student?: { id: string; name: string; chest_no: string } | null
  team: { id: string; name: string; color_hex: string }
  result_position: 'FIRST' | 'SECOND' | 'THIRD' | null
  performance_grade: 'A+' | 'A' | 'B' | 'C' | 'NONE' | null
}

const DEFAULT_PERF_POINTS = { 'A+': 0, 'A': 5, 'B': 3, 'C': 1, 'NONE': 0 }
const PERFORMANCE_GRADES = ['A+', 'A', 'B', 'C', 'NONE']

interface EventScorerProps {
  section: string
  category: string
  onScoreSaved?: () => void
}

export function EventScorer({ section, category, onScoreSaved }: EventScorerProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'INDIVIDUAL' | 'TEAM'>('INDIVIDUAL')

  // Data
  const [events, setEvents] = useState<Event[]>([])
  const [completedEventIds, setCompletedEventIds] = useState<Set<string>>(new Set())
  const [teams, setTeams] = useState<Team[]>([])

  // Selection
  const [openCombobox, setOpenCombobox] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string>("")

  const [participants, setParticipants] = useState<Participant[]>([])
  const [pointsTable, setPointsTable] = useState<any>({})
  const [perfPoints, setPerfPoints] = useState<Record<string, number>>(DEFAULT_PERF_POINTS)

  // Winners State (Top 3)
  const [winners, setWinners] = useState<{
    FIRST: Map<string, string>,
    SECOND: Map<string, string>,
    THIRD: Map<string, string>
  }>({
    FIRST: new Map(),
    SECOND: new Map(),
    THIRD: new Map()
  })

  // Grades for everyone else (Not in Top 3)
  const [otherGrades, setOtherGrades] = useState<Map<string, string>>(new Map())

  const supabase = createClient()

  // 1. Load Initial Data & Completed Status
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setSelectedEventId("")

      let eventsQuery = supabase
        .from('events')
        .select('*')
        .contains('applicable_section', [section])
        .order('name')

      if (category === 'GENERAL') {
        eventsQuery = eventsQuery.eq('grade_type', 'C')
      } else if (category === 'SPECIAL') {
        eventsQuery = eventsQuery.eq('grade_type', 'D')
      } else {
        eventsQuery = eventsQuery.eq('category', category).not('grade_type', 'in', '("C","D")')
      }

      const [evtRes, teamRes, gradeRes, perfRes] = await Promise.all([
        eventsQuery,
        supabase.from('teams').select('*').order('name'),
        supabase.from('grade_settings').select('*'),
        supabase.from('performance_grade_settings').select('*')
      ])

      if (evtRes.data) {
          const evts = evtRes.data as Event[]
          setEvents(evts)

          // Fetch completed status (events with at least one result_position OR grade)
          // We consider an event "touched" if it has any entries in participations
          // But strict completion usually means results. Let's stick to existing logic for now.
          const { data: doneData } = await supabase
            .from('participations')
            .select('event_id')
            .in('event_id', evts.map(e => e.id))
            .not('result_position', 'is', null)

          if (doneData) {
              // Cast to any[] to avoid strict type errors on 'event_id'
              setCompletedEventIds(new Set((doneData as any[]).map(d => d.event_id)))
          }
      }

      if (teamRes.data) setTeams(teamRes.data as any)

      if (gradeRes.data) {
        const pt: any = {}
        gradeRes.data.forEach((g: any) => {
           pt[g.grade_type] = { FIRST: g.first_place, SECOND: g.second_place, THIRD: g.third_place }
        })
        setPointsTable(pt)
      }
      if (perfRes.data) {
        const next: Record<string, number> = { ...DEFAULT_PERF_POINTS }
        ;(perfRes.data as any[]).forEach((g) => {
          next[g.grade_label] = g.points
        })
        setPerfPoints(next)
      }
      setLoading(false)
    }
    loadData()
  }, [section, category])

  // 2. Load Participants when Event Selected
  useEffect(() => {
    if (!selectedEventId) {
      setParticipants([])
      setWinners({ FIRST: new Map(), SECOND: new Map(), THIRD: new Map() })
      setOtherGrades(new Map())
      return
    }

    const event = events.find(e => e.id === selectedEventId)
    setMode(event?.category === 'SPECIAL' || event?.grade_type === 'D' ? 'TEAM' : 'INDIVIDUAL')

    async function loadParts() {
      setLoading(true)
      const { data } = await supabase
        .from('participations')
        .select(`
            id, result_position, performance_grade, student_id,
            students ( id, name, chest_no ),
            teams ( id, name, color_hex )
        `)
        .eq('event_id', selectedEventId)

      if (data) {
        const mapped = data.map((p: any) => ({
          id: p.id,
          student_id: p.student_id,
          result_position: p.result_position,
          performance_grade: p.performance_grade,
          student: p.students,
          team: p.teams
        }))
        setParticipants(mapped)

        // Populate existing winners and other grades
        const newWinners = { FIRST: new Map(), SECOND: new Map(), THIRD: new Map() }
        const newOtherGrades = new Map<string, string>()

        mapped.forEach((p: any) => {
            const key = p.student_id ? p.id : p.team.id // Use participant ID for individual, Team ID for team events

            if (p.result_position) {
                // @ts-ignore
                newWinners[p.result_position].set(key, p.performance_grade || 'NONE')
            } else if (p.performance_grade) {
                // If they have a grade but no position, they go to 'otherGrades'
                newOtherGrades.set(key, p.performance_grade)
            }
        })
        // @ts-ignore
        setWinners(newWinners)
        setOtherGrades(newOtherGrades)
      }
      setLoading(false)
    }
    loadParts()
  }, [selectedEventId])

  // 3. Logic: Toggle Winner / Update Grade
  const toggleWinner = (pos: 'FIRST'|'SECOND'|'THIRD', id: string) => {
      setWinners(prev => {
          const next = { ...prev }
          const currentMap = new Map(next[pos])

          const inFirst = prev.FIRST.has(id) && pos !== 'FIRST'
          const inSecond = prev.SECOND.has(id) && pos !== 'SECOND'
          const inThird = prev.THIRD.has(id) && pos !== 'THIRD'

          if (inFirst || inSecond || inThird) {
              return prev // Prevent same person in multiple winner slots
          }

          if (currentMap.has(id)) {
              currentMap.delete(id)
              // Optionally move back to 'otherGrades' if needed, but for now we just clear rank.
              // The user can re-assign grade in the bottom section.
          } else {
              currentMap.set(id, 'NONE')
              // If moving to winners, remove from otherGrades
              setOtherGrades(prevOthers => {
                  const nextOthers = new Map(prevOthers)
                  nextOthers.delete(id)
                  return nextOthers
              })
          }
          next[pos] = currentMap
          return next
      })
  }

  const updateWinnerGrade = (pos: 'FIRST'|'SECOND'|'THIRD', id: string, grade: string) => {
      setWinners(prev => {
          const next = { ...prev }
          const currentMap = new Map(next[pos])
          if (currentMap.has(id)) currentMap.set(id, grade)
          next[pos] = currentMap
          return next
      })
  }

  const updateOtherGrade = (id: string, grade: string) => {
      // Ensure this person isn't a winner first (safety check)
      if (winners.FIRST.has(id) || winners.SECOND.has(id) || winners.THIRD.has(id)) return;

      setOtherGrades(prev => {
          const next = new Map(prev)
          if (grade === 'NONE') {
              next.delete(id)
          } else {
              next.set(id, grade)
          }
          return next
      })
  }

  // 4. Save
  const handleSave = async () => {
    if (!selectedEventId) return
    setSaving(true)

    const event = events.find(e => e.id === selectedEventId)
    if (!event) return

    // @ts-ignore
    const basePoints = pointsTable[event.grade_type || 'A']
    let hasWinners = false

    try {
       if (mode === 'INDIVIDUAL') {
          const updates = participants.filter(p => p.student).map(p => {
              let pos: any = null
              let perf: any = null
              let pts = 0

              if (winners.FIRST.has(p.id)) {
                  pos = 'FIRST';
                  perf = winners.FIRST.get(p.id);
                  hasWinners = true;
                  const key = (perf || 'NONE');
                  pts = basePoints.FIRST + (perfPoints[key] || 0);
              }
              else if (winners.SECOND.has(p.id)) {
                  pos = 'SECOND';
                  perf = winners.SECOND.get(p.id);
                  hasWinners = true;
                  const key = (perf || 'NONE');
                  pts = basePoints.SECOND + (perfPoints[key] || 0);
              }
              else if (winners.THIRD.has(p.id)) {
                  pos = 'THIRD';
                  perf = winners.THIRD.get(p.id);
                  hasWinners = true;
                  const key = (perf || 'NONE');
                  pts = basePoints.THIRD + (perfPoints[key] || 0);
              }
              else if (otherGrades.has(p.id)) {
                  // Not a winner, but has a grade
                  pos = null;
                  perf = otherGrades.get(p.id);
                  const key = (perf || 'NONE');
                  // No base points for non-winners, only grade points
                  pts = perfPoints[key] || 0;
              }

              return {
                  id: p.id,
                  event_id: selectedEventId,
                  team_id: p.team.id,
                  student_id: p.student_id,
                  result_position: pos,
                  performance_grade: perf === 'NONE' ? null : perf,
                  points_earned: pts,
                  status: pos ? 'winner' : (perf ? 'completed' : 'registered')
              }
          })

          if (updates.length > 0) {
              const { error } = await (supabase.from('participations') as any).upsert(updates)
              if (error) throw error
          }
       } else {
          // Team Logic
          // Clear existing team results for this event
          await supabase.from('participations').delete().eq('event_id', selectedEventId).is('student_id', null)

          const newResults: any[] = []

          // Helper to add results
          const addResult = (teamId: string, pos: string | null, grade: string | null, basePts: number) => {
              if (pos) hasWinners = true
              const key = (grade || 'NONE');
              const total = basePts + (perfPoints[key] || 0)

              newResults.push({
                  event_id: selectedEventId,
                  team_id: teamId,
                  student_id: null,
                  result_position: pos,
                  performance_grade: grade === 'NONE' ? null : grade,
                  points_earned: total,
                  status: pos ? 'winner' : 'completed'
              })
          }

          // Process Winners
          winners.FIRST.forEach((perf, teamId) => addResult(teamId, 'FIRST', perf, basePoints.FIRST))
          winners.SECOND.forEach((perf, teamId) => addResult(teamId, 'SECOND', perf, basePoints.SECOND))
          winners.THIRD.forEach((perf, teamId) => addResult(teamId, 'THIRD', perf, basePoints.THIRD))

          // Process Others (Teams not in winners)
          teams.forEach(t => {
             const isWinner = winners.FIRST.has(t.id) || winners.SECOND.has(t.id) || winners.THIRD.has(t.id)
             if (!isWinner && otherGrades.has(t.id)) {
                 addResult(t.id, null, otherGrades.get(t.id) || 'NONE', 0)
             }
          })

          if (newResults.length > 0) {
              const { error } = await (supabase.from('participations') as any).insert(newResults)
              if (error) throw error
          }
       }

       // Update completed status locally
       if (hasWinners) {
           setCompletedEventIds(prev => new Set(prev).add(selectedEventId))
       } else {
           const next = new Set(completedEventIds)
           next.delete(selectedEventId)
           setCompletedEventIds(next)
       }

       if (onScoreSaved) onScoreSaved()
    } catch (err: any) {
       alert("Save failed: " + err.message)
    } finally {
       setSaving(false)
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)

  // Filter lists
  const winnerIds = new Set([
      ...Array.from(winners.FIRST.keys()),
      ...Array.from(winners.SECOND.keys()),
      ...Array.from(winners.THIRD.keys())
  ])

  const itemList = mode === 'INDIVIDUAL' ? participants.filter(p => p.student) : teams.map(t => ({ ...t, id: t.id })) // Normalized
  const otherParticipants = itemList.filter(item => !winnerIds.has(mode === 'INDIVIDUAL' ? item.id : item.id))

  return (
    <div className="flex h-full flex-col space-y-4">
        {/* TOP BAR: Combobox & Mode */}
        <div className="surface-panel flex shrink-0 flex-col items-stretch gap-3 rounded-3xl p-3 md:flex-row md:items-center">

            <div className="w-full md:w-[440px]">
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className="h-12 w-full justify-between"
                        >
                            <span className="flex min-w-0 items-center gap-2 truncate">
                              <Search className="size-4 text-slatebrand" />
                              <span className="truncate">
                                {selectedEventId
                                    ? events.find((e) => e.id === selectedEventId)?.name
                                    : "Search and select event"}
                              </span>
                            </span>
                            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="surface-elevated w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-2xl border-navy/10 p-0">
                        <Command>
                            <CommandInput placeholder="Search event..." />
                            <CommandList>
                                <CommandEmpty>No event found.</CommandEmpty>
                                <CommandGroup>
                                    {events.map((event) => {
                                        const isCompleted = completedEventIds.has(event.id)
                                        return (
                                            <CommandItem
                                                key={event.id}
                                                value={event.name}
                                                onSelect={() => {
                                                    setSelectedEventId(event.id)
                                                    setOpenCombobox(false)
                                                }}
                                                className={cn(
                                                    "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2",
                                                    isCompleted ? "bg-success/10 text-success data-[selected=true]:bg-success/15" : "text-navy"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isCompleted && <Check className="size-3 text-success" />}
                                                    <span>{event.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] opacity-60">
                                                    <span>{event.event_code}</span>
                                                    <span className="rounded-full bg-navy/7 px-2 py-0.5">Grade {event.grade_type}</span>
                                                </div>
                                            </CommandItem>
                                        )
                                    })}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {selectedEvent && (
                <div className="ml-auto flex items-center gap-2">
                    <Badge variant={mode === 'TEAM' ? 'gold' : 'outline'} className="h-9 px-3 text-xs">
                       {mode === 'TEAM' ? <><Users className="mr-1 size-3"/> Team Event - Grade {selectedEvent.grade_type}</> : <><User className="mr-1 size-3"/> Individual - Grade {selectedEvent.grade_type}</>}
                    </Badge>
                </div>
            )}
        </div>

        {/* MAIN SCORING AREA */}
        {selectedEventId && (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto rounded-3xl bg-mist/50 p-2 md:p-4">

                {/* 1. TOP 3 WINNERS */}
                <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
                    {['FIRST', 'SECOND', 'THIRD'].map(pos => {
                        // @ts-ignore
                        const basePts = pointsTable[selectedEvent?.grade_type || 'A']?.[pos] || 0
                        // @ts-ignore
                        const selectedMap = winners[pos] as Map<string, string>

                        const style = {
                            FIRST: { border: 'border-gold/35', icon: 'text-gold', bg: 'bg-gold/10', label: 'First Place' },
                            SECOND: { border: 'border-navy/15', icon: 'text-slatebrand', bg: 'bg-ivory/70', label: 'Second Place' },
                            THIRD: { border: 'border-[#c98743]/30', icon: 'text-[#c98743]', bg: 'bg-[#c98743]/10', label: 'Third Place' }
                        }[pos as 'FIRST'|'SECOND'|'THIRD']

                        return (
                            <Card key={pos} className={cn("flex h-[420px] flex-col border-t-4 shadow-premium", style.border, style.bg)}>
                                <CardHeader className="shrink-0 border-b border-navy/10 px-4 py-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className={cn("flex items-center gap-2 text-sm", style.icon)}>
                                            <Trophy className="size-4" /> {style.label}
                                        </CardTitle>
                                        <Badge variant="outline" className="h-6 font-mono text-[10px]">Base {basePts} + Grade</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-2 overflow-y-auto p-3">
                                    {itemList.map((item: any) => {
                                        const id = mode === 'INDIVIDUAL' ? item.id : item.id
                                        const isSelected = selectedMap.has(id)
                                        const grade = selectedMap.get(id) || 'NONE'
                                        const isAlreadyWinner = winnerIds.has(id) && !isSelected

                                        // If already a winner elsewhere, hide from this list to reduce clutter,
                                        // or keep visuals consistent. Let's hide if chosen elsewhere for cleaner UI
                                        if (isAlreadyWinner) return null;

                                        return (
                                            <div
                                                key={id}
                                                onClick={() => toggleWinner(pos as any, id)}
                                                className={cn(
                                                    "relative cursor-pointer rounded-2xl border p-3 transition-all duration-200",
                                                    isSelected ? "border-gold/55 bg-gold/12 ring-2 ring-gold/28 shadow-gold" : "border-navy/8 bg-ivory/70 hover:border-gold/25 hover:bg-ivory"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-bold text-navy">
                                                            {mode === 'INDIVIDUAL' ? item.student?.name : item.name}
                                                        </div>
                                                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slatebrand">
                                                            {mode === 'INDIVIDUAL' && <span className="rounded-full bg-navy/7 px-2 py-0.5 font-mono text-navy">{item.student?.chest_no}</span>}
                                                            <span className="truncate">{mode === 'INDIVIDUAL' ? item.team.name : 'Team Entry'}</span>
                                                        </div>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="ml-2 size-4 shrink-0 text-gold" />}
                                                </div>

                                                {/* Grade Select Buttons - Only visible if selected */}
                                                {isSelected && (
                                                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-navy/10 pt-2 animate-in fade-in zoom-in-95 duration-200">
                                                        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slatebrand">Perf.</span>
                                                        <div className="flex gap-0.5">
                                                            {PERFORMANCE_GRADES.map(g => (
                                                                <button
                                                                    key={g}
                                                                    onClick={(e) => { e.stopPropagation(); updateWinnerGrade(pos as any, id, g) }}
                                                                    className={cn(
                                                                        "flex size-6 items-center justify-center rounded-lg border text-[9px] font-black transition-colors",
                                                                        grade === g
                                                                            ? "border-gold bg-gold text-navy shadow-gold"
                                                                            : "border-navy/10 bg-ivory text-slatebrand hover:border-gold/30 hover:bg-gold/10 hover:text-navy"
                                                                    )}
                                                                >
                                                                    {g === 'NONE' ? '-' : g}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* 2. OTHER PARTICIPANTS (GRADES) */}
                <Card className="border-t-4 border-navy/15 bg-ivory/65 shadow-premium">
                    <CardHeader className="border-b border-navy/10 px-4 py-3">
                        <div className="flex items-center gap-2">
                           <Award className="size-4 text-gold" />
                           <CardTitle className="text-sm text-navy">Participation Grades</CardTitle>
                           <Badge variant="outline" className="ml-2 text-[10px]">{otherParticipants.length} Remaining</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        {otherParticipants.length === 0 ? (
                            <div className="py-8 text-center text-sm font-semibold text-slatebrand">All participants ranked.</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {otherParticipants.map((item: any) => {
                                    const id = mode === 'INDIVIDUAL' ? item.id : item.id
                                    const grade = otherGrades.get(id) || 'NONE'
                                    const hasGrade = otherGrades.has(id) && grade !== 'NONE'

                                    return (
                                        <div key={id} className={cn("flex flex-col gap-3 rounded-2xl border bg-ivory/75 p-3 transition-all", hasGrade ? "border-gold/45 bg-gold/10 ring-2 ring-gold/18 shadow-sm" : "border-navy/8")}>
                                            <div className="flex min-w-0 items-start justify-between">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-bold text-navy">
                                                        {mode === 'INDIVIDUAL' ? item.student?.name : item.name}
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slatebrand">
                                                        {mode === 'INDIVIDUAL' && <span className="rounded-full bg-navy/7 px-2 py-0.5 font-mono text-navy">{item.student?.chest_no}</span>}
                                                        <span className="truncate max-w-[100px]">{mode === 'INDIVIDUAL' ? item.team.name : 'Team'}</span>
                                                    </div>
                                                </div>
                                                {hasGrade && <Badge variant="gold" className="h-5 px-1.5 text-[10px]">+{perfPoints[grade] || 0} pts</Badge>}
                                            </div>

                                            <div className="mt-auto flex items-center justify-between gap-2 border-t border-navy/8 pt-2">
                                                <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slatebrand">Grade</span>
                                                <div className="flex gap-1">
                                                     {['A+', 'A', 'B', 'C'].map(g => (
                                                        <button
                                                            key={g}
                                                            onClick={() => updateOtherGrade(id, g)}
                                                            className={cn(
                                                                "size-7 rounded-lg border text-[10px] font-black transition-all",
                                                                grade === g
                                                                    ? "border-gold bg-gold text-navy shadow-gold"
                                                                    : "border-navy/10 bg-ivory text-slatebrand hover:border-gold/30 hover:bg-gold/10 hover:text-navy"
                                                            )}
                                                        >
                                                            {g}
                                                        </button>
                                                     ))}
                                                     <button
                                                        onClick={() => updateOtherGrade(id, 'NONE')}
                                                        className={cn(
                                                            "size-7 rounded-lg border text-[10px] transition-all",
                                                            grade === 'NONE' ? "border-gold/40 bg-gold/12 font-black text-navy" : "border-transparent text-destructive hover:bg-destructive/10"
                                                        )}
                                                        title="Clear"
                                                     >
                                                        x
                                                     </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
                <div className="h-16"></div> {/* Spacer for fixed save button */}
            </div>
        )}

        {/* BOTTOM FLOATING SAVE */}
        {selectedEventId && (
             <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 md:right-8">
                 <Button
                    size="lg"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-12 rounded-full border-2 border-ivory px-6 shadow-2xl ring-4 ring-navy/8"
                  >
                    {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                    Save Scores
                 </Button>
            </div>
        )}
    </div>
  )
}
