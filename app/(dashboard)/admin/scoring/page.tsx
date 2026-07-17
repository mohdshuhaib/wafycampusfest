"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { EventScorer } from "@/components/scoring/event-scorer"
import { GradeSettingsDialog } from "@/components/scoring/grade-settings-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, BarChart3, Download, ChevronDown, Loader2, FileSpreadsheet, Trophy, Sparkles, Medal, SlidersHorizontal } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const SECTIONS = [
  { id: 'SENIOR_ON', label: 'Senior On-Stage', section: 'Senior', cat: 'ON STAGE' },
  { id: 'SENIOR_OFF', label: 'Senior Off-Stage', section: 'Senior', cat: 'OFF STAGE' },
  { id: 'JUNIOR_ON', label: 'Junior On-Stage', section: 'Junior', cat: 'ON STAGE' },
  { id: 'JUNIOR_OFF', label: 'Junior Off-Stage', section: 'Junior', cat: 'OFF STAGE' },
  { id: 'SUB_ON', label: 'Sub-Jr On-Stage', section: 'Sub-Junior', cat: 'ON STAGE' },
  { id: 'SUB_OFF', label: 'Sub-Jr Off-Stage', section: 'Sub-Junior', cat: 'OFF STAGE' },
  { id: 'GENERAL_ON', label: 'General On-Stage', section: 'General', cat: 'ON STAGE' },
  { id: 'GENERAL_OFF', label: 'General Off-Stage', section: 'General', cat: 'OFF STAGE' },
  { id: 'FOUNDATION_ON', label: 'Foundation On-Stage', section: 'Foundation', cat: 'ON STAGE' },
  { id: 'FOUNDATION_OFF', label: 'Foundation Off-Stage', section: 'Foundation', cat: 'OFF STAGE' },
]

const EXPORT_CATEGORIES = [
  { label: 'Senior', value: 'Senior' },
  { label: 'Junior', value: 'Junior' },
  { label: 'Sub-Junior', value: 'Sub-Junior' },
  { label: 'General', value: 'General' },
  { label: 'Foundation', value: 'Foundation' },
]

const PERFORMANCE_CATEGORIES = [
  { label: 'Senior', value: 'Senior' },
  { label: 'Junior', value: 'Junior' },
  { label: 'Sub-Junior', value: 'Sub-Junior' },
]

