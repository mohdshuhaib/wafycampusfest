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
      // Update each team's penalty points cleanly
      for (const team of teams) {
        const newPenalty = penalties[team.id] ?? 0
        const { error } = await (supabase.from('teams') as any)
          .update({ penalty_points: newPenalty })
          .eq('id', team.id)

        if (error) throw error
      }

      toast.success("Team minus marks updated successfully")
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
          <DialogTitle className="flex items-center gap-2 text-title text-xl text-rose-600">
            <AlertTriangle className="size-5" /> Manage Team Minus Marks (Penalties)
          </DialogTitle>
          <DialogDescription className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 pt-3 text-xs font-semibold text-rose-700">
            <strong>Deduction Notice:</strong> Enter negative/penalty marks for teams (e.g. discipline issues, late reporting).
            These minus marks are automatically deducted from each team's overall score across the championship.
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
                    className="h-10 w-2 rounded-full shadow-xs"
                    style={{ backgroundColor: team.color_hex }}
                  />
                  <div>
                    <Label htmlFor={`penalty-${team.id}`} className="cursor-pointer font-bold text-navy text-sm">
                      {team.name}
                    </Label>
                    <div className="text-[10px] font-medium text-slatebrand">
                      Current deduction: <span className="font-bold text-rose-600">-{penalties[team.id] || 0} pts</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-rose-600">-</span>
                  <Input
                    id={`penalty-${team.id}`}
                    type="number"
                    min="0"
                    value={penalties[team.id] ?? 0}
                    onChange={(e) =>
                      setPenalties({
                        ...penalties,
                        [team.id]: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-20 rounded-xl text-right font-mono font-bold text-rose-700 border-rose-300 focus:border-rose-500"
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setPenalties({
                          ...penalties,
                          [team.id]: (penalties[team.id] || 0) + 1,
                        })
                      }
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors"
                      title="Add 1 minus mark"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPenalties({
                          ...penalties,
                          [team.id]: Math.max(0, (penalties[team.id] || 0) - 1),
                        })
                      }
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Reduce 1 minus mark"
                    >
                      -1
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Save Deductions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
