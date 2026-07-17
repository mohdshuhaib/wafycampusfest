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

interface Team { id: string; name: string }

interface CsvUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teams: Team[]
  onSuccess: () => void
}

export function CsvUploadDialog({ open, onOpenChange, teams, onSuccess }: CsvUploadDialogProps) {
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

    // Valid headers check
    const required = ['name', 'chest_no', 'class', 'team_name']
    const missing = required.filter(r => !headers.includes(r))

    if (missing.length > 0) {
      throw new Error(`Invalid CSV Headers. Missing: ${missing.join(', ')}`)
    }

    const rows = lines.slice(1)
    const parsedData = []

    for (let i = 0; i < rows.length; i++) {
      // Handle commas inside quotes roughly or strictly split by comma
      // For simple CSVs, standard split is okay. For robustness, use a library,
      // but here is a simple regex split for basic CSV
      const cols = rows[i].split(',').map(c => c.trim())

      if (cols.length < required.length) continue;

      const rowData: any = {}
      headers.forEach((h, index) => rowData[h] = cols[index]?.replace(/^"|"$/g, '')) // Remove quotes

      // Find Team ID
      const team = teams.find(t => t.name.toLowerCase() === rowData['team_name'].toLowerCase())
      if (!team) {
        throw new Error(`Row ${i + 2}: Team '${rowData['team_name']}' not found in database.`)
      }

      parsedData.push({
        name: rowData['name'],
        chest_no: rowData['chest_no'],
        class_grade: rowData['class'],
        section: "Senior",
        team_id: team.id
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
      const studentData = parseCSV(text)

      if (studentData.length === 0) {
        throw new Error("CSV file is empty or formatted incorrectly.")
      }

      // Check for Chest No Duplicates within CSV
      const chestNos = studentData.map(s => s.chest_no)
      const uniqueChestNos = new Set(chestNos)
      if (chestNos.length !== uniqueChestNos.size) {
        throw new Error("Duplicate Chest Numbers found inside the CSV file.")
      }

      // Insert into DB
      // We use upsert or insert. Insert will fail if chest_no exists due to unique constraints (if any)
      const { error: insertError } = await (supabase.from('students') as any).insert(studentData)

      if (insertError) {
        if (insertError.code === '23505') throw new Error("Some Chest Numbers already exist in the database.")
        throw insertError
      }

      setSuccess(`Successfully added ${studentData.length} students.`)
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
          <DialogTitle className="text-title text-xl text-navy">Import Students via CSV</DialogTitle>
          <DialogDescription className="font-medium text-slatebrand">
            Upload a CSV file to add students in bulk.
            <a href="/template_students.xlsx" download className="ml-1 font-bold text-navy hover:text-gold">
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
              id="csv-upload"
              onChange={handleFileChange}
            />
            <label htmlFor="csv-upload" className="flex cursor-pointer flex-col items-center gap-2">
              <UploadCloud className="size-10 text-slatebrand" />
              <span className="text-sm font-bold text-slatebrand">
                {file ? file.name : "Click to select CSV file"}
              </span>
            </label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Upload Failed</AlertTitle>
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
            <strong>Required Headers:</strong> name, chest_no, class, team_name. Section is always Senior.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileText className="mr-2 size-4" />}
            Upload & Process
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
