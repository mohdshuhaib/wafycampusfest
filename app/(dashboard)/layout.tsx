import { redirect } from "next/navigation"
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Sidebar, MobileBottomNav, MobileSidebar } from "@/components/dashboard/sidebar"
import { DashboardViewport } from "@/components/dashboard/dashboard-viewport"

export default async function DashboardLayout({
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

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) { redirect("/login") }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) { redirect("/login") }

  return (
    <div className="app-shell flex h-screen w-full overflow-hidden">
      <DashboardViewport />
      <div className="fixed inset-y-0 z-50 hidden md:flex md:w-72 md:flex-col">
        <Sidebar role={profile.role} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col transition-all duration-300 md:pl-72">

        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-navy/10 bg-ivory/70 px-4 shadow-[0_12px_36px_rgb(10_29_44/0.06)] backdrop-blur-2xl sm:px-6">

          <div className="md:hidden flex items-center gap-2">
            <MobileSidebar role={profile.role} />
            <span className="text-title whitespace-nowrap text-lg text-navy">Wafy Campus Kalikkav</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-bold leading-none text-navy">{profile.full_name || 'User'}</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slatebrand">{profile.role}</span>
             </div>
          </div>
        </header>

        <main className="relative w-full flex-1 overflow-y-auto px-4 pb-28 pt-5 md:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 premium-grid opacity-50" />
          <div className="relative mx-auto w-full max-w-7xl animate-premium-in">
            {children}
          </div>
        </main>
        <MobileBottomNav role={profile.role} />
      </div>
    </div>
  )
}
