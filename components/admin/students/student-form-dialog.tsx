"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, AlertCircle } from "lucide-react"

interface Team { id: string; name: string }
interface Student {
  id: string
  name: string
  chest_no: string | null
  class_grade: string | null
  section: string
  team_id: string
}

interface StudentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student | null
  teams: Team[]
  onSuccess: () => void
}

const CLASSES = ['FOUNDATION', 'TH-1', 'TH-2', 'AL-1', 'AL-2', 'AL-3', 'AL-4']
const SECTIONS = ['Senior', 'Junior', 'Sub-Junior']

export function StudentFormDialog({ open, onOpenChange, student, teams, onSuccess }: StudentFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    chest_no: "",
    class_grade: "FOUNDATION",
    section: "Senior",
    team_id: ""
  })

  // Load data on edit
  useEffect(() => {
    if (student && open) {
      setFormData({
        name: student.name,
        chest_no: student.chest_no || "",
        class_grade: student.class_grade || "FOUNDATION",
        section: student.section,
        team_id: student.team_id
      })
    } else if (!student && open) {
      // Reset for add mode
      setFormData({
        name: "",
        chest_no: "",
        class_grade: "FOUNDATION",
        section: "Senior",
        team_id: ""
      })
    }
    setError(null)
  }, [student, open])

  const supabase = createClient()

  const handleSubmit = async () => {
    setError(null)
    if (!formData.name || !formData.chest_no || !formData.team_id) {
      setError("Please fill all required fields.")
      return
    }

    setLoading(true)
    try {
      // 1. Check Chest No Uniqueness
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('chest_no', formData.chest_no)
        .neq('id', student?.id || '00000000-0000-0000-0000-000000000000') // Exclude self
        .maybeSingle()

      if (existing) {
        throw new Error(`Chest No ${formData.chest_no} is already taken.`)
      }

      // 2. Perform Insert/Update
      if (student) {
        // Update - FIX: Cast to 'any' to avoid type 'never' error
        const { error: updateError } = await (supabase.from('students') as any)
          .update({
            name: formData.name,
            chest_no: formData.chest_no,
            class_grade: formData.class_grade,
            section: formData.section,
            team_id: formData.team_id
          })
          .eq('id', student.id)
        if (updateError) throw updateError
      } else {
        // Insert
        const { error: insertError } = await (supabase.from('students') as any).insert({
          name: formData.name,
          chest_no: formData.chest_no,
          class_grade: formData.class_grade,
          section: formData.section,
          team_id: formData.team_id
        })
        if (insertError) throw insertError
      }

      onSuccess()
      onOpenChange(false)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2rem] border-navy/10 bg-ivory sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-title text-xl text-navy">{student ? "Edit Student" : "Add New Student"}</DialogTitle>
          <DialogDescription className="font-medium text-slatebrand">
            {student ? "Update student details below." : "Enter details for the new participant."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-bold text-destructive">
              <AlertCircle className="size-4" /> {error}
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-xs font-black uppercase tracking-[0.12em] text-slatebrand">Name <span className="text-destructive">*</span></Label>
            <Input
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-xs font-black uppercase tracking-[0.12em] text-slatebrand">Chest No <span className="text-destructive">*</span></Label>
            <Input
              value={formData.chest_no}
              onChange={e => setFormData({...formData, chest_no: e.target.value})}
              className="col-span-3"
              placeholder="Ex: 101"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-xs font-black uppercase tracking-[0.12em] text-slatebrand">Section</Label>
            <div className="col-span-3">
              <Select
                value={formData.section}
                onValueChange={v => setFormData({...formData, section: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="surface-elevated rounded-2xl border-navy/10">
                  {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-xs font-black uppercase tracking-[0.12em] text-slatebrand">Class</Label>
            <div className="col-span-3">
              <Select
                value={formData.class_grade}
                onValueChange={v => setFormData({...formData, class_grade: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="surface-elevated rounded-2xl border-navy/10">
                  {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-xs font-black uppercase tracking-[0.12em] text-slatebrand">Team <span className="text-destructive">*</span></Label>
            <div className="col-span-3">
              <Select
                value={formData.team_id}
                onValueChange={v => setFormData({...formData, team_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Team" />
                </SelectTrigger>
                <SelectContent className="surface-elevated rounded-2xl border-navy/10">
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {student ? "Save Changes" : "Add Student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
