"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { TeamCard } from "@/components/admin/teams/team-card"
import { TeamEditDialog } from "@/components/admin/teams/team-edit-dialog"
import { TeamDetailsDialog } from "@/components/admin/teams/team-details-dialog"
import { Loader2, Lock, Unlock, Globe, ShieldCheck, Sparkles, Trophy, Users, Gauge, Settings2 } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface Team {
  id: string
  name: string
  slug: string
  color_hex: string
  access_override: boolean | null
}

interface TeamWithCounts extends Team {
  student_count: number
}

interface AppConfig {
  registration_open: boolean
}

function accessLabel(value: boolean | null) {
  if (value === true) return "Open"
  if (value === false) return "Locked"
  return "Global"
}

function accessIcon(value: boolean | null) {
  if (value === true) return Unlock
  if (value === false) return Lock
  return Globe
}

function accessClass(value: boolean | null) {
  if (value === true) return "border-success/25 bg-success/12 text-success"
  if (value === false) return "border-destructive/25 bg-destructive/12 text-destructive"
  return "border-navy/12 bg-ivory/85 text-slatebrand"
}

export default function AdminTeams() {
  const [teams, setTeams] = useState<TeamWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [globalOpen, setGlobalOpen] = useState(false)
  const [updatingGlobal, setUpdatingGlobal] = useState(false)

  const [editingTeam, setEditingTeam] = useState<TeamWithCounts | null>(null)
  const [viewingTeam, setViewingTeam] = useState<TeamWithCounts | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)

  const supabase = createClient()

  const loadData = async () => {
    try {
      const { data: configData } = await supabase.from('app_config').select('registration_open').single()
      const config = configData as unknown as AppConfig
      if (config) setGlobalOpen(config.registration_open)

      const { data: teamsData, error } = await supabase.from('teams').select('*').order('name')
      if (error) throw error

      const teams = teamsData as unknown as Team[]

      const teamsWithCounts = await Promise.all(
        teams.map(async (team) => {
          const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('team_id', team.id)
          return { ...team, student_count: count || 0 }
        })
      )
      setTeams(teamsWithCounts)
    } catch (err) {
      console.error("Error loading data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGlobalToggle = async (checked: boolean) => {
    setUpdatingGlobal(true)
    try {
      const { error } = await (supabase.from('app_config') as any)
        .update({ registration_open: checked })
        .eq('id', 1)

      if (error) throw error
      setGlobalOpen(checked)
    } catch (err) {
      alert("Failed to update global settings")
    } finally {
      setUpdatingGlobal(false)
    }
  }

  const handleTeamOverride = async (teamId: string, newVal: boolean | null) => {
    try {
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, access_override: newVal } : t))

      await (supabase.from('teams') as any)
        .update({ access_override: newVal })
        .eq('id', teamId)
    } catch (err) {
      alert("Failed to update team access")
      loadData()
    }
  }

  const handleEdit = (team: TeamWithCounts) => {
    setEditingTeam(team)
    setIsEditOpen(true)
  }

  const handleView = (team: TeamWithCounts) => {
    setViewingTeam(team)
    setIsViewOpen(true)
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="surface-panel flex items-center gap-3 rounded-3xl px-6 py-5 text-navy">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold">Loading team command board</span>
        </div>
      </div>
    )
  }

  const totalStudents = teams.reduce((sum, team) => sum + team.student_count, 0)
  const forceOpenCount = teams.filter(team => team.access_override === true).length
  const forceLockedCount = teams.filter(team => team.access_override === false).length

  return (
    <div className="space-y-6 pb-10">
      <section className="grid gap-5 xl:grid-cols-[1fr_26rem]">
        <div className="surface-dark relative overflow-hidden rounded-[2rem] p-6 sm:p-7">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-gold">
              <Sparkles className="size-3.5" />
              Team Control
            </div>
            <h1 className="text-display mt-5 text-4xl text-ivory sm:text-5xl">Manage every house.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-ivory/62 sm:text-base">
              Control registration access, inspect rosters, update identities, and monitor team strength from one board.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
                <div className="text-title text-2xl text-ivory">{teams.length}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Teams</div>
              </div>
              <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
                <div className="text-title text-2xl text-ivory">{totalStudents}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Students</div>
              </div>
              <div className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4">
                <div className="text-title text-2xl text-ivory">{forceOpenCount}/{forceLockedCount}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/45">Overrides</div>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-elevated gold-rule rounded-[2rem] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow">Registration Status</div>
              <h2 className="text-title mt-3 text-3xl text-navy">{globalOpen ? "Global Open" : "Global Locked"}</h2>
              <p className="mt-3 text-sm leading-6 text-slatebrand">
                Teams set to global follow this main switch. Overrides can force individual team access.
              </p>
            </div>
            <div className={`grid size-12 place-items-center rounded-2xl ${globalOpen ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive"}`}>
              {globalOpen ? <ShieldCheck className="size-5" /> : <Lock className="size-5" />}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-navy/10 bg-ivory/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold text-navy">Main registration gate</div>
              <div className={`mt-1 text-[11px] font-black uppercase tracking-[0.14em] ${globalOpen ? "text-success" : "text-destructive"}`}>
                {globalOpen ? "Accepting registrations" : "Registration closed"}
              </div>
            </div>
            <Button
              type="button"
              onClick={() => handleGlobalToggle(!globalOpen)}
              disabled={updatingGlobal}
              className={`h-11 min-w-36 rounded-2xl font-black shadow-none ${
                globalOpen
                  ? "bg-success text-ivory hover:bg-success/90"
                  : "bg-destructive text-ivory hover:bg-destructive/90"
              }`}
            >
              {updatingGlobal ? (
                <Loader2 className="size-4 animate-spin" />
              ) : globalOpen ? (
                <Unlock className="size-4" />
              ) : (
                <Lock className="size-4" />
              )}
              {globalOpen ? "Unlocked" : "Locked"}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <Users className="size-4 text-gold" />
            Total members
          </div>
          <div className="text-title text-3xl text-navy">{totalStudents}</div>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <Unlock className="size-4 text-gold" />
            Force open
          </div>
          <div className="text-title text-3xl text-navy">{forceOpenCount}</div>
        </div>
        <div className="surface-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <Gauge className="size-4 text-gold" />
            Using global
          </div>
          <div className="text-title text-3xl text-navy">{teams.filter(team => team.access_override === null).length}</div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {teams.map((team) => {
          const AccessIcon = accessIcon(team.access_override)

          return (
            <div key={team.id} className="relative">
              <TeamCard team={team} onEdit={handleEdit} onView={handleView} />

              <div className="absolute right-4 top-4 z-30">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-9 gap-1.5 rounded-full px-3 shadow-premium ${accessClass(team.access_override)}`}
                    >
                      <AccessIcon className="size-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-[0.12em]">{accessLabel(team.access_override)}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="surface-elevated z-50 w-56 rounded-2xl border-navy/10 p-2">
                    <DropdownMenuLabel className="eyebrow px-2 py-2">Access Rule</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => handleTeamOverride(team.id, null)} className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 focus:bg-navy/7">
                      <Globe className="mt-0.5 size-4 text-slatebrand" />
                      <div>
                        <div className="text-sm font-bold text-navy">Use Global</div>
                        <div className="text-xs text-slatebrand">Follow main switch</div>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => handleTeamOverride(team.id, true)} className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 focus:bg-success/10">
                      <Unlock className="mt-0.5 size-4 text-success" />
                      <div>
                        <div className="text-sm font-bold text-success">Force Unlock</div>
                        <div className="text-xs text-slatebrand">Always allow access</div>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => handleTeamOverride(team.id, false)} className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 focus:bg-destructive/10">
                      <Lock className="mt-0.5 size-4 text-destructive" />
                      <div>
                        <div className="text-sm font-bold text-destructive">Force Lock</div>
                        <div className="text-xs text-slatebrand">Always block access</div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </section>

      {teams.length === 0 && (
        <div className="surface-panel rounded-3xl p-10 text-center">
          <Trophy className="mx-auto mb-4 size-10 text-slatebrand/40" />
          <p className="text-sm font-semibold text-slatebrand">No teams found in the database.</p>
        </div>
      )}

      <TeamEditDialog
        team={editingTeam}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={loadData}
      />

      <TeamDetailsDialog
        team={viewingTeam}
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
      />
    </div>
  )
}
