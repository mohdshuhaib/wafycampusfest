"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { BarChart3, Download, Loader2, Medal, PieChart, Sparkles, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TeamPerformance } from "@/components/overview/team-performance"
import { SectionAnalysis } from "@/components/overview/section-analysis"
import { TopStudents } from "@/components/overview/top-students"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface Team {
  id: string
  name: string
  color_hex: string
}

export default function OverviewPage() {
  const [loading, setLoading] = useState(true)
  const [teamStats, setTeamStats] = useState<Array<any>>([])
  const [classStats, setClassStats] = useState<Array<any>>([])
  const [studentStats, setStudentStats] = useState<Array<any>>([])
  const [isDownloading, setIsDownloading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, color_hex") as { data: Team[] | null; error: any }

      if (teamsError || !teamsData) {
        console.error("Error fetching teams", teamsError)
        setLoading(false)
        return
      }

      const { data: participations, error: partError } = await supabase
        .from("participations")
        .select(`
          points_earned,
          result_position,
          team:teams ( id, name, color_hex ),
          student:students ( id, name, chest_no, section, class_grade ),
          event:events ( category, grade_type )
        `)
        .gt("points_earned", 0)

      const { data: allStudents } = await supabase
        .from("students")
        .select("id, class_grade, section")

      if (partError || !participations) {
        console.error("Error fetching participations", partError)
        setLoading(false)
        return
      }

      const teamsMap = new Map()

      teamsData.forEach((team) => {
        teamsMap.set(team.id, {
          name: team.name,
          color: team.color_hex,
          earnedPoints: 0,
          totalPoints: 0,
          first: 0,
          second: 0,
          third: 0,
        })
      })

      participations.forEach((p: any) => {
        if (!p.team) return
        const tid = p.team.id

        if (teamsMap.has(tid)) {
          const t = teamsMap.get(tid)
          t.earnedPoints += p.points_earned
          if (p.result_position === "FIRST") t.first++
          if (p.result_position === "SECOND") t.second++
          if (p.result_position === "THIRD") t.third++
        }
      })

      teamsMap.forEach((t) => {
        t.totalPoints = t.earnedPoints
      })

      setTeamStats(Array.from(teamsMap.values()).sort((a, b) => b.totalPoints - a.totalPoints))

      const classMap = new Map()
      ;(allStudents || []).forEach((student: any) => {
        if (!student.class_grade || student.section !== "Senior") return
        if (!classMap.has(student.class_grade)) {
          classMap.set(student.class_grade, {
            className: student.class_grade,
            section: "Senior",
            studentCount: 0,
            totalPoints: 0,
            first: 0,
            second: 0,
            third: 0,
            positionCount: 0,
            pointsPerStudent: 0,
            positionsPerStudent: 0,
          })
        }
        classMap.get(student.class_grade).studentCount++
      })

      participations.forEach((p: any) => {
        if (!p.student || !p.student.class_grade) return
        if (p.student.section !== "Senior") return
        const key = p.student.class_grade
        if (!classMap.has(key)) {
          classMap.set(key, {
            className: p.student.class_grade,
            section: "Senior",
            studentCount: 0,
            totalPoints: 0,
            first: 0,
            second: 0,
            third: 0,
            positionCount: 0,
            pointsPerStudent: 0,
            positionsPerStudent: 0,
          })
        }
        const row = classMap.get(key)
        row.totalPoints += p.points_earned
        if (p.result_position === "FIRST") row.first++
        if (p.result_position === "SECOND") row.second++
        if (p.result_position === "THIRD") row.third++
      })
      const classes = Array.from(classMap.values()).map((row) => ({
        ...row,
        positionCount: row.first + row.second + row.third,
        pointsPerStudent: row.studentCount > 0 ? Number((row.totalPoints / row.studentCount).toFixed(2)) : 0,
        positionsPerStudent: row.studentCount > 0 ? Number(((row.first + row.second + row.third) / row.studentCount).toFixed(2)) : 0,
      }))
      setClassStats(classes)

      const studentMap = new Map()
      participations.forEach((p: any) => {
        if (!p.student || p.student.section !== "Senior") return
        if (p.event?.grade_type === "D") return

        const sid = p.student.id
        if (!studentMap.has(sid)) {
          studentMap.set(sid, {
            name: p.student.name,
            chestNo: p.student.chest_no,
            section: p.student.section,
            teamName: p.team?.name,
            teamColor: p.team?.color_hex,
            totalPoints: 0,
            first: 0,
            second: 0,
            third: 0,
          })
        }
        const s = studentMap.get(sid)
        s.totalPoints += p.points_earned
        if (p.result_position === "FIRST") s.first++
        if (p.result_position === "SECOND") s.second++
        if (p.result_position === "THIRD") s.third++
      })
      setStudentStats(Array.from(studentMap.values()))

      setLoading(false)
    }

    fetchData()
  }, [])

  const totals = useMemo(() => {
    const earned = teamStats.reduce((sum, team) => sum + (team.earnedPoints || 0), 0)
    const awards = teamStats.reduce((sum, team) => sum + team.first + team.second + team.third, 0)
    return {
      earned,
      awards,
      students: studentStats.length,
      leader: teamStats[0]?.name || "Awaiting scores",
      leaderPoints: teamStats[0]?.totalPoints || 0,
    }
  }, [teamStats, studentStats])

  const handleDownloadPDF = () => {
    setIsDownloading(true)

    try {
      const doc = new jsPDF()

      doc.setFontSize(22)
      doc.text("ARTS FEST 2025 - OVERVIEW REPORT", 105, 20, { align: "center" })
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 28, { align: "center" })

      let yPos = 40

      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("1. TEAM STANDINGS", 14, yPos)
      yPos += 5

      autoTable(doc, {
        startY: yPos,
        head: [["Rank", "Team Name", "Total Points", "1st", "2nd", "3rd"]],
        body: teamStats.map((t, i) => [
          i + 1,
          t.name,
          t.earnedPoints,
          t.first,
          t.second,
          t.third,
        ]),
        theme: "striped",
        headStyles: { fillColor: [10, 29, 44] },
        columnStyles: {
          2: { fontStyle: "bold" },
        },
      })

      // @ts-ignore jspdf-autotable augments the document instance at runtime.
      yPos = doc.lastAutoTable.finalY + 15

      doc.text("2. TOP PERFORMERS (INDIVIDUAL)", 14, yPos)
      yPos += 5

      const topStudents = [...studentStats].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10)

      autoTable(doc, {
        startY: yPos,
        head: [["Rank", "Name", "Chest No", "Section", "Team", "Points"]],
        body: topStudents.map((s, i) => [i + 1, s.name, s.chestNo, s.section, s.teamName, s.totalPoints]),
        theme: "grid",
        headStyles: { fillColor: [18, 59, 79] },
      })

      // @ts-ignore jspdf-autotable augments the document instance at runtime.
      yPos = doc.lastAutoTable.finalY + 15

      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }

      doc.text("3. CLASS-WISE PERFORMANCE LEADERBOARD", 14, yPos)
      yPos += 5

      const topClasses = [...classStats].sort((a, b) => b.totalPoints - a.totalPoints)

      autoTable(doc, {
        startY: yPos,
        head: [["Rank", "Class", "Students", "Points", "Pts/Student", "Positions", "Pos/Student"]],
        body: topClasses.map((c, i) => [i + 1, c.className, c.studentCount, c.totalPoints, c.pointsPerStudent, c.positionCount, c.positionsPerStudent]),
        theme: "striped",
        headStyles: { fillColor: [10, 29, 44] },
      })

      doc.save("ArtsFest_Overview_Stats.pdf")
    } finally {
      setIsDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] w-full items-center justify-center">
        <div className="surface-elevated flex items-center gap-3 rounded-3xl px-5 py-4">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold text-navy">Preparing executive overview</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] space-y-5 pb-20 md:pb-4">
      <section className="surface-dark relative overflow-hidden rounded-[2rem] p-5 sm:p-6">

        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <Badge variant="gold" className="h-8 gap-2 px-3">
              <Sparkles className="size-3.5" />
              Executive Summary
            </Badge>
            <h1 className="text-display mt-4 text-3xl text-ivory sm:text-4xl">The festival at a glance.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/62">
              Consolidated standings, class performance, and individual excellence for quick leadership decisions.
            </p>
          </div>

          <Button onClick={handleDownloadPDF} disabled={isDownloading} className="bg-gold text-navy hover:bg-gold/90">
            {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Download Report
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric label="Current Leader" value={totals.leader} helper={`${totals.leaderPoints} total points`} icon={Trophy} tone="gold" />
        <OverviewMetric label="Earned Points" value={totals.earned} helper="Total judging points" icon={BarChart3} tone="navy" />
        <OverviewMetric label="Individual Scorers" value={totals.students} helper="Non-group item performers" icon={Users} tone="blue" />
        <OverviewMetric label="Awarded Positions" value={totals.awards} helper="First, second, and third places" icon={Medal} tone="slate" />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="space-y-5">
          <TeamPerformance data={teamStats} />
          <SectionAnalysis data={classStats} />
        </div>
        <TopStudents data={studentStats} />
      </section>
    </div>
  )
}

function OverviewMetric({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  helper: string
  icon: typeof PieChart
  tone: "gold" | "navy" | "blue" | "slate"
}) {
  const toneClasses = {
    gold: "bg-gold/12 text-gold",
    navy: "bg-navy text-ivory",
    blue: "bg-deepblue text-ivory",
    slate: "bg-slatebrand text-ivory",
  }

  return (
    <div className="surface-elevated rounded-[2rem] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow text-slatebrand">{label}</p>
          <div className="mt-2 truncate text-2xl font-black text-navy">{value}</div>
          <p className="mt-1 text-xs font-semibold text-slatebrand">{helper}</p>
        </div>
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  )
}
