"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, MessageCircle, Phone, Sparkles } from "lucide-react"

interface CommitteeMember {
  id: string
  name: string
  role: string
  whatsapp_number: string
  phone_number: string
  sort_order: number
}

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "")
}

export default function CaptainContactPage() {
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<CommitteeMember[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function loadContacts() {
      try {
        setLoading(true)
        const { data, error } = await supabase.from("committee_members")
          .select("id, name, role, whatsapp_number, phone_number, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true })

        if (error) throw error
        setMembers((data || []) as CommitteeMember[])
      } catch (error) {
        console.error("Failed to load committee contacts:", error)
      } finally {
        setLoading(false)
      }
    }

    loadContacts()
  }, [])

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name))
  }, [members])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <div className="surface-elevated flex items-center gap-3 rounded-3xl px-5 py-4">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold text-navy">Loading contacts</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-20 md:pb-4">
      <section className="surface-dark relative overflow-hidden rounded-[2rem] p-5 sm:p-6">
        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <Badge variant="gold" className="h-8 gap-2 px-3">
              <Sparkles className="size-3.5" />
              Contact
            </Badge>
            <h1 className="text-display mt-4 text-3xl text-ivory sm:text-4xl">Committee contacts.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/62">
              Reach the right committee member directly through WhatsApp or phone call.
            </p>
          </div>

          <div className="rounded-3xl border border-ivory/10 bg-ivory/8 p-4">
            <div className="flex items-center gap-3">
              <Phone className="size-5 text-gold" />
              <div>
                <p className="text-2xl font-black text-ivory">{sortedMembers.length}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ivory/48">Members</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {sortedMembers.length === 0 ? (
        <section className="surface-panel grid min-h-80 place-items-center rounded-[2rem] p-8 text-center text-slatebrand">
          <div>
            <Phone className="mx-auto mb-3 size-10 opacity-40" />
            <p className="text-sm font-bold text-navy">No committee contacts are available yet.</p>
          </div>
        </section>
      ) : (
        <section className="hidden overflow-hidden rounded-[2rem] border border-navy/10 bg-ivory/70 shadow-premium md:block">
          <Table>
            <TableHeader>
              <TableRow className="border-navy/10 bg-navy text-ivory hover:bg-navy">
                <TableHead className="h-12 pl-5 text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Name</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Role</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">WhatsApp</TableHead>
                <TableHead className="pr-5 text-[11px] font-black uppercase tracking-[0.14em] text-ivory/70">Phone Call</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMembers.map((member) => {
                const whatsappNumber = digitsOnly(member.whatsapp_number)
                const phoneNumber = digitsOnly(member.phone_number)

                return (
                  <TableRow key={member.id}>
                    <TableCell className="pl-5 font-bold text-navy">{member.name}</TableCell>
                    <TableCell className="font-semibold text-slatebrand">{member.role}</TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">
                          <MessageCircle className="size-4" />
                          {member.whatsapp_number}
                        </a>
                      </Button>
                    </TableCell>
                    <TableCell className="pr-5">
                      <Button asChild variant="outline" size="sm">
                        <a href={`tel:${phoneNumber}`}>
                          <Phone className="size-4" />
                          {member.phone_number}
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </section>
      )}

      <section className="grid gap-3 md:hidden">
        {sortedMembers.map((member) => {
          const whatsappNumber = digitsOnly(member.whatsapp_number)
          const phoneNumber = digitsOnly(member.phone_number)

          return (
            <article key={member.id} className="surface-elevated rounded-3xl p-5">
              <h2 className="text-title text-xl text-navy">{member.name}</h2>
              <p className="mt-1 text-sm font-semibold text-slatebrand">{member.role}</p>
              <div className="mt-4 grid gap-2">
                <Button asChild variant="outline" className="justify-start">
                  <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" />
                    {member.whatsapp_number}
                  </a>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <a href={`tel:${phoneNumber}`}>
                    <Phone className="size-4" />
                    {member.phone_number}
                  </a>
                </Button>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
