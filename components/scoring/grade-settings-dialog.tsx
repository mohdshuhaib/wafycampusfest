"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save } from "lucide-react"

interface GradeSetting {
  id: string
  grade_type: 'A' | 'B' | 'C'
  first_place: number
  second_place: number
  third_place: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function GradeSettingsDialog({ open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<GradeSetting[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (open) loadSettings()
  }, [open])

  async function loadSettings() {
    setLoading(true)
    const { data } = await supabase.from('grade_settings').select('*').order('grade_type')
    if (data) setSettings(data as GradeSetting[])
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const setting of settings) {
        // FIX: Cast to 'any' to bypass strict TypeScript checking on update object
        await (supabase.from('grade_settings') as any)
          .update({
            first_place: setting.first_place,
            second_place: setting.second_place,
            third_place: setting.third_place
          })
          .eq('id', setting.id)
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert("Failed to update settings")
    } finally {
      setSaving(false)
    }
  }

  const updateVal = (index: number, field: keyof GradeSetting, val: string) => {
    const newSettings = [...settings]
    // @ts-ignore
    newSettings[index][field] = parseInt(val) || 0
    setSettings(newSettings)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2rem] border-navy/10 bg-ivory sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-title text-xl text-navy">Scoring Configuration</DialogTitle>
          <DialogDescription className="font-medium text-slatebrand">Adjust points awarded for each grade type.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-gold" /></div>
        ) : (
          <div className="grid gap-6 py-4">
            {settings.map((setting, idx) => (
              <div key={setting.id} className="grid grid-cols-4 items-center gap-4 border-b border-navy/10 pb-4 last:border-0 last:pb-0">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-lg font-black text-gold">
                  {setting.grade_type}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-[0.12em] text-slatebrand">First</Label>
                  <Input
                    type="number"
                    value={setting.first_place}
                    onChange={(e) => updateVal(idx, 'first_place', e.target.value)}
                    className="h-10 rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-[0.12em] text-slatebrand">Second</Label>
                  <Input
                    type="number"
                    value={setting.second_place}
                    onChange={(e) => updateVal(idx, 'second_place', e.target.value)}
                    className="h-10 rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-[0.12em] text-slatebrand">Third</Label>
                  <Input
                    type="number"
                    value={setting.third_place}
                    onChange={(e) => updateVal(idx, 'third_place', e.target.value)}
                    className="h-10 rounded-2xl"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Points
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
