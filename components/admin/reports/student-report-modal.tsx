"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, Calendar, FileDown, Trophy, Medal } from "lucide-react"

interface Props {
    studentId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function StudentReportModal({ studentId, open, onOpenChange }: Props) {
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

        const { data: parts, error: partsError } = await supabase
            .from('participations')
            .select(`
                points_earned, result_position, performance_grade, status,
                events ( name, category, grade_type )
            `)
            .eq('student_id', currentId)

        if (partsError) console.error("Error fetching parts:", partsError)

        setData({ student, parts: parts || [] })
        setLoading(false)
    }
    fetchDetails()
  }, [studentId, open])

  const generatePDF = () => {
     if(!data) return
     const doc = new jsPDF()

     doc.setFontSize(18)
     doc.text(`Student Report: ${data.student.name}`, 14, 20)

     doc.setFontSize(10)
     doc.text(`Chest No: ${data.student.chest_no || 'N/A'}`, 14, 28)
     doc.text(`Team: ${data.student.teams.name} | Section: ${data.student.section}`, 14, 33)

     const total = data.parts.reduce((s:number, p:any) => s + (p.points_earned || 0), 0)
     doc.text(`Total Score: ${total}`, 14, 40)

     const body = data.parts.map((p:any) => [
         p.events.name,
         p.events.category,
         p.status === 'winner' ? 'Completed' : 'Registered',
         p.result_position || '-',
         p.performance_grade || '-',
         p.points_earned || '0'
     ])

     autoTable(doc, {
         startY: 45,
         head: [['Event', 'Category', 'Status', 'Pos', 'Grade', 'Pts']],
         body: body,
         theme: 'grid',
         headStyles: { fillColor: [63, 81, 181] }
     })

     doc.save(`${data.student.name}_report.pdf`)
  }

  if (!studentId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-[800px] flex-col overflow-hidden rounded-[2rem] border-navy/10 bg-ivory p-0">

        {/* Header Section */}
        <DialogHeader className="shrink-0 border-b border-navy/10 bg-mist p-6 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
                        <User className="size-6" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-black text-navy">
                            {loading ? "Loading..." : data?.student.name}
                        </DialogTitle>
                        {/* FIX: Changed div to span to avoid hydration error since DialogDescription is a p tag */}
                        <DialogDescription className="flex flex-wrap items-center gap-2 mt-1.5">
                            {!loading && data && (
                                <>
                                    <Badge variant="outline" className="bg-ivory font-mono text-xs">
                                        {data.student.chest_no || 'N/A'}
                                    </Badge>
                                    <span className="text-navy/20">|</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="inline-block size-2 rounded-full" style={{ backgroundColor: data.student.teams.color_hex }}></span>
                                        <span className="text-sm font-bold text-navy">{data.student.teams.name}</span>
                                    </span>
                                    <span className="text-navy/20">|</span>
                                    <span className="text-sm font-semibold text-slatebrand">{data.student.section}</span>
                                </>
                            )}
                        </DialogDescription>
                    </div>
                </div>

                {!loading && data && (
                    <div className="flex items-center gap-4 rounded-2xl border border-navy/10 bg-ivory p-2 shadow-sm">
                        <div className="text-right px-2">
                            <div className="text-2xl font-black leading-none text-navy">
                                {data.parts.reduce((acc: number, curr: any) => acc + (curr.points_earned || 0), 0)}
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slatebrand">Total Pts</div>
                        </div>
                        <Button onClick={generatePDF} size="sm" className="h-9">
                            <FileDown className="mr-2 size-4" /> PDF
                        </Button>
                    </div>
                )}
            </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto bg-mist/50 p-4 sm:p-6">
            {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 className="size-8 animate-spin text-gold" />
                    <p className="text-sm font-semibold text-slatebrand">Fetching student records...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Trophy className="size-4 text-gold" />
                            <h4 className="text-sm font-black uppercase tracking-[0.12em] text-navy">
                                Participation History
                            </h4>
                            <Badge variant="outline" className="ml-2">
                                {data?.parts.length} Events
                            </Badge>
                        </div>
                    </div>

                    {data?.parts.length === 0 ? (
                        <div className="flex h-60 flex-col items-center justify-center rounded-3xl border border-dashed border-navy/12 bg-ivory text-slatebrand">
                            <Calendar className="mb-3 size-12 opacity-30" />
                            <p>No events registered for this student.</p>
                        </div>
                    ) : (
                        <div className="w-full rounded-3xl border border-navy/10 bg-ivory shadow-sm">
                            {/* Horizontal Scroll Wrapper - Explicitly defined with overflow-x-auto */}
                            <div className="w-full overflow-x-auto pb-2">
                                <table className="w-full min-w-[800px] text-sm text-left">
                                    <thead className="border-b border-navy/10 bg-mist">
                                        <tr>
                                            <th className="w-[30%] whitespace-nowrap px-4 py-3 font-black text-slatebrand">Event Name</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-black text-slatebrand">Category</th>
                                            <th className="whitespace-nowrap px-4 py-3 text-center font-black text-slatebrand">Status</th>
                                            <th className="whitespace-nowrap px-4 py-3 text-center font-black text-slatebrand">Position</th>
                                            <th className="whitespace-nowrap px-4 py-3 text-center font-black text-slatebrand">Grade</th>
                                            <th className="whitespace-nowrap py-3 pl-4 pr-6 text-right font-black text-slatebrand">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-navy/8">
                                        {data.parts.map((p: any, idx: number) => (
                                            <tr key={idx} className="transition-colors hover:bg-gold/6">
                                                <td className="px-4 py-3 font-bold text-navy">
                                                    {p.events.name}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-navy/10 bg-navy/6 px-2 py-1 text-xs font-bold text-slatebrand">
                                                        {p.events.category}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {p.status === 'winner' ? (
                                                        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-success/20 bg-success/10 px-2 py-1 text-xs font-bold text-success">
                                                            <Medal className="mr-1 size-3" />
                                                            Completed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-navy/6 px-2 py-1 text-xs font-semibold text-slatebrand">
                                                            Registered
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {p.result_position ? (
                                                        <span className="font-bold text-navy">{p.result_position}</span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono text-slatebrand">
                                                    {p.performance_grade || '-'}
                                                </td>
                                                <td className="py-3 px-4 text-right pr-6">
                                                    {p.points_earned > 0 ? (
                                                        <span className="whitespace-nowrap rounded-full bg-gold/10 px-2 py-1 text-xs font-black text-navy">
                                                            {p.points_earned} pts
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 font-medium">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
