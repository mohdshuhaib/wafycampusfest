"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, UploadCloud, AlertTriangle, FileText, CheckCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface CsvUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EventsCsvUpload({ open, onOpenChange, onSuccess }: CsvUploadDialogProps) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
      setSuccess(null)
    }
  }

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    // Required headers
    const required = ['name', 'event_code', 'category', 'limit', 'grade']
    const missing = required.filter(r => !headers.includes(r))

    if (missing.length > 0) {
      throw new Error(`Missing headers: ${missing.join(', ')}`)
    }

    const rows = lines.slice(1)
    const parsedData = []

    for (let i = 0; i < rows.length; i++) {
      // Basic CSV split - assumes no commas in values
      const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))

      if (cols.length < required.length) continue;

      const rowData: any = {}
      headers.forEach((h, index) => rowData[h] = cols[index])

      // Validation
      const category = rowData['category'].toUpperCase()
      if (!['ON STAGE', 'OFF STAGE', 'GENERAL', 'SPECIAL'].includes(category)) {
         throw new Error(`Row ${i+2}: Invalid category '${rowData['category']}'. Must be ON STAGE, OFF STAGE, GENERAL, or SPECIAL.`)
      }
      const grade = category === 'GENERAL' ? 'C' : category === 'SPECIAL' ? 'D' : (rowData['grade']?.toUpperCase() || 'A')
      if (!['A', 'B', 'C', 'D'].includes(grade)) {
         throw new Error(`Row ${i+2}: Invalid grade '${rowData['grade']}'. Must be A, B, C, or D.`)
      }
      const duration = rowData['duration_minutes'] || rowData['duration'] || ''
      const durationMinutes = duration ? parseInt(duration, 10) : null
      if (duration && (!durationMinutes || durationMinutes < 1)) {
         throw new Error(`Row ${i+2}: Invalid duration '${duration}'. Use minutes as a positive number or leave blank.`)
      }

      parsedData.push({
        name: rowData['name'],
        event_code: rowData['event_code'],
        category,
        max_participants_per_team: category === 'SPECIAL' ? 1 : parseInt(rowData['limit']) || 1,
        grade_type: grade,
        duration_minutes: durationMinutes,
        applicable_section: ["Senior"],
        description: rowData['description'] || ''
      })
    }

    return parsedData
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const text = await file.text()
      const eventData = parseCSV(text)

      if (eventData.length === 0) {
        throw new Error("File is empty or invalid.")
      }

      // Bulk Insert
      const { error: insertError } = await (supabase.from('events') as any).insert(eventData)

      if (insertError) {
        if (insertError.code === '23505') throw new Error("Duplicate Event Codes found. Please check your data.")
        throw insertError
      }

      setSuccess(`Successfully added ${eventData.length} events.`)
      setTimeout(() => {
        onSuccess()
        onOpenChange(false)
        setFile(null)
        setSuccess(null)
      }, 2000)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2rem] border-navy/10 bg-ivory sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-title text-xl text-navy">Import Events via CSV</DialogTitle>
          <DialogDescription className="font-medium text-slatebrand">
            <a href="/template_events.xlsx" download className="font-bold text-navy hover:text-gold">
              Download Template
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="rounded-3xl border-2 border-dashed border-navy/15 bg-mist/60 p-8 text-center transition-colors hover:border-gold/40 hover:bg-gold/10">
            <Input
              type="file"
              accept=".csv"
              className="hidden"
              id="event-csv-upload"
              onChange={handleFileChange}
            />
            <label htmlFor="event-csv-upload" className="flex cursor-pointer flex-col items-center gap-2">
              <UploadCloud className="size-10 text-slatebrand" />
              <span className="text-sm font-bold text-slatebrand">
                {file ? file.name : "Click to select CSV"}
              </span>
            </label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-success/20 bg-success/10 text-success">
              <CheckCircle className="size-4 text-success" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-2xl border border-navy/10 bg-mist p-3 text-xs font-semibold text-slatebrand">
            <strong>Headers:</strong> name, event_code, category, limit, grade, description. Section is always Senior.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileText className="mr-2 size-4" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
