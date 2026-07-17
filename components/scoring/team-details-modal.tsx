"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { FileDown, Loader2, Trophy, Users } from "lucide-react"

interface Props {
  teamId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [10, 29, 44]
}

export function TeamDetailsModal({ teamId, open, onOpenChange }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!teamId || !open) return
    const currentId = teamId

    async function fetchDetails() {
      setLoading(true)

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", currentId)
        .single()

      if (teamError || !team) {
        setLoading(false)
        return
      }

      const { data: parts } = await supabase
        .from("participations")
        .select(`
                points_earned, result_position, performance_grade,
                events ( name, category, applicable_section ),
                students ( name, chest_no )
            `)
        .eq("team_id", currentId)
        .gt("points_earned", 0)

      setData({ team, parts: parts || [] })
      setLoading(false)
    }

    fetchDetails()
  }, [teamId, open])

  const generatePDF = () => {
    if (!data) return
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.text(`${data.team.name} - Score Report`, 14, 20)

    const total = data.parts.reduce((sum: number, p: any) => sum + p.points_earned, 0)
    doc.setFontSize(12)
    doc.text(`Total Points: ${total}`, 14, 30)

    const body = data.parts.map((p: any) => [
      p.events.name,
      p.students?.name || "Team Event",
      p.events.applicable_section?.[0] || "-",
      p.result_position,
      p.performance_grade || "-",
      p.points_earned,
    ])

    autoTable(doc, {
      startY: 35,
      head: [["Event", "Winner", "Section", "Pos", "Grade", "Pts"]],
      body,
      theme: "grid",
      headStyles: { fillColor: hexToRgb(data.team.color_hex || "#0A1D2C") },
    })
    doc.save(`${data.team.name}_report.pdf`)
  }

  if (!teamId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-[800px] flex-col overflow-hidden rounded-[2rem] border-navy/10 bg-ivory p-0 [&>button]:z-50 [&>button]:text-ivory [&>button]:hover:text-gold">
        <DialogHeader className="sr-only">
          <DialogTitle>{data?.team?.name || "Team Details"}</DialogTitle>
          <DialogDescription>Detailed score breakdown.</DialogDescription>
        </DialogHeader>

        <div className="surface-dark relative shrink-0 overflow-hidden p-6">
          {loading ? (
            <div className="flex h-20 items-center justify-center"><Loader2 className="animate-spin text-gold" /></div>
          ) : data && (
            <div className="relative z-10 flex items-end justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-ivory/62">
                  <Users className="size-4 text-gold" />
                  <span className="font-mono text-xs uppercase tracking-[0.18em]">House Performance</span>
                </div>
                <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-ivory">
                  {data.team.name}
                </h2>
              </div>
              <div className="text-right">
                <div className="text-5xl font-black leading-none tracking-tighter text-ivory" style={{ textShadow: `0 0 30px ${data.team.color_hex}40` }}>
                  {data.parts.reduce((sum: number, p: any) => sum + p.points_earned, 0)}
                </div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-ivory/48">Total Points</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-navy/10 bg-mist p-4 px-6">
          <div className="flex items-center gap-2 text-sm font-black text-navy">
            <Trophy className="size-4 text-gold" />
            <span>Score Breakdown</span>
          </div>
          <Button variant="outline" size="sm" onClick={generatePDF} disabled={loading} className="h-9 rounded-2xl">
            <FileDown className="mr-2 size-3.5" /> Download Report
          </Button>
        </div>

        <ScrollArea className="flex-1 p-0">
          {loading ? <div className="h-40" /> : data && (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-mist shadow-sm">
                <TableRow className="border-navy/10">
                  <TableHead className="w-[35%] pl-6 font-black text-slatebrand">Event Name</TableHead>
                  <TableHead className="w-[25%] font-black text-slatebrand">Participant</TableHead>
                  <TableHead className="w-[15%] font-black text-slatebrand">Section</TableHead>
                  <TableHead className="w-[10%] text-center font-black text-slatebrand">Pos</TableHead>
                  <TableHead className="w-[10%] text-center font-black text-slatebrand">Grade</TableHead>
                  <TableHead className="w-[10%] pr-6 text-right font-black text-slatebrand">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.parts.map((p: any, index: number) => (
                  <TableRow key={index} className="border-navy/8 hover:bg-gold/6">
                    <TableCell className="pl-6 font-bold text-navy">{p.events?.name}</TableCell>
                    <TableCell>
                      {p.students?.name ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-navy">{p.students.name}</span>
                          <span className="font-mono text-[10px] text-slatebrand">#{p.students.chest_no}</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold">Team Event</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slatebrand">{p.events?.applicable_section?.[0]}</TableCell>
                    <TableCell className="text-center"><span className="text-xs font-black text-navy">{p.result_position}</span></TableCell>
                    <TableCell className="text-center font-mono text-xs">{p.performance_grade || <span className="text-slatebrand/50">-</span>}</TableCell>
                    <TableCell className="bg-gold/6 pr-6 text-right font-black text-navy">{p.points_earned}</TableCell>
                  </TableRow>
                ))}
                {data.parts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm font-bold text-slatebrand">
                      No scores recorded for {data.team.name} yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
