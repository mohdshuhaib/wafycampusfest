"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { ReplacementMatrix } from "@/components/admin/ReplacementMatrix"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck, Sparkles, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Team {
  id: string
  name: string
  color_hex: string
}

export default function AdminReplacementPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function fetchTeams() {
      try {
        setLoading(true)
        setDataError(null)

        const { data, error } = await supabase
          .from("teams")
          .select("id, name, color_hex")
          .order("name")

        if (error) {
          console.error("Supabase Query Error:", error)
          setDataError(error.message)
          return
        }

        if (data) {
          const typedData = data as Team[]
          setTeams(typedData)

          if (typedData.length > 0) {
            setSelectedTeam(typedData[0].id)
          } else {
            console.warn("Query succeeded but returned 0 teams. Check RLS policies.")
          }
        }
      } catch (err) {
        console.error("Unexpected Error:", err)
        setDataError("An unexpected error occurred.")
      } finally {
        setLoading(false)
      }
    }
    fetchTeams()
  }, [])

  const currentTeam = teams.find((team) => team.id === selectedTeam)

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] w-full items-center justify-center">
        <div className="surface-elevated flex items-center gap-3 rounded-3xl px-5 py-4">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold text-navy">Loading replacement console</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-5 overflow-hidden pb-20 md:pb-4">
      <section className="surface-dark relative shrink-0 overflow-hidden rounded-[2rem] p-5 sm:p-6">

        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <Badge variant="gold" className="h-8 gap-2 px-3">
              <Sparkles className="size-3.5" />
              Admin Override
            </Badge>
            <h1 className="text-display mt-4 text-3xl text-ivory sm:text-4xl">Participant Replacement</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/62">
              Select a team, inspect every programme, and update participant registrations with capacity awareness.
            </p>
          </div>

          <div className="w-full xl:w-80">
            {dataError ? (
              <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-xs font-bold text-ivory">
                Error: {dataError}
              </div>
            ) : teams.length === 0 ? (
              <div className="flex items-center gap-2 rounded-2xl border border-gold/25 bg-gold/10 p-3 text-xs font-bold text-gold">
                <AlertTriangle className="size-4" />
                <span>No teams found. Check RLS policies.</span>
              </div>
            ) : (
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="h-12 w-full rounded-2xl border-ivory/15 bg-ivory/10 text-ivory">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent className="surface-elevated max-h-[300px] rounded-2xl border-navy/10">
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full border border-navy/10" style={{ backgroundColor: team.color_hex }} />
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </section>

      <section className="grid shrink-0 gap-4 sm:grid-cols-3">
        <InfoStrip icon={Users} label="Selected Team" value={currentTeam?.name || "No team"} swatch={currentTeam?.color_hex} />
        <InfoStrip icon={ShieldCheck} label="Mode" value="Admin replacement" />
        <InfoStrip icon={RefreshCw} label="Updates" value="Saved instantly" />
      </section>

      <section className="surface-elevated min-h-0 flex-1 overflow-hidden rounded-[2rem] p-2 md:p-4">
        {selectedTeam ? (
          <ReplacementMatrix teamId={selectedTeam} teamName={currentTeam?.name || "Team"} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Users className="size-12 text-slatebrand/35" />
            <p className="text-sm font-bold text-navy">
              {teams.length === 0 ? "Database returned 0 teams." : "Select a team above to begin."}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function InfoStrip({
  icon: Icon,
  label,
  value,
  swatch,
}: {
  icon: typeof Users
  label: string
  value: string
  swatch?: string
}) {
  return (
    <div className="surface-panel rounded-[1.5rem] p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-navy text-gold">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="eyebrow text-slatebrand">{label}</p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            {swatch && <span className="size-3 rounded-full" style={{ backgroundColor: swatch }} />}
            <p className="truncate text-sm font-black text-navy">{value}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
