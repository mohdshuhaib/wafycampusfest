"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock,
  Crown,
  Megaphone,
  Music2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"

const countdown = [
  { label: "Days", value: "42" },
  { label: "Hours", value: "18" },
  { label: "Mins", value: "06" },
  { label: "Secs", value: "24" },
]

const stats = [
  { label: "Registered Students", value: "1.2k", icon: Users },
  { label: "Stage & Off-stage Events", value: "86", icon: Music2 },
  { label: "Prize Categories", value: "24", icon: Trophy },
]

const featuredEvents = [
  { name: "Mappilappattu", category: "On Stage", time: "Main Auditorium" },
  { name: "Arabic Calligraphy", category: "Off Stage", time: "Design Studio" },
  { name: "Debate Championship", category: "Academic", time: "Seminar Hall" },
]

export default function LandingPage() {
  return (
    <main className="app-shell min-h-screen overflow-hidden text-navy">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-navy/10 bg-ivory/72 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <div>
              <div className="text-title text-base">Wafy Campus Kalikkav</div>
              <div className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-slatebrand sm:block">
                Arts Fest Portal
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button className="hidden sm:inline-flex">
                Portal Login
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="pointer-events-none absolute inset-0 premium-grid opacity-50" />
        <div className="relative z-10 animate-premium-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-navy">
            <Sparkles className="size-3.5 text-gold" />
            Registration command center is live
          </div>

          <h1 className="text-display max-w-4xl text-5xl text-navy sm:text-6xl lg:text-7xl">
            A premium festival portal for every stage, score, and team.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-slatebrand sm:text-lg">
            Manage registrations, captains, live scoring, reports, finance, and event operations through one calm,
            fast, campus-grade control system.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Open Dashboard
                <ArrowRight className="size-5" />
              </Button>
            </Link>
            <a href="#events">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Explore Events
                <ChevronRight className="size-5" />
              </Button>
            </a>
          </div>

          <div id="stats" className="mt-10 grid gap-3 sm:grid-cols-3">
            {stats.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="surface-panel rounded-2xl p-4">
                  <div className="mb-4 grid size-9 place-items-center rounded-xl bg-navy/7 text-navy">
                    <Icon className="size-4" />
                  </div>
                  <div className="text-title text-2xl">{item.value}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slatebrand">{item.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative z-10 animate-premium-in lg:pl-6">
          <div className="surface-dark relative overflow-hidden rounded-[2rem] p-5 sm:p-6">
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow text-gold">Live Fest Console</div>
                <h2 className="text-title mt-3 text-3xl text-ivory">Arts Fest Portal</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-ivory/66">
                  A curated operational view for organizers, captains, judges, and finance teams.
                </p>
              </div>
              <div className="grid size-12 place-items-center rounded-2xl bg-gold text-navy shadow-gold">
                <Crown className="size-5" />
              </div>
            </div>

            <div className="relative mt-8 grid grid-cols-4 gap-2">
              {countdown.map((item) => (
                <div key={item.label} className="rounded-2xl border border-ivory/10 bg-ivory/8 p-3 text-center backdrop-blur">
                  <div className="text-title text-2xl text-ivory">{item.value}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ivory/50">{item.label}</div>
                </div>
              ))}
            </div>

            <div id="events" className="relative mt-6 space-y-3">
              {featuredEvents.map((event, index) => (
                <div
                  key={event.name}
                  className="flex items-center gap-3 rounded-2xl border border-ivory/10 bg-ivory/8 p-3 backdrop-blur transition hover:bg-ivory/12"
                >
                  <div className="grid size-10 place-items-center rounded-xl bg-ivory/10 text-gold">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-ivory">{event.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-ivory/50">
                      <CalendarDays className="size-3" />
                      {event.category}
                    </div>
                  </div>
                  <div className="hidden rounded-full border border-gold/20 px-3 py-1 text-xs font-bold text-gold sm:block">
                    {event.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="surface-panel rounded-3xl p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-navy">
                <Megaphone className="size-4 text-gold" />
                Latest Announcement
              </div>
              <p className="text-sm leading-6 text-slatebrand">
                Captains can review event participation and download admit cards from the portal.
              </p>
            </div>
            <div id="management" className="surface-panel rounded-3xl p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-navy">
                <ShieldCheck className="size-4 text-gold" />
                Verified Management
              </div>
              <p className="text-sm leading-6 text-slatebrand">
                Role-based access keeps admin, captain, scoring, and finance workflows organized.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-navy/10 bg-ivory/60 px-4 py-8 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slatebrand sm:flex-row sm:items-center sm:justify-between">
          <div className="font-semibold">Wafy Campus Kalikkav Arts Fest Portal</div>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-gold" />
            Built for live event operations
          </div>
        </div>
      </footer>
    </main>
  )
}
