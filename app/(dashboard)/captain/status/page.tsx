"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { CalendarCheck, ChevronDown, Download, Loader2, ShieldAlert, Sparkles, Users } from "lucide-react"
import { ParticipantStatusTab } from "@/components/captain/status/participant-status-tab"
import { EventStatusTab } from "@/components/captain/status/event-status-tab"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface ProfileData {
  team_id: string | null
  teams: { name: string } | null
}

export default function CaptainStatusPage() {
  const [loading, setLoading] = useState(true)
  const [teamName, setTeamName] = useState("")
  const [students, setStudents] = useState<any[]>([])
  const [participations, setParticipations] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function loadTeamData() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError("Not authenticated")
          return
        }

        const { data } = await supabase
          .from("profiles")
          .select("team_id, teams(name)")
          .eq("id", user.id)
          .single()

        const profile = data as unknown as ProfileData

        if (!profile || !profile.team_id) {
          setError("No team assigned to this account.")
          return
        }

        const currentTeamId = profile.team_id
        setTeamName(profile.teams?.name || "Your Team")

        const { data: studentData } = await supabase
          .from("students")
          .select(`
                id, name, chest_no, section, class_grade,
                image_link,
                participations (
                    attendance_status,
                    events (
                        category,
                        max_participants_per_team
                    )
                )
            `)
          .eq("team_id", currentTeamId)
          .order("name")

        setStudents(studentData || [])

        const { data: participationData } = await supabase
          .from("participations")
          .select(`
                id, attendance_status, points_earned,
                event:events ( name, category, event_code, grade_type ),
                student:students ( name, chest_no, class_grade, image_link )
            `)
          .eq("team_id", currentTeamId)
          .order("created_at")

        setParticipations(participationData || [])
      } catch (err: any) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadTeamData()
  }, [])

  const generateTeamPDF = (category: "ON STAGE" | "OFF STAGE") => {
    setGeneratingPdf(true)

    try {
      const filteredParticipations = participations.filter((p) => p.event?.category === category)

      if (filteredParticipations.length === 0) {
        alert(`No ${category} participations found.`)
        setGeneratingPdf(false)
        return
      }

      const doc = new jsPDF()
      const groupedByEvent: Record<string, any[]> = {}
      filteredParticipations.forEach((p) => {
        const eventName = p.event ? `${p.event.name} (${p.event.event_code})` : "Unknown Event"
        if (!groupedByEvent[eventName]) groupedByEvent[eventName] = []
        groupedByEvent[eventName].push(p)
      })

      doc.setFontSize(22)
      doc.text(`TEAM REPORT - ${category}`, 105, 20, { align: "center" })
      doc.setFontSize(14)
      doc.text(`Team: ${teamName}`, 105, 30, { align: "center" })
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 38, { align: "center" })

      let yPos = 50
      Object.keys(groupedByEvent).sort().forEach((eventName, index) => {
        const parts = groupedByEvent[eventName]

        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text(`${index + 1}. ${eventName}`, 14, yPos)
        yPos += 5

        const tableBody = parts.map((p) => [
          p.student?.chest_no || "-",
          p.student?.name || "Unknown",
          p.student?.class_grade || "-",
          p.attendance_status === "present" ? "Present" : (p.attendance_status === "absent" ? "Absent" : "Pending"),
        ])

        autoTable(doc, {
          startY: yPos,
          head: [["Chest No", "Student Name", "Class", "Status"]],
          body: tableBody,
          theme: "grid",
          headStyles: { fillColor: [10, 29, 44], fontSize: 10 },
          bodyStyles: { fontSize: 10 },
          margin: { left: 14, right: 14 },
        })

        // @ts-ignore jspdf-autotable augments the document instance.
        yPos = doc.lastAutoTable.finalY + 15
      })

      doc.save(`${teamName.replace(/\s+/g, "_")}_${category.replace(/\s+/g, "_")}_Report.pdf`)
    } catch (e) {
      console.error("PDF Generation failed", e)
      alert("Failed to generate PDF.")
    } finally {
      setGeneratingPdf(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <div className="surface-elevated flex items-center gap-3 rounded-3xl px-5 py-4">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold text-navy">Loading status dashboard</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col items-center justify-center p-4 text-center">
        <div className="surface-elevated max-w-md rounded-[2rem] p-8">
          <ShieldAlert className="mx-auto mb-3 size-10 text-destructive" />
          <h2 className="text-title text-xl text-navy">Access Restricted</h2>
          <p className="mt-2 text-sm font-semibold text-slatebrand">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-20 md:pb-4">
      <section className="surface-dark relative overflow-hidden rounded-[2rem] p-5 sm:p-6">

        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <Badge variant="gold" className="h-8 gap-2 px-3">
              <Sparkles className="size-3.5" />
              Status Dashboard
            </Badge>
            <h1 className="text-display mt-4 text-3xl text-ivory sm:text-4xl">{teamName} reports.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/62">
              Monitor compliance, attendance, and deduction risks across your team entries.
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={generatingPdf || participations.length === 0} className="bg-gold text-navy hover:bg-gold/90">
                {generatingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Download Report
                <ChevronDown className="size-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="surface-elevated rounded-2xl border-navy/10 p-2">
              <DropdownMenuItem onClick={() => generateTeamPDF("ON STAGE")}>On Stage Events</DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateTeamPDF("OFF STAGE")}>Off Stage Events</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <Tabs defaultValue="participants" className="space-y-5">
        <div className="overflow-x-auto scrollbar-none">
          <TabsList className="h-auto w-max gap-1 rounded-2xl bg-navy/6 p-1">
            <TabsTrigger value="participants" className="rounded-xl px-4 py-2 text-xs font-black text-slatebrand data-[state=active]:bg-navy data-[state=active]:text-ivory">
              <Users className="mr-2 size-4" /> Compliance
            </TabsTrigger>
            <TabsTrigger value="events" className="rounded-xl px-4 py-2 text-xs font-black text-slatebrand data-[state=active]:bg-navy data-[state=active]:text-ivory">
              <CalendarCheck className="mr-2 size-4" /> Attendance
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="participants" className="m-0">
          <ParticipantStatusTab students={students} />
        </TabsContent>

        <TabsContent value="events" className="m-0">
          <EventStatusTab participations={participations} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
