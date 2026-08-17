"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Loader2, FileText, Printer, FileDown, ChevronDown, Check, UserCheck, UserX, Clock, FileSpreadsheet, Download, ClipboardCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { StudentPhoto } from "@/components/student-photo"
import { getCroppedSquareImageDataUrl } from "@/lib/student-images"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from 'xlsx'

interface Event {
    id: string;
    name: string;
    event_code: string;
    category: string;
    grade_type?: 'A' | 'B' | 'C' | 'D';
    max_participants_per_team: number
}

interface ParticipationRecord {
    id: string
    team_id: string
    event_id: string
    status: string
    attendance_status: string | null
    students: {
        name: string
        chest_no: string | null
        class_grade: string | null
        image_link: string | null
        section: string
        team: {
            name: string
            color_hex: string
        }
    }
}

interface CompletionStatusRow {
    event_id: string
    attendance_status: string | null
}

export function EventCallSheetTab({ events }: { events: Event[] }) {
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [loadingEvent, setLoadingEvent] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [generatingCallSheet, setGeneratingCallSheet] = useState(false)
  const [generatingList, setGeneratingList] = useState(false)
  const [generatingExcel, setGeneratingExcel] = useState(false)
  const [participants, setParticipants] = useState<ParticipationRecord[]>([])
  const [completedEventIds, setCompletedEventIds] = useState<Set<string>>(new Set())
  const [headerImage, setHeaderImage] = useState<string | null>(null)

  const supabase = createClient()

  // 1. Inject Font Face for Canvas (Malayalam Rendering)
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @font-face {
        font-family: 'AnekMalayalam';
        src: url('/AnekMalayalam-Regular.ttf') format('truetype');
      }
    `;
    document.head.appendChild(style);
    return () => {
        document.head.removeChild(style);
    }
  }, []);

  // 2. Fetch Header Image & Completion Status
  useEffect(() => {
    async function initData() {
        const { data: assetData } = await supabase
            .from('site_assets')
            .select('key, value')
            .in('key', ['event_call_sheet_logo', 'score_sheet_header'])

        if (assetData) {
            const assets = assetData as unknown as { key: string; value: string }[]
            const headerAsset = assets.find((asset) => asset.key === 'event_call_sheet_logo')
                || assets.find((asset) => asset.key === 'score_sheet_header')
            if (headerAsset) setHeaderImage(headerAsset.value)
        }

        const { data } = await supabase
            .from('participations')
            .select('event_id, attendance_status')

        if (data) {
            const records = data as unknown as CompletionStatusRow[]
            const statusMap: Record<string, boolean> = {}

            records.forEach(p => {
                if (statusMap[p.event_id] === false) return;
                if (statusMap[p.event_id] === undefined) statusMap[p.event_id] = true;
                if (!p.attendance_status || p.attendance_status === 'pending') {
                    statusMap[p.event_id] = false;
                }
            })

            const completed = new Set<string>()
            Object.keys(statusMap).forEach(id => {
                if (statusMap[id]) completed.add(id)
            })
            setCompletedEventIds(completed)
        }
    }
    initData()
  }, [events])

  // 3. Load Participants for Selected Event
  useEffect(() => {
    if (!selectedEventId) {
      setParticipants([])
      return
    }

    async function loadEventData() {
      setLoadingEvent(true)
      const { data } = await supabase
        .from('participations')
        .select(`
          id, team_id, event_id, status, attendance_status,
          teams ( name, color_hex ),
          students!inner ( name, chest_no, class_grade, section, image_link )
        `)
        .eq('event_id', selectedEventId)
        .order('created_at', { ascending: true })

      if (data) {
        const rawData = data as unknown as any[]
        const formatted: ParticipationRecord[] = rawData.map((p) => ({
          id: p.id,
          team_id: p.team_id,
          event_id: p.event_id,
          status: p.status,
          attendance_status: p.attendance_status || 'pending',
          students: {
            name: p.students?.name || "Unknown",
            chest_no: p.students?.chest_no || 'N/A',
            class_grade: p.students?.class_grade || '-',
            image_link: p.students?.image_link || null,
            section: p.students?.section || '-',
            team: {
                name: p.teams?.name || "Unknown Team",
                color_hex: p.teams?.color_hex || "#ccc"
            }
          }
        }))

        formatted.sort((a, b) => {
            const chestA = parseInt(a.students.chest_no || '999') || 999
            const chestB = parseInt(b.students.chest_no || '999') || 999
            return chestA - chestB
        })

        setParticipants(formatted)
      }
      setLoadingEvent(false)
    }
    loadEventData()
  }, [selectedEventId])

  // 4. Handle Status Change
  const updateAttendance = async (participationId: string, newStatus: string) => {
      setParticipants(prev => prev.map(p =>
          p.id === participationId ? { ...p, attendance_status: newStatus } : p
      ))

      try {
          const { error } = await (supabase.from('participations') as any)
            .update({ attendance_status: newStatus })
            .eq('id', participationId)

          if (error) throw error

          const allMarked = participants.every(p => {
              if (p.id === participationId) return newStatus !== 'pending';
              return p.attendance_status !== 'pending';
          })

          setCompletedEventIds(prev => {
              const next = new Set(prev)
              if (allMarked) next.add(selectedEventId)
              else next.delete(selectedEventId)
              return next
          })
      } catch (err) {
          console.error("Failed to update status", err)
      }
  }

  // --- HELPER: Render Text to Image using Canvas (Fixes Malayalam Rendering) ---
  const textToImage = (text: string, widthMM: number, fontSizePt: number): { dataUrl: string; heightMM: number } | null => {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const pxPerMM = 3.78;
    const scaleFactor = 3;

    const widthPx = widthMM * pxPerMM * scaleFactor;
    canvas.width = widthPx;
    canvas.height = 1000 * scaleFactor;

    ctx.scale(scaleFactor, scaleFactor);
    ctx.font = `${fontSizePt * 1.33}px 'AnekMalayalam', 'Arial', sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000000';

    const maxWidth = widthMM * pxPerMM;
    const lineHeight = fontSizePt * 1.33 * 1.4;

    const paragraphs = text.split('\n');
    let y = 0;

    paragraphs.forEach(para => {
        const words = para.split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, 0, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, 0, y);
        y += lineHeight;
    });

    const finalHeight = (y + lineHeight) * scaleFactor;
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = widthPx;
    finalCanvas.height = finalHeight;
    const finalCtx = finalCanvas.getContext('2d');
    if (finalCtx) {
        finalCtx.drawImage(canvas, 0, 0);
        return { dataUrl: finalCanvas.toDataURL('image/png'), heightMM: (finalHeight / scaleFactor) / pxPerMM };
    }
    return null;
  }

  // --- EVENT CALL SHEET PDF GENERATOR (Single & Bulk) ---
  const generateCallSheetPDF = async (eventsToPrint: Event[]) => {
    if (eventsToPrint.length === 0) return alert("No events selected to print.")
    setGeneratingCallSheet(true)

    try {
      const doc = new jsPDF("p", "mm", "a4")
      let isFirstPage = true

      for (const event of eventsToPrint) {
        const { data } = await supabase
          .from("participations")
          .select(`
            id, team_id, event_id, status,
            teams ( name, color_hex ),
            students!inner ( name, chest_no, class_grade, section, image_link )
          `)
          .eq("event_id", event.id)

        const rawParts = (data as any[]) || []
        const parts = rawParts.map((p) => ({
          id: p.id,
          chest_no: p.students?.chest_no || "N/A",
          name: p.students?.name || "Unknown",
          class_grade: p.students?.class_grade || "-",
          teamName: p.teams?.name || "Unknown Team",
          image_link: p.students?.image_link || null,
        })).sort((a, b) => (parseInt(a.chest_no) || 999) - (parseInt(b.chest_no) || 999))

        // Pre-crop all participant photos
        const photoDataMap = new Map<number, string>()
        for (let i = 0; i < parts.length; i++) {
          if (parts[i].image_link) {
            const croppedData = await getCroppedSquareImageDataUrl(parts[i].image_link, 150)
            if (croppedData) photoDataMap.set(i, croppedData)
          }
        }

        if (!isFirstPage) doc.addPage()
        isFirstPage = false

        const pageWidth = doc.internal.pageSize.getWidth()
        const margin = 12
        let yPos = 12

        // Top Banner Header
        doc.setFillColor(10, 29, 44)
        doc.roundedRect(margin, yPos, pageWidth - margin * 2, 22, 3, 3, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(15)
        doc.setFont("helvetica", "bold")
        doc.text("WAFY CAMPUS KALIKAVU ARTS FEST 2026", pageWidth / 2, yPos + 9, { align: "center" })
        doc.setFontSize(8.5)
        doc.setFont("helvetica", "normal")
        doc.text("OFFICIAL EVENT CALL SHEET & PHYSICAL ATTENDANCE REGISTER", pageWidth / 2, yPos + 16, { align: "center" })
        yPos += 27

        // Subheader: Programme Code & Name
        doc.setTextColor(10, 29, 44)
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text(`PROGRAMME: ${event.event_code || "---"} - ${event.name}`, margin, yPos)

        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        doc.text(`Category: ${event.category}  |  Total: ${parts.length}`, pageWidth - margin, yPos, { align: "right" })
        yPos += 6

        // AutoTable Grid
        const tableBody = parts.map((p, idx) => [
          idx + 1,
          "", // Photo column
          p.chest_no,
          p.name,
          p.class_grade,
          p.teamName,
          "", // Signature box
        ])

        autoTable(doc, {
          startY: yPos,
          head: [["Sl No", "Photo", "Chest No", "Name", "Class", "Team", "Sign"]],
          body: tableBody,
          theme: "grid",
          headStyles: {
            fillColor: [10, 29, 44],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
          },
          bodyStyles: {
            fontSize: 8.5,
            valign: "middle",
            minCellHeight: 14,
            textColor: [10, 29, 44],
          },
          columnStyles: {
            0: { cellWidth: 12, halign: "center" },
            1: { cellWidth: 16, halign: "center" },
            2: { cellWidth: 20, halign: "center", fontStyle: "bold" },
            3: { cellWidth: "auto", fontStyle: "bold" },
            4: { cellWidth: 18, halign: "center" },
            5: { cellWidth: 32 },
            6: { cellWidth: 30, halign: "center" },
          },
          didDrawCell: (data) => {
            if (data.section === "body" && data.column.index === 1) {
              const photoUrl = photoDataMap.get(data.row.index)
              if (photoUrl) {
                const dim = 11
                const x = data.cell.x + (data.cell.width - dim) / 2
                const y = data.cell.y + (data.cell.height - dim) / 2
                try {
                  doc.addImage(photoUrl, "JPEG", x, y, dim, dim)
                } catch (e) {
                  console.warn("Failed to add cell photo", e)
                }
              }
            }
          },
        })
      }

      doc.save("event_call_sheets.pdf")
    } catch (err) {
      console.error("Error generating call sheet PDF:", err)
      alert("Failed to generate Call Sheet PDF.")
    } finally {
      setGeneratingCallSheet(false)
    }
  }

  // --- GENERATE SCORE SHEET (JUDGMENT SHEET) ---
  const generateScoreSheetPDF = async (eventsToPrint: Event[]) => {
    setGeneratingPdf(true)
    const doc = new jsPDF('p', 'mm', 'a4');
    let isFirstPage = true

    let headerImgData = "";
    if (headerImage) {
        headerImgData = await getCroppedSquareImageDataUrl(headerImage, 400);
    }

    for (const event of eventsToPrint) {
        if (!isFirstPage) doc.addPage()
        isFirstPage = false

        const [eventDetails, participantsRes] = await Promise.all([
            supabase.from('events').select('description').eq('id', event.id).single(),
            supabase.from('participations').select('id, teams(name), students(chest_no)').eq('event_id', event.id)
        ]);

        const criteria = (eventDetails.data as { description: string } | null)?.description || "";
        const parts = participantsRes.data as any[] || [];

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let yPos = 15;

        if (headerImgData) {
            try {
                const imgProps = doc.getImageProperties(headerImgData);
                const desiredWidth = pageWidth - 2 * margin;
                let imgHeight = (imgProps.height * desiredWidth) / imgProps.width;
                if (imgHeight > 30) {
                    imgHeight = 30;
                    const adjustedWidth = (imgProps.width * imgHeight) / imgProps.height;
                    const xOffset = (pageWidth - adjustedWidth) / 2;
                    doc.addImage(headerImgData, 'PNG', xOffset, yPos, adjustedWidth, imgHeight);
                } else {
                    doc.addImage(headerImgData, 'PNG', margin, yPos, desiredWidth, imgHeight);
                }
                yPos += imgHeight + 5;
            } catch (e) { console.warn("Could not add header image", e) }
        } else {
             doc.setFontSize(16);
             doc.setFont("helvetica", "bold");
             doc.text("WAFY CAMPUS KALIKAVU ARTS FEST 2026", pageWidth / 2, yPos, { align: 'center' });
             yPos += 10;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("JUDGMENT SHEET", pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("GRADING SYSTEM: GRADE A-80% AND ABOVE, GRADE B-70% TO 79%, GRADE C-60% TO 69%", pageWidth / 2, yPos, { align: 'center' });
        yPos += 12;

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("ITEM:", margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(`${event.name} (${event.event_code})`, margin + 15, yPos);
        yPos += 8;

        doc.setFont("helvetica", "bold");
        doc.text("TOPIC:", margin, yPos);
        doc.setLineWidth(0.1);
        doc.line(margin + 18, yPos + 1, pageWidth - margin, yPos + 1);
        yPos += 8;

        doc.setFont("helvetica", "bold");
        doc.text("CRITERIA:", margin, yPos);

        if (criteria) {
             const criteriaWidth = pageWidth - margin - 35;
             const result = textToImage(criteria, criteriaWidth, 10);

             if (result) {
                 const { dataUrl, heightMM } = result;
                 doc.addImage(dataUrl, 'PNG', margin + 25, yPos, criteriaWidth, heightMM);
                 yPos += heightMM + 5;
             } else {
                 yPos += 8;
             }
        } else {
             yPos += 8;
        }

        yPos += 2;

        const isCategoryC = event.grade_type === 'D';
        let effectiveCount = 0;

        if (isCategoryC) {
            effectiveCount = 4;
        } else {
            const rowCount = parts.length;
            effectiveCount = Math.max(rowCount, 5);
        }

        const footerHeight = 30;
        const bottomMargin = 15;
        const availableHeight = pageHeight - yPos - footerHeight - bottomMargin;
        const tableHeaderHeight = 10;
        const availableForRows = availableHeight - tableHeaderHeight;

        let dynamicRowHeight = availableForRows / effectiveCount;
        if (dynamicRowHeight > 35) dynamicRowHeight = 35;
        if (dynamicRowHeight < 10) dynamicRowHeight = 10;

        const tableBody = [];
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        for (let i = 0; i < effectiveCount; i++) {
            const code = letters[i % 26] + (Math.floor(i / 26) > 0 ? Math.floor(i / 26) : "");
            tableBody.push([
                code, "", "", ""
            ]);
        }

        autoTable(doc, {
            startY: yPos,
            head: [["CODE", "REMARKS", "PLACE", "GRADE"]],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                lineWidth: 0.3,
                lineColor: [0, 0, 0],
                halign: 'center',
                valign: 'middle',
                fontStyle: 'bold',
                minCellHeight: 10
            },
            bodyStyles: {
                lineWidth: 0.3,
                lineColor: [0, 0, 0],
                minCellHeight: dynamicRowHeight,
                valign: 'middle',
                textColor: [0,0,0]
            },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center', fontStyle: 'bold', fontSize: 12 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' }
            },
            didParseCell: function(data: any) {
                data.cell.styles.textColor = [0, 0, 0];
            }
        });

        const footerY = pageHeight - 25;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("NAME & SIGN OF THE JUDGE : _______________________________", margin, footerY);
    }

    doc.save("judgment_sheets.pdf")
    setGeneratingPdf(false)
  }

  // --- GENERATE PARTICIPANT LIST (BULK EXPORT) ---
  const generateParticipantListPDF = async (category: 'ON STAGE' | 'OFF STAGE') => {
      setGeneratingList(true);

      const filteredEvents = events.filter(e => e.category === category);
      if (filteredEvents.length === 0) {
          alert(`No events found for ${category}`);
          setGeneratingList(false);
          return;
      }

      const doc = new jsPDF();

      doc.setFontSize(22);
      doc.text(`PARTICIPANT LIST - ${category}`, 105, 100, { align: 'center' });
      doc.setFontSize(14);
      doc.text("WAFY CAMPUS KALIKAVU ARTS FEST 2026", 105, 115, { align: 'center' });
      doc.addPage();

      for (const event of filteredEvents) {
          const { data } = await supabase
            .from('participations')
            .select(`
               students ( name, chest_no, class_grade, section, image_link ),
               teams ( name )
            `)
            .eq('event_id', event.id);

          const rawParts = data as any[] || [];
          const parts = rawParts.map(p => ({
              chest: p.students?.chest_no || "N/A",
              name: p.students?.name || "Unknown",
              class: p.students?.class_grade || "",
              team: p.teams?.name || "Unknown"
          })).sort((a, b) => (parseInt(a.chest) || 999) - (parseInt(b.chest) || 999));

          if (parts.length > 0) {
              const body = parts.map((p, i) => [i + 1, p.chest, p.name, p.class, p.team]);

              doc.setFontSize(14);
              doc.setFont("helvetica", "bold");
              const finalY = (doc as any).lastAutoTable?.finalY || 20;

              let titleY = finalY === 20 ? 20 : finalY + 15;
              if (titleY > 270) {
                  doc.addPage();
                  titleY = 20;
              }
              doc.text(`${event.name} (${event.event_code})`, 14, titleY);

              autoTable(doc, {
                  startY: titleY + 5,
                  head: [["#", "Chest No", "Name", "Class", "Team"]],
                  body: body,
                  theme: 'striped',
                  headStyles: { fillColor: [50, 50, 50] },
                  margin: { top: 20 },
                  pageBreak: 'avoid'
              });
          }
      }

      doc.save(`${category}_Participant_List.pdf`);
      setGeneratingList(false);
  }

  // --- EXCEL GENERATION LOGIC ---
  const generateExcel = async () => {
    try {
        setGeneratingExcel(true)
        const { data: allData } = await supabase.from('participations').select(`event_id, teams (name), students (name)`);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(allData?.map((p:any) => ({
            EventID: p.event_id,
            Student: p.students?.name,
            Team: p.teams?.name
        })) || []);
        XLSX.utils.book_append_sheet(wb, ws, "Participants");
        XLSX.writeFile(wb, "ArtsFest_Data.xlsx");

    } catch (error) {
        console.error("Excel generation failed:", error)
        alert("Failed to generate Excel file.")
    } finally {
        setGeneratingExcel(false)
    }
  }

  return (
    <div className="surface-elevated flex h-full flex-col overflow-hidden rounded-[2rem]">
        {/* Toolbar */}
        <div className="shrink-0 border-b border-navy/10 bg-ivory/70 p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="w-full sm:w-[400px] space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slatebrand">
                    <ClipboardCheck className="size-3.5 text-gold" />
                    Select Event Sheet
                </label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="h-11 w-full rounded-2xl bg-ivory shadow-sm">
                        <SelectValue placeholder="Choose an event to mark..." />
                    </SelectTrigger>
                    <SelectContent className="surface-elevated max-h-[300px] rounded-2xl border-navy/10">
                        {events.map(e => (
                            <SelectItem key={e.id} value={e.id} className="cursor-pointer">
                                <div className="flex items-center justify-between w-full gap-4">
                                    <span className={cn("font-semibold", completedEventIds.has(e.id) ? "text-success" : "text-navy")}>
                                        {e.name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {completedEventIds.has(e.id) && <Check className="size-3 text-success" />}
                                        <span className={cn("ml-auto rounded-full border px-2 py-0.5 text-xs font-mono", completedEventIds.has(e.id) ? "border-success/20 bg-success/10 text-success" : "border-navy/10 text-slatebrand")}>
                                            {e.event_code || '---'}
                                        </span>
                                    </div>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {/* EXCEL BUTTON */}
                <Button
                    variant="outline"
                    onClick={generateExcel}
                    disabled={generatingExcel}
                    className="gap-2 border-success/20 bg-success/10 text-success hover:bg-success/15 hover:text-success"
                >
                    {generatingExcel ? <Loader2 className="size-4 animate-spin"/> : <FileSpreadsheet className="size-4" />}
                    Export Excel
                </Button>

                {/* SINGLE EVENT CALL SHEET PDF */}
                <Button
                    disabled={!selectedEventId || generatingCallSheet}
                    onClick={() => { const e = events.find(ev => ev.id === selectedEventId); if(e) generateCallSheetPDF([e]) }}
                    className="gap-2 bg-navy text-ivory hover:bg-navy/90 font-bold"
                >
                    {generatingCallSheet ? <Loader2 className="size-4 animate-spin text-gold"/> : <FileDown className="size-4 text-gold" />}
                    Call Sheet PDF
                </Button>

                {/* BULK CALL SHEETS EXPORT */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="gap-2 bg-navy text-ivory hover:bg-navy/90 font-bold">
                            <Printer className="size-4 text-gold" /> Bulk Call Sheets <ChevronDown className="size-3 opacity-50"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="surface-elevated rounded-2xl border-navy/10 p-2">
                        <DropdownMenuItem onClick={() => generateCallSheetPDF(events.filter(e => e.category === 'ON STAGE'))}>
                            All ON STAGE Call Sheets
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateCallSheetPDF(events.filter(e => e.category === 'OFF STAGE'))}>
                            All OFF STAGE Call Sheets
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateCallSheetPDF(events)}>
                            All Events Call Sheets
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* JUDGMENT / SCORE SHEET (Single & Bulk) */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2 border-navy/15 text-navy hover:bg-navy/5 font-semibold">
                            {generatingPdf ? <Loader2 className="size-4 animate-spin"/> : <FileText className="size-4"/>}
                            Score Sheets <ChevronDown className="size-3 opacity-50"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="surface-elevated rounded-2xl border-navy/10 p-2">
                        <DropdownMenuItem
                          disabled={!selectedEventId}
                          onClick={() => { const e = events.find(ev => ev.id === selectedEventId); if(e) generateScoreSheetPDF([e]) }}
                        >
                            Single Selected Event Score Sheet
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateScoreSheetPDF(events.filter(e => e.category === 'ON STAGE'))}>
                            All ON STAGE Score Sheets
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateScoreSheetPDF(events.filter(e => e.category === 'OFF STAGE'))}>
                            All OFF STAGE Score Sheets
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                 {/* PARTICIPANTS LIST EXPORT */}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2 border-navy/15 text-navy hover:bg-navy/5 font-semibold">
                            {generatingList ? <Loader2 className="size-4 animate-spin"/> : <Download className="size-4" />}
                            Participants List <ChevronDown className="size-3 opacity-50"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="surface-elevated rounded-2xl border-navy/10 p-2">
                        <DropdownMenuItem onClick={() => generateParticipantListPDF('ON STAGE')}>
                            ON STAGE List
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateParticipantListPDF('OFF STAGE')}>
                            OFF STAGE List
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto bg-ivory">
            {!selectedEventId ? (
                <div className="flex h-full flex-col items-center justify-center text-slatebrand">
                    <div className="mb-4 rounded-3xl bg-navy/6 p-6"><FileText className="size-10" /></div>
                    <p className="font-bold text-navy">Select an event above to mark participation.</p>
                </div>
            ) : loadingEvent ? (
                <div className="flex h-full items-center justify-center"><Loader2 className="size-8 animate-spin text-gold" /></div>
            ) : (
                <Table>
                    <TableHeader className="sticky top-0 z-20 border-b border-navy/10 bg-mist shadow-sm">
                        <TableRow className="border-navy/10">
                            <TableHead className="w-24 font-black text-slatebrand">Photo</TableHead>
                            <TableHead className="w-24 font-black text-slatebrand">Chest No</TableHead>
                            <TableHead className="font-black text-slatebrand">Student Name</TableHead>
                            <TableHead className="hidden font-black text-slatebrand md:table-cell">Class</TableHead>
                            <TableHead className="font-black text-slatebrand">Team</TableHead>
                            <TableHead className="w-[180px] pr-6 text-right font-black text-slatebrand">Participation</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {participants.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="py-16 text-center text-sm font-bold text-slatebrand">No participants found.</TableCell></TableRow>
                        ) : (
                            participants.map((p, idx) => (
                                <TableRow key={p.id} className="border-navy/8 transition-colors hover:bg-gold/6">
                                    <TableCell className="bg-navy/4">
                                        <StudentPhoto imageLink={p.students.image_link} name={p.students.name} className="size-16" />
                                    </TableCell>
                                    <TableCell className="border-r border-navy/10 bg-navy/4 font-mono text-base font-black text-navy">{p.students.chest_no}</TableCell>
                                    <TableCell>
                                        <div className="font-bold text-navy">{p.students.name}</div>
                                        <div className="text-xs font-semibold text-slatebrand">{p.students.section}</div>
                                    </TableCell>
                                    <TableCell className="hidden font-semibold text-slatebrand md:table-cell">{p.students.class_grade}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="size-2.5 rounded-full" style={{ backgroundColor: p.students.team.color_hex }}></div>
                                            <span className="text-sm font-bold text-navy">{p.students.team.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <Select
                                            defaultValue={p.attendance_status || 'pending'}
                                            onValueChange={(val) => updateAttendance(p.id, val)}
                                        >
                                            <SelectTrigger
                                                className={cn(
                                                    "ml-auto h-9 w-40 rounded-2xl border transition-colors focus:ring-0",
                                                    p.attendance_status === 'present' ? "border-success/20 bg-success/10 font-bold text-success" :
                                                    p.attendance_status === 'absent' ? "border-destructive/20 bg-destructive/10 font-bold text-destructive" :
                                                    "border-navy/10 bg-ivory text-slatebrand"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {p.attendance_status === 'present' && <UserCheck className="size-3.5"/>}
                                                    {p.attendance_status === 'absent' && <UserX className="size-3.5"/>}
                                                    {(p.attendance_status === 'pending' || !p.attendance_status) && <Clock className="size-3.5"/>}
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent align="end" className="surface-elevated rounded-2xl border-navy/10">
                                                <SelectItem value="pending" className="text-slate-500">
                                                    <div className="flex items-center gap-2"><Clock className="w-4 h-4"/> Pending</div>
                                                </SelectItem>
                                                <SelectItem value="present" className="text-green-600 font-medium">
                                                    <div className="flex items-center gap-2"><UserCheck className="w-4 h-4"/> Present</div>
                                                </SelectItem>
                                                <SelectItem value="absent" className="text-red-600 font-medium">
                                                    <div className="flex items-center gap-2"><UserX className="w-4 h-4"/> Absent</div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            )}
        </div>
    </div>
  )
}
