"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Save, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface Team {
  id: string
  name: string
  slug: string
  color_hex: string
  penalty_points: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function PenaltySettingsDialog({ open, onOpenChange, onSuccess }: Props) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [penalties, setPenalties] = useState<Record<string, number>>({})

  const supabase = createClient()

  useEffect(() => {
    if (open) {
      fetchTeams()
    }
  }, [open])

  const fetchTeams = async () => {
    setLoading(true)
    const { data } = await supabase.from('teams').select('*').order('name')
    if (data) {
      setTeams(data)
      const initialPenalties: Record<string, number> = {}
      data.forEach((t: any) => {
        initialPenalties[t.id] = t.penalty_points || 0
      })
      setPenalties(initialPenalties)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Map over existing teams to include all required fields (name, slug, etc.)
      // This prevents "not-null constraint" errors during upsert
      const updates = teams.map((team) => ({
        id: team.id,
        name: team.name,
        slug: team.slug, // Required field
        color_hex: team.color_hex, // Required field
        penalty_points: penalties[team.id] ?? 0,
      }))

      // Cast to any to avoid strict type errors with new column
      const { error } = await (supabase.from('teams') as any).upsert(updates)

      if (error) throw error

      toast.success("Penalties updated successfully")
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to update penalties: " + (err.message || "Unknown error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[2rem] border-navy/10 bg-ivory">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-title text-xl text-destructive">
            <AlertTriangle className="size-5" /> Manage Team Penalties
          </DialogTitle>
          <DialogDescription className="rounded-2xl border border-destructive/15 bg-destructive/10 p-3 pt-3 text-xs font-semibold text-destructive">
            <strong>Note:</strong> Minus marks should be assigned based on reports from the
            "Manage Teams" page (e.g., disciplinary issues, late reporting).
            These points will be subtracted from the total score.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto py-4 pr-1">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-gold" />
            </div>
          ) : (
            teams.map((team) => (
              <div key={team.id} className="flex items-center justify-between gap-4 rounded-2xl border border-navy/10 bg-mist/50 p-3 transition-colors hover:bg-gold/10">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-1.5 rounded-full"
                    style={{ backgroundColor: team.color_hex }}
                  />
                  <Label htmlFor={`penalty-${team.id}`} className="cursor-pointer font-bold text-navy">
                    {team.name}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-destructive">-</span>
                  <Input
                    id={`penalty-${team.id}`}
                    type="number"
                    min="0"
                    value={penalties[team.id] || 0}
                    onChange={(e) =>
                      setPenalties({
                        ...penalties,
                        [team.id]: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-20 rounded-2xl text-right font-mono"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading} variant="destructive">
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Save Deductions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
