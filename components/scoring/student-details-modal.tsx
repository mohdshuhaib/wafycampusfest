"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, FileDown, Trophy, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Props {
    studentId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function StudentDetailsModal({ studentId, open, onOpenChange }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!studentId || !open) return
    const currentId: string = studentId

    async function fetchDetails() {
        setLoading(true)

        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('*, teams(name, color_hex)')
            .eq('id', currentId)
            .single()

        if (studentError || !student) {
            setLoading(false)
            return
        }

        const { data: parts } = await supabase
            .from('participations')
            .select(`
                points_earned, result_position, performance_grade,
                events ( name, category, grade_type )
            `)
            .eq('student_id', currentId)
            .gt('points_earned', 0)

        setData({ student, parts: parts || [] })
        setLoading(false)
    }

    fetchDetails()
  }, [studentId, open])

  const generatePDF = () => {
     if(!data) return
     const doc = new jsPDF()

     doc.setFontSize(20)
     doc.text(`Performance Report: ${data.student.name}`, 14, 20)
     doc.setFontSize(10)
     doc.text(`Chest No: ${data.student.chest_no} | Team: ${data.student.teams.name}`, 14, 30)
     const total = data.parts.reduce((s:number, p:any) => s + p.points_earned, 0)
     doc.text(`Total Career Points: ${total}`, 14, 36)

     const body = data.parts.map((p:any) => [
         p.events.name,
         p.events.category,
         p.result_position,
         p.performance_grade || '-',
         p.points_earned
     ])

     autoTable(doc, {
         startY: 40,
         head: [['Event', 'Category', 'Pos', 'Grade', 'Pts']],
         body: body,
         theme: 'grid',
         headStyles: { fillColor: [41, 128, 185] }
     })

     doc.save(`${data.student.name}_performance.pdf`)
  }

  if (!studentId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-[700px] flex-col overflow-hidden rounded-[2rem] border-navy/10 bg-ivory p-0 [&>button]:z-50 [&>button]:text-ivory [&>button]:hover:text-gold">

        <DialogHeader className="sr-only">
             <DialogTitle>{data?.student?.name || "Student Details"}</DialogTitle>
             <DialogDescription>Performance history and points breakdown.</DialogDescription>
        </DialogHeader>

        {/* Header Section */}
        <div className="surface-dark relative shrink-0 overflow-hidden p-6">

            {loading ? (
                <div className="flex h-20 items-center justify-center"><Loader2 className="animate-spin text-gold" /></div>
            ) : data && (
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                             <Badge variant="gold">
                                {data.student.section}
                             </Badge>
                             <span className="font-mono text-xs text-ivory/60">#{data.student.chest_no}</span>
                        </div>
                        {/* Visible Title Area */}
                        <h2 className="flex items-center gap-2 text-2xl font-black text-ivory">
                            <User className="size-6 text-gold" />
                            {data.student.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                             <p className="text-sm font-bold" style={{ color: data.student.teams.color_hex }}>{data.student.teams.name}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black text-ivory">{data.parts.reduce((s:number, p:any) => s + p.points_earned, 0)}</div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-ivory/48">Total Points</div>
                    </div>
                </div>
            )}
        </div>

        {/* Action Bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-navy/10 bg-mist p-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-navy">
                <Trophy className="size-4 text-gold" /> Event History
            </h3>
            <Button variant="outline" size="sm" onClick={generatePDF} disabled={loading} className="h-9 rounded-2xl">
                <FileDown className="mr-2 size-3.5" /> Download Report
            </Button>
        </div>

        <ScrollArea className="flex-1 p-0">
             {loading ? <div className="h-40" /> : data && (
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-mist">
                        <TableRow className="border-navy/10">
                            <TableHead className="pl-6 font-black text-slatebrand">Event Name</TableHead>
                            <TableHead className="font-black text-slatebrand">Category</TableHead>
                            <TableHead className="text-center font-black text-slatebrand">Position</TableHead>
                            <TableHead className="text-center font-black text-slatebrand">Grade</TableHead>
                            <TableHead className="pr-6 text-right font-black text-slatebrand">Pts</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.parts.map((p:any, i:number) => (
                            <TableRow key={i} className="border-navy/8 hover:bg-gold/6">
                                <TableCell className="pl-6 font-bold text-navy">{p.events.name}</TableCell>
                                <TableCell className="text-xs font-semibold text-slatebrand">{p.events.category}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className="font-normal text-xs">
                                        {p.result_position}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs text-slatebrand">{p.performance_grade || '-'}</TableCell>
                                <TableCell className="pr-6 text-right font-black text-navy">{p.points_earned}</TableCell>
                            </TableRow>
                        ))}
                        {data.parts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="py-12 text-center text-sm font-bold text-slatebrand">
                                    No winnings recorded yet.
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
