"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Palette, Save } from "lucide-react"

interface Team {
  id: string
  name: string
  slug: string
  color_hex: string
}

interface TeamEditDialogProps {
  team: Team | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function TeamEditDialog({ team, open, onOpenChange, onSuccess }: TeamEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    color_hex: "#0A1D2C"
  })

  useEffect(() => {
    if (!team || !open) return
    setFormData({
      name: team.name,
      slug: team.slug,
      color_hex: team.color_hex
    })
  }, [team, open])

  const supabase = createClient()

  const handleSave = async () => {
    if (!team) return
    try {
      setLoading(true)

      const { error } = await (supabase.from('teams') as any)
        .update({
          name: formData.name,
          slug: formData.slug,
          color_hex: formData.color_hex
        })
        .eq('id', team.id)

      if (error) throw error

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert("Failed to update team")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl text-ivory shadow-premium" style={{ backgroundColor: formData.color_hex }}>
              <Palette className="size-5" />
            </div>
            <div>
              <DialogTitle>Edit team identity</DialogTitle>
              <DialogDescription>Update the public team label, slug, and color system.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-5 py-3">
          <div className="space-y-2">
            <Label htmlFor="team-name" className="text-xs font-bold uppercase tracking-[0.12em] text-slatebrand">Name</Label>
            <Input
              id="team-name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-slug" className="text-xs font-bold uppercase tracking-[0.12em] text-slatebrand">Slug</Label>
            <Input
              id="team-slug"
              value={formData.slug}
              onChange={(e) => setFormData({...formData, slug: e.target.value})}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-color" className="text-xs font-bold uppercase tracking-[0.12em] text-slatebrand">Color</Label>
            <div className="flex gap-3">
              <Input
                id="team-color"
                type="color"
                className="h-11 w-14 shrink-0 p-1"
                value={formData.color_hex}
                onChange={(e) => setFormData({...formData, color_hex: e.target.value})}
              />
              <Input
                value={formData.color_hex}
                onChange={(e) => setFormData({...formData, color_hex: e.target.value})}
                placeholder="#0A1D2C"
                className="font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
