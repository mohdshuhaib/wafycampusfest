import { redirect } from "next/navigation"
import type { Viewport } from "next"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { LogOut, Scale, Sparkles, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default async function JudgeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {},
        remove(name: string, options: CookieOptions) {},
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  } catch (e) {
    user = null
  }

  if (!user) {
    redirect("/login")
  }

  // Get user profile or judge profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  const { data: judgeData } = await supabase
    .from("judges")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  const judgeName = judgeData?.name || profile?.full_name || "Official Judge"

  return (
    <div className="min-h-screen bg-mist text-navy font-['Anek_Malayalam',sans-serif]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-navy/10 bg-ivory/90 px-4 py-3 shadow-sm backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/judge" className="flex items-center gap-2.5 transition hover:opacity-85">
            <div className="flex size-9 items-center justify-center rounded-xl bg-navy text-gold shadow-sm">
              <Scale className="size-5" />
            </div>
            <div>
              <div className="text-sm font-black leading-tight text-navy sm:text-base">
                Wafy Campus Kalikavu
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slatebrand">
                Arts Fest 2026 • Judge Portal
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                <UserCheck className="size-3.5 text-gold" />
                {judgeName}
              </div>
              <span className="text-[10px] text-slatebrand">{user.email}</span>
            </div>

            <form action="/login" method="GET">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl border border-navy/15 bg-white px-3 py-1.5 text-xs font-bold text-navy shadow-sm transition hover:bg-navy/5"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Link>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 animate-premium-in">
        {children}
      </main>
    </div>
  )
}
