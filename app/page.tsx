"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, Image as ImageIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import ImageSlider3D from "@/components/lightswind/3d-image-slider"

interface HighlightAsset {
  value: string
}

export default function LandingPage() {
  const [images, setImages] = useState<string[]>([])
  const [sliderSize, setSliderSize] = useState({ cardWidth: "22em", perspective: "68em" })
  const supabase = createClient()

  useEffect(() => {
    async function loadHighlights() {
      const { data, error } = await (supabase.from("site_assets") as any)
        .select("value")
        .like("key", "landing_highlight_%")
        .eq("type", "image")
        .order("updated_at", { ascending: false })
        .limit(10)

      if (error) {
        console.error("Failed to load landing highlights:", error)
        return
      }

      setImages(((data || []) as HighlightAsset[]).map((item) => item.value).filter(Boolean))
    }

    loadHighlights()
  }, [])

  useEffect(() => {
    const updateSliderSize = () => {
      if (window.innerWidth < 640) {
        setSliderSize({ cardWidth: "13.5em", perspective: "34em" })
      } else if (window.innerWidth < 1024) {
        setSliderSize({ cardWidth: "17em", perspective: "48em" })
      } else {
        setSliderSize({ cardWidth: "23em", perspective: "72em" })
      }
    }

    updateSliderSize()
    window.addEventListener("resize", updateSliderSize)
    return () => window.removeEventListener("resize", updateSliderSize)
  }, [])

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

          <Link href="/login">
            <Button className="hidden sm:inline-flex">
              Dashboard
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </header>

      <section className="relative mt-16 flex min-h-[calc(100vh-4rem)] w-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#f6f2e8_0%,#ede7d9_42%,#dfe7eb_100%)]">
        <div className="pointer-events-none absolute inset-0 premium-grid opacity-45" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-ivory/90 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a1d2c]/14 to-transparent" />

        <div className="relative z-10 flex h-full min-h-[calc(100vh-4rem)] w-screen flex-col px-0 py-5 sm:py-7">
          <div className="shrink-0 px-4 text-center sm:px-6 lg:px-8">
            <h1 className="text-display mx-auto max-w-4xl text-4xl text-navy sm:text-5xl lg:text-6xl">
              Wafy Campus Kalikkav Arts Fest
            </h1>
          </div>

          <div className="relative min-h-[420px] flex-1 overflow-visible">
            {images.length > 0 ? (
              <ImageSlider3D
                images={images}
                duration={32}
                cardWidth={sliderSize.cardWidth}
                cardAspectRatio="7/10"
                perspective={sliderSize.perspective}
                containerClassName="h-full min-h-[420px] md:min-h-[560px]"
                imageClassName="shadow-[0_28px_70px_rgba(10,29,44,.34)] ring-1 ring-ivory/20"
                rotationDirection="left"
                withMask
              />
            ) : (
              <div className="grid h-full min-h-[420px] place-items-center px-4">
                <div className="text-center text-slatebrand">
                  <ImageIcon className="mx-auto mb-3 size-10 text-gold" />
                  <p className="text-sm font-bold text-navy">Highlights will appear here soon.</p>
                  <p className="mt-1 text-xs font-semibold">Upload landing highlights from Admin Assets.</p>
                </div>
              </div>
            )}
          </div>

          <div className="relative z-20 shrink-0 px-4 pb-5 pt-2 sm:px-6 md:pb-10 md:pt-5 lg:px-8">
            <div className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/login" className="flex-1 sm:flex-none">
                <Button size="lg" className="h-12 w-full px-7">
                  Dashboard
                  <ArrowRight className="size-5" />
                </Button>
              </Link>
              <Link href="/schedule" className="flex-1 sm:flex-none">
                <Button variant="outline" size="lg" className="h-12 w-full border-navy/15 bg-ivory/76 px-7 backdrop-blur">
                  Schedule
                  <CalendarDays className="size-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
