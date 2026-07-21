"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  CheckCircle2,
  Circle,
  Mic2,
  LayoutGrid,
  Users,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

// --- Types & Interfaces ---

interface Team {
  id: string;
  name: string;
  color_hex: string
}

interface Event {
  id: string;
  name: string;
  category: string; // 'ON STAGE' | 'OFF STAGE'
  applicable_section: string[];
  max_participants_per_team: number;
}

interface Participation {
  id: string;
  event_id: string;
  attendance_status: string; // 'present' | 'absent' etc.
  events?: {
    category: string;
    max_participants_per_team: number; // Added to check group size
  };
}

interface Student {
  id: string;
  name: string;
  participations: Participation[];
}

// Helper interface for the computed stats
interface EventStatus extends Event {
  registeredCount: number;
  status: 'FULL' | 'EMPTY' | 'PARTIAL';
}

const SECTIONS = ['Senior']

export function TeamDetailsDialog({ team, open, onOpenChange }: { team: Team | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const [loading, setLoading] = useState(true)

  const [events, setEvents] = useState<Event[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [students, setStudents] = useState<Student[]>([])

  const [activeSection, setActiveSection] = useState("Senior")

  const supabase = createClient()

  useEffect(() => {
    if (!team || !open) return

    async function fetchData() {
      setLoading(true)
      try {
        // 1. Fetch Events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('id, name, category, applicable_section, max_participants_per_team')
          .order('name')

        if (eventsError) throw eventsError;

        // 2. Fetch Students with their Participations (Updated to fetch max_participants_per_team)
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select(`
            id, name,
            participations (
                id, event_id, attendance_status,
                events ( category, max_participants_per_team )
            )
          `)
          .eq('team_id', team!.id)

        if (studentsError) throw studentsError;

        if (eventsData) setEvents(eventsData as Event[])

        if (studentsData) {
            // We cast to unknown first to avoid conflicts with Supabase auto-generated types
            const typedStudents = studentsData as unknown as Student[]
            setStudents(typedStudents)

            // Flatten participations for the registration count logic
            const allParts = typedStudents.flatMap(s => s.participations)
            setParticipations(allParts)
        }

      } catch (err) {
        console.error("Error fetching team details:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [team, open])

  const registrationReview = useMemo(() => {
      let nonCompliantCount = 0
      let absentCount = 0

      students.forEach(student => {
          const validParts = student.participations.filter(p => p.attendance_status !== 'absent')

          const countingParts = validParts.filter(p => {
             const maxP = p.events?.max_participants_per_team ?? 1;
             return maxP <= 5;
          })

          const hasOnStage = countingParts.some(p => p.events?.category === 'ON STAGE')
          const hasOffStage = countingParts.some(p => p.events?.category === 'OFF STAGE')

          if (!hasOnStage || !hasOffStage) {
              nonCompliantCount++
          }

          student.participations.forEach(p => {
              if (p.attendance_status === 'absent') {
                  absentCount++
              }
          })
      })

      return {
          nonCompliantCount,
          absentCount,
      }
  }, [students])

  // --- SECTION STATS ---
  const stats = useMemo(() => {
    const sectionEvents = events.filter(e =>
      e.applicable_section && e.applicable_section.includes(activeSection)
    )

    const processList = (list: Event[]): EventStatus[] => list.map(e => {
        const registeredCount = participations.filter(p => p.event_id === e.id).length
        const isFull = registeredCount >= e.max_participants_per_team
        const isEmpty = registeredCount === 0
        return {
            ...e,
            registeredCount,
            status: isFull ? 'FULL' : isEmpty ? 'EMPTY' : 'PARTIAL'
        }
    })

    const onStage = processList(sectionEvents.filter(e => e.category === 'ON STAGE'))
    const offStage = processList(sectionEvents.filter(e => e.category === 'OFF STAGE'))

    const totalEvents = sectionEvents.length
    const filledCount = [...onStage, ...offStage].filter(s => s.status !== 'EMPTY').length

    return { onStage, offStage, totalEvents, filledCount }
  }, [events, participations, activeSection])

  if (!team) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-[900px] flex-col overflow-hidden p-0 [&>button]:z-50">

        {/* Header */}
        <DialogHeader className="surface-dark relative shrink-0 overflow-hidden p-6 pb-5">

          <div className="relative z-10 flex items-start justify-between">
              <div>
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-title text-2xl text-ivory">{team.name}</DialogTitle>
                  </div>
                  <DialogDescription className="mt-2 text-ivory/60">
                    Registration Review
                  </DialogDescription>
              </div>

              <div className="text-right mt-2.5">
                  <div className="text-display text-4xl leading-none text-gold">{registrationReview.nonCompliantCount + registrationReview.absentCount}</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ivory/45">Review Items</div>
              </div>
          </div>
        </DialogHeader>

        {/* Review Summary Section */}
        <div className="grid shrink-0 grid-cols-2 gap-4 border-b border-navy/10 bg-ivory/70 p-4">
            <div className="flex items-center justify-between rounded-2xl border border-gold/20 bg-gold/10 p-3">
                <div className="flex items-center gap-3">
                    <div className="hidden rounded-2xl bg-gold/16 p-2 text-navy md:flex">
                        <AlertCircle className="size-5" />
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.12em] text-navy">Non Completed</div>
                        <div className="text-sm text-slatebrand">{registrationReview.nonCompliantCount} Students</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-title text-xl text-navy">{registrationReview.nonCompliantCount}</div>
                    <div className="text-[10px] font-bold uppercase text-slatebrand">items</div>
                </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-destructive/20 bg-destructive/10 p-3">
                <div className="flex items-center gap-3">
                    <div className="hidden rounded-2xl bg-destructive/12 p-2 text-destructive md:flex">
                        <AlertCircle className="size-5" />
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.12em] text-destructive">Absents</div>
                        <div className="text-sm text-slatebrand">{registrationReview.absentCount} Events</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-title text-xl text-destructive">{registrationReview.absentCount}</div>
                    <div className="text-[10px] font-bold uppercase text-slatebrand">items</div>
                </div>
            </div>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex flex-col min-h-0">

            {/* Tabs Bar */}
            <div className="shrink-0 border-b border-navy/10 bg-ivory/70 px-6 pt-2">
                 <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
                    <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none gap-4 flex-wrap">
                        {SECTIONS.map(sec => (
                            <TabsTrigger
                                key={sec}
                                value={sec}
                                className="rounded-none border-b-2 border-transparent px-2 py-3 text-xs font-bold text-slatebrand transition-all hover:text-navy data-[state=active]:border-gold data-[state=active]:bg-transparent data-[state=active]:text-navy md:text-sm"
                            >
                                Senior
                            </TabsTrigger>
                        ))}
                    </TabsList>
                 </Tabs>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-mist/50">
                <div className="p-6 space-y-8 pb-20">

                    {loading ? (
                        <div className="h-40 flex items-center justify-center">
                          <Loader2 className="size-8 animate-spin text-gold" />
                        </div>
                    ) : (
                      <>
                        {/* ON STAGE SECTION */}
                        {stats.onStage.length > 0 && (
                            <section>
                                <div className="sticky top-0 z-10 mb-2 flex items-center gap-2 border-b border-gold/20 bg-mist/90 py-2 backdrop-blur-sm">
                                    <span className="ml-1 rounded-xl bg-gold/16 p-1.5 text-navy">
                                        <Mic2 className="size-4" />
                                    </span>
                                    <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-navy">On Stage Events</h3>
                                    <Badge variant="gold" className="ml-auto text-[10px]">{stats.onStage.length}</Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {stats.onStage.map(event => (
                                        <EventStatusCard key={event.id} event={event} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* OFF STAGE SECTION */}
                        {stats.offStage.length > 0 && (
                            <section>
                                <div className="sticky top-0 z-10 mb-2 flex items-center gap-2 border-b border-deepblue/15 bg-mist/90 py-2 backdrop-blur-sm">
                                    <span className="ml-1 rounded-xl bg-deepblue/10 p-1.5 text-deepblue">
                                        <LayoutGrid className="size-4" />
                                    </span>
                                    <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-navy">Off Stage Events</h3>
                                    <Badge variant="secondary" className="ml-auto text-[10px]">{stats.offStage.length}</Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {stats.offStage.map(event => (
                                        <EventStatusCard key={event.id} event={event} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {stats.onStage.length === 0 && stats.offStage.length === 0 && (
                            <div className="flex h-40 flex-col items-center justify-center text-slatebrand">
                                <Circle className="mb-2 size-10 opacity-20" />
                                <p className="text-sm">No Senior events found.</p>
                            </div>
                        )}

                        <div className="mt-8 flex gap-2 rounded-2xl border border-gold/25 bg-gold/10 p-4 text-xs leading-5 text-navy">
                            <AlertCircle className="mt-0.5 size-4 shrink-0 text-gold" />
                            <p>
                                <strong>Review Note:</strong> Missing On/Off participation and absences are shown for committee awareness only. They do not create automatic minus points.
                            </p>
                        </div>
                      </>
                    )}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EventStatusCard({ event }: { event: EventStatus }) {
    const isFull = event.status === 'FULL'
    const isEmpty = event.status === 'EMPTY'

    return (
        <div className={cn(
            "group relative flex h-full flex-col rounded-2xl border p-4 transition-all duration-200",
            isFull ? "border-success/20 bg-success/8" :
            isEmpty ? "border-navy/10 bg-ivory/70 hover:bg-ivory" :
            "border-gold/25 bg-gold/10"
        )}>
            <div className="flex justify-between items-start gap-3 mb-3">
                <h4 className={cn("wrap-break-word text-sm font-bold leading-snug", isEmpty ? "text-slatebrand" : "text-navy")}>
                    {event.name}
                </h4>
                {isFull && <CheckCircle2 className="size-4 shrink-0 text-success" />}
                {!isFull && !isEmpty && <div className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" />}
            </div>

            <div className="mt-auto flex items-end justify-between border-t border-dashed border-navy/10 pt-2">
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    Max: {event.max_participants_per_team}
                </Badge>

                <div className={cn(
                    "flex items-center gap-1.5 text-xs font-bold",
                    isFull ? "text-success" : isEmpty ? "text-slatebrand" : "text-navy"
                )}>
                    <Users className="size-3.5" />
                    <span>{event.registeredCount}</span>
                </div>
            </div>
        </div>
    )
}
