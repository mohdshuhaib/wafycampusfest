import Link from "next/link"
import { CalendarClock, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SchedulePage() {
  return (
    <main className="app-shell min-h-screen text-navy">
      <header className="border-b border-navy/10 bg-ivory/72 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <div>
              <div className="text-title text-base">Wafy Campus Kalikkav</div>
              <div className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-slatebrand sm:block">
                Arts Fest Portal
              </div>
            </div>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <section className="grid min-h-[calc(100vh-4rem)] place-items-center px-4">
        <div className="surface-elevated max-w-lg rounded-[2rem] p-8 text-center">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-3xl bg-gold/14 text-gold">
            <CalendarClock className="size-8" />
          </div>
          <h1 className="text-display text-4xl text-navy">Schedule will be updated soon.</h1>
          <p className="mt-4 text-sm font-semibold leading-6 text-slatebrand">
            The official programme schedule is being prepared and will be published here.
          </p>
        </div>
      </section>
    </main>
  )
}