export default function ScoringPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(SECTIONS[0].id)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const supabase = createClient()

  // Load XLSX Script for Excel Generation
  useEffect(() => {
    const loadScript = (src: string) => {
        if (document.querySelector(`script[src="${src}"]`)) return;
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        document.body.appendChild(script);
    };
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
  }, []);

  const handleScoreUpdate = () => {
    // Optional: Refresh logic if needed
  }

  // --- GENERATE RESULTS PDF ---
  const generateResultsPDF = async (sectionLabel: string, sectionValue: string) => {
      setDownloadingPdf(true)
      try {
          // 1. Fetch Events for Section
          const { data: events, error: eventsError } = await supabase
              .from('events')
              .select('id, name, event_code, grade_type')
              .contains('applicable_section', [sectionValue])
              .order('name');

          if (eventsError) throw eventsError;
          if (!events || events.length === 0) {
              alert(`No events found for ${sectionLabel} section.`);
              setDownloadingPdf(false);
              return;
          }

          // 2. Fetch Results (First, Second, Third)
          const typedEvents = events as Array<{ id: string; name: string; event_code: string; grade_type: string }>;
          const eventIds = typedEvents.map((e) => e.id);
          const { data: results, error: resultsError } = await supabase
              .from('participations')
              .select(`
                  event_id,
                  result_position,
                  student:students ( name, chest_no ),
                  team:teams ( name )
              `)
              .in('event_id', eventIds)
              .not('result_position', 'is', null);

          if (resultsError) throw resultsError;

          // 3. Generate PDF
          const doc = new jsPDF();

          // Title
          doc.setFontSize(18);
          doc.setFont("helvetica", "bold");
          doc.text(`${sectionLabel.toUpperCase()} SECTION - FINAL RESULTS`, 105, 20, { align: "center" });
          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");
          doc.text("PMSA ARTS FEST 2025-26", 105, 28, { align: "center" });

          const tableBody: any[] = [];

          typedEvents.forEach((event) => {
              const eventResults = (results as Array<{ event_id: string; result_position: string; student: { name: string; chest_no: string }; team: { name: string } }>)?.filter(r => r.event_id === event.id) || [];
              const isTeamEvent = (event as any).grade_type === 'C'; // Category C = Group Item

              const getWinners = (pos: string) => {
                  // Filter for ALL winners in this position (handles ties)
                  const winners = eventResults.filter(r => r.result_position === pos);

                  if (winners.length === 0) return "-";

                  // Map each winner to a string and join them with newlines
                  return winners.map(w => {
                      if (isTeamEvent) {
                          // Show Team Name for Category C
                          return w.team?.name || "Unknown Team";
                      } else {
                          // Show Participant Name, Chest No AND Team Name for others
                          return `${w.student?.name || "Unknown"} (${w.student?.chest_no || "N/A"}) - ${w.team?.name || ""}`;
                      }
                  }).join("\n");
              };

              tableBody.push([
                  event.name, // Event Name
                  getWinners('FIRST'),
                  getWinners('SECOND'),
                  getWinners('THIRD')
              ]);
          });

          autoTable(doc, {
              startY: 35,
              head: [["Event Name", "First", "Second", "Third"]],
              body: tableBody,
              theme: 'grid',
              headStyles: {
                  fillColor: [40, 40, 40],
                  halign: 'center',
                  valign: 'middle'
              },
              bodyStyles: {
                  valign: 'middle'
              },
              styles: { fontSize: 10, cellPadding: 3 },
              columnStyles: {
                  0: { fontStyle: 'bold', cellWidth: 50 }, // Event Name column width
                  1: { cellWidth: 'auto' },
                  2: { cellWidth: 'auto' },
                  3: { cellWidth: 'auto' }
              }
          });

          doc.save(`${sectionLabel}_Results.pdf`);

      } catch (err) {
          console.error("PDF Generation Error:", err);
          alert("Failed to generate PDF. Please try again.");
      } finally {
          setDownloadingPdf(false);
      }
  }

  // --- GENERATE PERFORMANCE REPORT (FIRST PRIZES ONLY) ---
  const generatePerformanceReport = async (category: string) => {
      setDownloadingPdf(true)
      try {
          // 1. Fetch only FIRST positions for students in this section
          const { data: participations, error } = await supabase
              .from('participations')
              .select(`
                  result_position,
                  performance_grade,
                  events ( name ),
                  students!inner ( name, chest_no, section )
              `)
              .eq('students.section', category)
              .eq('result_position', 'FIRST'); // Strict Filter: Only First

          if (error) throw error;
          if (!participations || participations.length === 0) {
              alert(`No First Prize winners found for ${category}.`);
              setDownloadingPdf(false);
              return;
          }

          // 2. Group by Student
          const studentMap: Record<string, any[]> = {};
          participations.forEach((p: any) => {
              const key = `${p.students.name} (${p.students.chest_no})`;
              if (!studentMap[key]) studentMap[key] = [];
              studentMap[key].push(p);
          });

          // 3. Generate PDF
          const doc = new jsPDF();
          doc.setFontSize(18);
          doc.setFont("helvetica", "bold");
          doc.text(`${category.toUpperCase()} - FIRST PRIZE WINNERS`, 105, 20, { align: "center" });
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text("PMSA ARTS FEST 2025-26", 105, 28, { align: "center" });

          const tableRows: any[] = [];

          // Sort students alphabetically
          Object.keys(studentMap).sort().forEach((studentKey) => {
              const results = studentMap[studentKey];

              // Sort events alphabetically if needed, or by grade
              results.forEach((r, index) => {
                  tableRows.push([
                      index === 0 ? studentKey : "", // Only show name on first row of the student's block
                      r.events?.name || "Unknown Event",
                      r.result_position,
                      r.performance_grade || "-"
                  ]);
              });
          });

          autoTable(doc, {
              startY: 35,
              head: [["Participant", "Event", "Position", "Grade"]],
              body: tableRows,
              theme: 'grid',
              headStyles: { fillColor: [70, 70, 70] }, // Dark header
              columnStyles: {
                  0: { fontStyle: 'bold', cellWidth: 70 }, // Name column
                  1: { cellWidth: 'auto' },
                  2: { cellWidth: 30 },
                  3: { cellWidth: 20, halign: 'center' }
              }
          });

          doc.save(`${category}_First_Prizes_Report.pdf`);

      } catch (err) {
          console.error("Report Generation Error:", err);
          alert("Failed to generate report.");
      } finally {
          setDownloadingPdf(false);
      }
  }

  // --- GENERATE RESULTS EXCEL ---
  const generateResultsExcel = async () => {
      // @ts-ignore
      if (!window.XLSX) { alert("Excel library loading... Please try again."); return; }

      setDownloadingExcel(true);
      try {
          // @ts-ignore
          const wb = window.XLSX.utils.book_new();

          type EventType = { id: string; name: string; grade_type: string };
          type ResultType = {
            event_id: string;
            result_position: string;
            performance_grade: string;
            student: { name: string; chest_no: string } | null;
            team: { name: string } | null;
          };

          for (const category of EXPORT_CATEGORIES) {
              // 1. Fetch Events
              const { data: events } = await supabase
                  .from('events')
                  .select('id, name, grade_type')
                  .contains('applicable_section', [category.value])
                  .order('name');

              if (!events || events.length === 0) continue;

              const typedEvents = events as EventType[];
              const eventIds = typedEvents.map(e => e.id);

              // 2. Fetch Results
              const { data: results } = await supabase
                  .from('participations')
                  .select(`
                      event_id,
                      result_position,
                      performance_grade,
                      student:students ( name, chest_no ),
                      team:teams ( name )
                  `)
                  .in('event_id', eventIds)
                  .not('result_position', 'is', null)
                  .order('event_id');

              const typedResults = (results || []) as ResultType[];

              // 3. Format Data Rows
              const sheetRows: any[] = [];

              // Header Row
              sheetRows.push(["Event Name", "Participant", "Position", "Grade"]);

              typedEvents.forEach(event => {
                  const eventResults = typedResults.filter(r => r.event_id === event.id) || [];
                  const isTeamEvent = event.grade_type === 'C';

                  // Sort results by position rank
                  const positionRank: Record<string, number> = { 'FIRST': 1, 'SECOND': 2, 'THIRD': 3 };
                  eventResults.sort((a, b) => (positionRank[a.result_position] || 9) - (positionRank[b.result_position] || 9));

                  eventResults.forEach(r => {
                      let participantName = "";
                      if (isTeamEvent) {
                          participantName = r.team?.name || "Unknown Team";
                      } else {
                          participantName = `${r.student?.name || "Unknown"} (${r.student?.chest_no || "N/A"})`;
                      }

                      sheetRows.push([
                          event.name,
                          participantName,
                          r.result_position || "-",
                          r.performance_grade || "-"
                      ]);
                  });

                  // Add empty row between events for readability
                  if(eventResults.length > 0) sheetRows.push(["", "", "", ""]);
              });

              if (sheetRows.length > 1) { // Only add if we have data
                  // @ts-ignore
                  const ws = window.XLSX.utils.aoa_to_sheet(sheetRows);
                  // @ts-ignore
                  window.XLSX.utils.book_append_sheet(wb, ws, category.label);
              }
          }

          // @ts-ignore
          window.XLSX.writeFile(wb, `ArtsFest_Full_Results_${new Date().toISOString().slice(0, 10)}.xlsx`);

      } catch (err) {
          console.error("Excel Generation Error:", err);
          alert("Failed to generate Excel file.");
      } finally {
          setDownloadingExcel(false);
      }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-5 overflow-hidden pb-2">
      <section className="surface-dark relative shrink-0 overflow-hidden rounded-[2rem] p-5 sm:p-6">

        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-gold">
              <Sparkles className="size-3.5" />
              Scoring Studio
            </div>
            <h1 className="text-display mt-4 text-3xl text-ivory sm:text-4xl">Register winners with confidence.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/62">
              Select a section, choose an event, rank winners, apply performance grades, and export official reports.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={downloadingPdf} className="border-gold/25 bg-gold/10 text-gold hover:bg-gold/15">
                  <Medal className="size-4" />
                  <span className="hidden sm:inline">First Winners</span>
                  <ChevronDown className="size-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="surface-elevated z-50 w-52 rounded-2xl border-navy/10 p-2">
                {PERFORMANCE_CATEGORIES.map((cat) => (
                  <DropdownMenuItem key={cat.value} onClick={() => generatePerformanceReport(cat.value)} className="cursor-pointer rounded-xl px-3 py-2 font-semibold text-navy focus:bg-navy/7">
                    {cat.label} Section
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" disabled={downloadingExcel} onClick={generateResultsExcel}>
              {downloadingExcel ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
              <span className="hidden sm:inline">Excel</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={downloadingPdf}>
                  {downloadingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  <span className="hidden sm:inline">PDF</span>
                  <ChevronDown className="size-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="surface-elevated z-50 w-52 rounded-2xl border-navy/10 p-2">
                {EXPORT_CATEGORIES.map((cat) => (
                  <DropdownMenuItem key={cat.value} onClick={() => generateResultsPDF(cat.label, cat.value)} className="cursor-pointer rounded-xl px-3 py-2 font-semibold text-navy focus:bg-navy/7">
                    {cat.label} Section
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="size-4" />
              <span className="hidden sm:inline">Rules</span>
            </Button>
            <Button onClick={() => router.push('/admin/leaderboard')}>
              <BarChart3 className="size-4" />
              Leaderboard
            </Button>
          </div>
        </div>
      </section>

      <div className="surface-elevated flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem]">
           <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">

             <div className="shrink-0 border-b border-navy/10 bg-ivory/60 px-3 pt-3">
                <div className="overflow-x-auto pb-2 scrollbar-none">
                    <TabsList className="h-auto w-max justify-start gap-2 rounded-2xl bg-navy/6 p-1">
                        {SECTIONS.map(sec => (
                            <TabsTrigger
                                key={sec.id}
                                value={sec.id}
                                className="rounded-xl px-4 py-2 text-xs font-bold text-slatebrand transition-all duration-200 hover:bg-navy/7 hover:text-navy data-[state=active]:bg-navy data-[state=active]:text-ivory data-[state=active]:shadow-premium md:text-sm"
                            >
                                <SlidersHorizontal className="mr-2 hidden size-3.5 sm:inline" />
                                {sec.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
             </div>

             <div className="relative flex-1 overflow-y-auto bg-mist/45">
                {SECTIONS.map(sec => (
                    <TabsContent key={sec.id} value={sec.id} className="mt-0 h-full p-2 md:p-4 data-[state=inactive]:hidden">
                        <EventScorer
                            section={sec.section}
                            category={sec.cat}
                            onScoreSaved={handleScoreUpdate}
                        />
                    </TabsContent>
                ))}
             </div>
           </Tabs>
      </div>

      <GradeSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onSuccess={handleScoreUpdate}
      />
    </div>
  )
}
