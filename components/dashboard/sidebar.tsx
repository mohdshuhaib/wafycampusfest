"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  Music,
  Trophy,
  IdCardLanyard,
  Replace,
  LogOut,
  Files,
  ScrollText,
  Menu,
  History,
  IndianRupee,
  Sparkles,
} from "lucide-react"

interface SidebarProps {
  role: "admin" | "captain"
}

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/teams", label: "Teams", icon: Trophy },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/events", label: "Events", icon: Music },
  { href: "/admin/scoring", label: "Scoring", icon: Trophy },
  { href: "/admin/replacement", label: "Replacement", icon: Replace },
  { href: "/admin/reports", label: "Reports", icon: ScrollText },
  { href: "/admin/payment", label: "Finance", icon: IndianRupee },
  { href: "/admin/assets", label: "Assets", icon: Files },
  { href: "/admin/overview", label: "Executive", icon: History },
]

const captainLinks = [
  { href: "/captain/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/captain/events", label: "Events", icon: Music },
  { href: "/captain/participations", label: "Admit Card", icon: IdCardLanyard },
  { href: "/captain/status", label: "Reports", icon: ScrollText },
]

function BrandMark() {
  return (
    <div className="flex items-center">
      <div className="min-w-0">
        <div className="text-title text-[1.05rem] text-navy">Wafy Campus Kalikkav</div>
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slatebrand">Arts Fest Portal</div>
      </div>
    </div>
  )
}

function NavContent({ role, setOpen }: { role: SidebarProps["role"], setOpen?: (open: boolean) => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const links = role === "admin" ? adminLinks : captainLinks

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="flex h-full flex-col bg-transparent text-navy">
      <div className="px-5 pb-5 pt-6">
        <BrandMark />
      </div>

      <div className="mx-4 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-xs leading-5 text-navy">
        <div className="mb-1 flex items-center gap-2 font-bold">
          <Sparkles className="size-3.5 text-gold" />
          {role === "admin" ? "Festival Command" : "Team Captain"}
        </div>
        <p className="text-slatebrand">
          Live registrations, results, and operations in one focused workspace.
        </p>
      </div>

      <nav className="scrollbar-none flex-1 space-y-1 overflow-y-auto px-4 py-5">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href || pathname?.startsWith(link.href + "/")

          return (
            <Link key={link.href} href={link.href} onClick={() => setOpen?.(false)}>
              <div
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-300",
                  isActive
                    ? "bg-navy text-ivory shadow-premium"
                    : "text-slatebrand hover:bg-navy/7 hover:text-navy"
                )}
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-xl transition-all",
                    isActive ? "bg-gold text-navy" : "bg-navy/6 text-slatebrand group-hover:bg-navy/10 group-hover:text-navy"
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="truncate">{link.label}</span>
                {isActive && <span className="ml-auto size-1.5 rounded-full bg-gold" />}
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="p-4">
        <div className="rounded-2xl border border-navy/10 bg-ivory/70 p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slatebrand hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ role }: SidebarProps) {
  return (
    <aside className="hidden h-full w-72 flex-col border-r border-navy/10 bg-ivory/72 shadow-[18px_0_60px_rgb(10_29_44/0.08)] backdrop-blur-2xl md:flex">
      <NavContent role={role} />
    </aside>
  )
}

export function MobileSidebar({ role }: SidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[19rem] border-r-navy/10 p-0">
        <div className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>Main navigation for the application</SheetDescription>
        </div>
        <NavContent role={role} setOpen={setOpen} />
      </SheetContent>
    </Sheet>
  )
}

export function MobileBottomNav({ role }: SidebarProps) {
  const pathname = usePathname()
  const links = (role === "admin" ? adminLinks : captainLinks).slice(0, 5)

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 gap-1 rounded-3xl border border-navy/10 bg-ivory/90 p-2 shadow-premium backdrop-blur-2xl md:hidden">
      {links.slice(0, 4).map((link) => {
        const Icon = link.icon
        const isActive = pathname === link.href || pathname?.startsWith(link.href + "/")

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold transition-all",
              isActive ? "bg-navy text-ivory" : "text-slatebrand"
            )}
          >
            <Icon className={cn("size-4", isActive && "text-gold")} />
            <span className="max-w-full truncate">{link.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
