"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Flame,
  Sparkles,
  Crown,
  ChevronDown,
  Calendar,
  ArrowRight,
  Trophy,
  Layers,
  Award,
  Compass,
} from "lucide-react"

interface Hero3DCanvasScrollerProps {
  totalEvents: number
  totalParticipants: number
  onScrollToResults: () => void
}

const TOTAL_FRAMES = 300
const FRAME_PREFIX = "/heroimages/ezgif-frame-"

function getFrameSrc(index: number) {
  const pad = String(index).padStart(3, "0")
  return `${FRAME_PREFIX}${pad}.png`
}

export default function Hero3DCanvasScroller({
  totalEvents,
  totalParticipants,
  onScrollToResults,
}: Hero3DCanvasScrollerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Store preloaded images in an array
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(TOTAL_FRAMES + 1).fill(null))
  const [loadProgress, setLoadProgress] = useState(0)
  const [isInitialReady, setIsInitialReady] = useState(false)

  // Current scroll progress (0.0 to 1.0) and frame index
  const [scrollProgress, setScrollProgress] = useState(0)
  const currentFrameRef = useRef(1)
  const targetFrameRef = useRef(1)
  const animFrameIdRef = useRef<number | null>(null)

  // Draw a frame on the canvas with "cover" aspect ratio fit
  const drawFrame = useCallback((frameNumber: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Find the requested image or the closest available loaded frame
    let img = imagesRef.current[frameNumber]
    if (!img || !img.complete || img.naturalWidth === 0) {
      // Look backward for nearest loaded frame
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const prev = frameNumber - offset
        if (prev >= 1 && imagesRef.current[prev]?.complete && imagesRef.current[prev]!.naturalWidth > 0) {
          img = imagesRef.current[prev]
          break
        }
        const next = frameNumber + offset
        if (next <= TOTAL_FRAMES && imagesRef.current[next]?.complete && imagesRef.current[next]!.naturalWidth > 0) {
          img = imagesRef.current[next]
          break
        }
      }
    }

    if (!img || !img.complete || img.naturalWidth === 0) return

    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2)
    const cw = canvas.width / dpr
    const ch = canvas.height / dpr

    // Clear canvas
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cw, ch)

    // Calculate aspect ratio cover fit
    const imgWidth = img.naturalWidth || 1280
    const imgHeight = img.naturalHeight || 720
    const scale = Math.max(cw / imgWidth, ch / imgHeight)
    const drawW = imgWidth * scale
    const drawH = imgHeight * scale
    const drawX = (cw - drawW) / 2
    const drawY = (ch - drawH) / 2

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(img, drawX, drawY, drawW, drawH)
    ctx.restore()
  }, [])

  // Resize canvas to match display size and DPI
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = window.innerWidth
    const h = window.innerHeight

    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    // Re-draw current frame
    drawFrame(Math.round(currentFrameRef.current))
  }, [drawFrame])

  // Preloading engine with prioritized queue
  useEffect(() => {
    let isCancelled = false
    let loadedCount = 0

    const updateProgress = () => {
      if (isCancelled) return
      loadedCount++
      const pct = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100))
      setLoadProgress(pct)
    }

    const loadImage = (index: number): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        if (imagesRef.current[index]?.complete) {
          resolve(imagesRef.current[index]!)
          return
        }

        const img = new window.Image()
        img.src = getFrameSrc(index)

        img.onload = () => {
          if (isCancelled) return
          imagesRef.current[index] = img
          updateProgress()
          // If this is frame 1, mark ready and draw right away
          if (index === 1) {
            setIsInitialReady(true)
            drawFrame(1)
          }
          resolve(img)
        }

        img.onerror = () => {
          if (isCancelled) return
          updateProgress()
          resolve(img)
        }
      })
    }

    // Step 1: Immediately load Frame 1
    loadImage(1).then(() => {
      if (isCancelled) return

      // Step 2: Load keyframes across the sequence (every 5th frame)
      // This gives instant scrub responsiveness across the entire scroll range!
      const keyframes: number[] = []
      for (let i = 2; i <= TOTAL_FRAMES; i += 5) {
        keyframes.push(i)
      }
      if (!keyframes.includes(TOTAL_FRAMES)) keyframes.push(TOTAL_FRAMES)

      const remainingFrames: number[] = []
      for (let i = 2; i <= TOTAL_FRAMES; i++) {
        if (!keyframes.includes(i)) {
          remainingFrames.push(i)
        }
      }

      // Concurrency runner to smoothly fetch frames without saturating the connection
      const CONCURRENCY = 6
      let keyframeIndex = 0

      const runKeyframes = async () => {
        const pool: Promise<any>[] = []
        while (keyframeIndex < keyframes.length && !isCancelled) {
          while (pool.length < CONCURRENCY && keyframeIndex < keyframes.length) {
            const idx = keyframes[keyframeIndex++]
            const p = loadImage(idx).then(() => {
              const pIdx = pool.indexOf(p)
              if (pIdx !== -1) pool.splice(pIdx, 1)
            })
            pool.push(p)
          }
          if (pool.length > 0) {
            await Promise.race(pool)
          }
        }
        await Promise.all(pool)

        // Step 3: Now load all remaining intermediate frames in background
        let remIndex = 0
        const remPool: Promise<any>[] = []
        while (remIndex < remainingFrames.length && !isCancelled) {
          while (remPool.length < CONCURRENCY && remIndex < remainingFrames.length) {
            const idx = remainingFrames[remIndex++]
            const p = loadImage(idx).then(() => {
              const pIdx = remPool.indexOf(p)
              if (pIdx !== -1) remPool.splice(pIdx, 1)
            })
            remPool.push(p)
          }
          if (remPool.length > 0) {
            await Promise.race(remPool)
          }
        }
        await Promise.all(remPool)
      }

      runKeyframes()
    })

    return () => {
      isCancelled = true
    }
  }, [drawFrame])

  // Setup resize listener
  useEffect(() => {
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas, { passive: true })
    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [resizeCanvas])

  // Smooth lerping animation loop for canvas frame scrub
  useEffect(() => {
    let active = true

    const loop = () => {
      if (!active) return

      const curr = currentFrameRef.current
      const target = targetFrameRef.current
      const diff = target - curr

      if (Math.abs(diff) > 0.05) {
        // Smooth lerp momentum
        currentFrameRef.current = curr + diff * 0.28
        drawFrame(Math.round(currentFrameRef.current))
      } else if (curr !== target) {
        currentFrameRef.current = target
        drawFrame(Math.round(target))
      }

      animFrameIdRef.current = requestAnimationFrame(loop)
    }

    animFrameIdRef.current = requestAnimationFrame(loop)

    return () => {
      active = false
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
    }
  }, [drawFrame])

  // Calculate scroll position inside the container
  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const totalScrollable = container.offsetHeight - window.innerHeight

      if (totalScrollable <= 0) return

      // Distance scrolled within the container
      const scrolled = -rect.top
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollable))

      setScrollProgress(progress)

      // Map progress (0 -> 1) to frames (1 -> 300)
      const target = 1 + Math.round(progress * (TOTAL_FRAMES - 1))
      targetFrameRef.current = target
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // Content Overlay Visibility Thresholds
  // 1. Scene 1 (0.00 - 0.20): Welcome to the Grand Arena (Misty fog parting)
  const isScene1Visible = scrollProgress >= 0.0 && scrollProgress <= 0.20
  const scene1Opacity =
    scrollProgress <= 0.12 ? 1 : Math.max(0, 1 - (scrollProgress - 0.12) / 0.08)

  // 2. Scene 2 (0.22 - 0.46): Campus Emerges - 55+ Events Highlight
  const isScene2Visible = scrollProgress >= 0.21 && scrollProgress <= 0.47
  const scene2Opacity =
    scrollProgress < 0.26
      ? (scrollProgress - 0.21) / 0.05
      : scrollProgress <= 0.41
      ? 1
      : Math.max(0, 1 - (scrollProgress - 0.41) / 0.06)

  // 3. Scene 3 (0.49 - 0.73): Campus Courtyard Flythrough - 150+ Contenders & 3 Houses
  const isScene3Visible = scrollProgress >= 0.48 && scrollProgress <= 0.74
  const scene3Opacity =
    scrollProgress < 0.53
      ? (scrollProgress - 0.48) / 0.05
      : scrollProgress <= 0.68
      ? 1
      : Math.max(0, 1 - (scrollProgress - 0.68) / 0.06)

  // 4. Scene 4 (0.75 - 1.00): Grand Climax - Name Reveal & Action Portal
  const isScene4Visible = scrollProgress >= 0.75
  const scene4Opacity =
    scrollProgress < 0.83
      ? (scrollProgress - 0.75) / 0.08
      : 1

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[350vh] bg-slate-950 text-white select-none"
    >
      {/* STICKY CANVAS CONTAINER */}
      <div className="sticky top-0 left-0 w-full h-screen h-[100dvh] overflow-hidden z-10 flex flex-col justify-between">
        {/* The 3D Scroll Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 size-full object-cover block pointer-events-none z-0"
        />

        {/* Ambient Overlay Vignette & Lighting Gradients */}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/60" />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,6,23,0.65)_100%)]" />

        {/* ========================================================
            TOP FLOATING NAVBAR (Sticky & Minimalist)
            ======================================================== */}
        <header className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative size-11 sm:size-12 rounded-2xl overflow-hidden shadow-2xl border border-white/30 bg-white/20 p-1 backdrop-blur-xl ring-2 ring-cyan-400/40 group-hover:scale-105 transition-all">
              <Image
                src="/logo.png"
                alt="Wafy Arts Fest Logo"
                width={48}
                height={48}
                className="size-full object-contain"
                priority
              />
            </div>
            <div>
              <div className="text-sm sm:text-base font-black tracking-tight text-white leading-tight font-['Plus_Jakarta_Sans',sans-serif] drop-shadow-md">
                WAFY CAMPUS KALIKAVU
              </div>
              <div className="text-[10px] sm:text-xs font-black uppercase tracking-[0.22em] text-cyan-300 flex items-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
                <span className="size-1.5 rounded-full bg-[#E06D53] animate-ping" />
                <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-[#E06D53] bg-clip-text text-transparent">
                  Arts Fest 2026-27
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onScrollToResults}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-2xl border border-white/20 bg-slate-900/60 hover:bg-slate-900/90 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-xl transition-all hover:border-cyan-400/80 cursor-pointer font-['Plus_Jakarta_Sans',sans-serif]"
            >
              <Trophy className="size-3.5 text-amber-400" />
              <span>Standings</span>
            </button>

            <Link
              href="/schedule"
              className="hidden md:inline-flex items-center gap-1.5 rounded-2xl border border-white/20 bg-slate-900/60 hover:bg-slate-900/90 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-xl transition-all hover:border-cyan-400/80 font-['Plus_Jakarta_Sans',sans-serif]"
            >
              <Calendar className="size-3.5 text-cyan-400" />
              <span>Schedule</span>
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-500 to-[#E06D53] px-4 sm:px-5 py-2 text-xs font-black text-white shadow-lg shadow-cyan-950/60 transition-all hover:scale-105 active:scale-95 font-['Plus_Jakarta_Sans',sans-serif]"
            >
              <span>Portal Login</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </header>

        {/* ========================================================
            CINEMATIC SCENE OVERLAYS (Fading Smoothly With Scroll)
            ======================================================== */}
        <div className="relative z-20 flex-1 flex items-center justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pointer-events-none">

          {/* SCENE 1: Minimalist Opening - Just "Scroll to Reveal" (Scroll: 0.00 - 0.18) */}
          <AnimatePresence>
            {isScene1Visible && (
              <div
                style={{ opacity: scene1Opacity }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 transition-opacity duration-150 pointer-events-auto"
              >
                {/* Clean Animated Scroll Hint */}
                <div className="flex flex-col items-center gap-3">
                  <span className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.28em] text-white/90 drop-shadow-md font-['Plus_Jakarta_Sans',sans-serif]">
                    Scroll to Reveal
                  </span>
                  <div className="w-5 h-9 rounded-full border-2 border-white/50 flex items-start justify-center p-1 shadow-lg bg-black/20 backdrop-blur-xs">
                    <motion.div
                      animate={{ y: [0, 14, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                    />
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* SCENE 2: The Arena & 55+ Events Highlight (Scroll: 0.22 - 0.46) */}
          <AnimatePresence>
            {isScene2Visible && (
              <div
                style={{ opacity: scene2Opacity }}
                className="absolute inset-0 flex items-center justify-start lg:justify-start px-4 sm:px-6 transition-opacity duration-150 pointer-events-auto"
              >
                <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-slate-950/75 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-black/80 font-['Plus_Jakarta_Sans',sans-serif]">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-300 mb-3">
                    <Flame className="size-3.5 text-cyan-400" />
                    <span>The Festival Arena</span>
                  </div>

                  <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                    {totalEvents}+ Signature Events
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                    A grand colosseum of competitions celebrating literary eloquence,
                    visual creativity, and dynamic stage performances.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 text-left">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                      <div className="text-[10px] sm:text-xs font-black text-cyan-400 uppercase tracking-wider">
                        On-Stage
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                        Elocution & Dramatics
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                      <div className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-wider">
                        Off-Stage
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                        Literature & Fine Arts
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                      <div className="text-[10px] sm:text-xs font-black text-emerald-400 uppercase tracking-wider">
                        General
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                        Group Choirs & Quizzes
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                      <div className="text-[10px] sm:text-xs font-black text-rose-400 uppercase tracking-wider">
                        Special
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                        Flagship Fixtures
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* SCENE 3: The Contenders & 3 Houses (Scroll: 0.49 - 0.73) */}
          <AnimatePresence>
            {isScene3Visible && (
              <div
                style={{ opacity: scene3Opacity }}
                className="absolute inset-0 flex items-center justify-end px-4 sm:px-6 transition-opacity duration-150 pointer-events-auto"
              >
                <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-slate-950/75 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-black/80 font-['Plus_Jakarta_Sans',sans-serif]">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-400/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300 mb-3">
                    <Crown className="size-3.5 text-amber-400" />
                    <span>The Contenders & Houses</span>
                  </div>

                  <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                    130+ to 150+ Talents
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                    Three distinguished houses battling for the Arts Championship Shield,
                    bringing honor, brotherhood, and unmatched energy to every contest.
                  </p>

                  <div className="mt-5 space-y-2.5">
                    {/* Telos */}
                    <div className="flex items-center justify-between rounded-2xl border border-blue-500/30 bg-blue-950/30 px-4 py-2.5 backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <span className="size-3.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                        <div>
                          <div className="text-sm font-black text-white">TELOS</div>
                          <div className="text-[10px] font-bold text-blue-300 uppercase">Vision & Focus</div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-blue-400 px-2 py-0.5 rounded-lg bg-blue-500/10">House 1</span>
                    </div>

                    {/* Ethos */}
                    <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-950/30 px-4 py-2.5 backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <span className="size-3.5 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b]" />
                        <div>
                          <div className="text-sm font-black text-white">ETHOS</div>
                          <div className="text-[10px] font-bold text-amber-300 uppercase">Character & Radiance</div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-amber-400 px-2 py-0.5 rounded-lg bg-amber-500/10">House 2</span>
                    </div>

                    {/* Thymos */}
                    <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-2.5 backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <span className="size-3.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                        <div>
                          <div className="text-sm font-black text-white">THYMOS</div>
                          <div className="text-[10px] font-bold text-emerald-300 uppercase">Passion & Courage</div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-500/10">House 3</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* SCENE 4: GRAND CLIMAX & NAME REVEAL (Scroll: 0.75 - 1.00) */}
          <AnimatePresence>
            {isScene4Visible && (
              <div
                style={{ opacity: scene4Opacity }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 transition-opacity duration-150 pointer-events-auto"
              >
                {/* THE GRAND NAME REVEAL */}
                <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-9xl font-black tracking-tight uppercase leading-[0.94] font-['Plus_Jakarta_Sans',sans-serif] drop-shadow-[0_12px_45px_rgba(0,0,0,0.95)]">
                  <span className="inline-block bg-gradient-to-r from-cyan-400 via-teal-300 to-sky-300 bg-clip-text text-transparent drop-shadow-[0_6px_25px_rgba(6,182,212,0.6)]">
                    Wafy Campus
                  </span>
                  <br />
                  <span className="inline-block bg-gradient-to-r from-[#E06D53] via-rose-500 via-amber-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-[0_8px_35px_rgba(224,109,83,0.7)]">
                    Arts Fest 2026-27
                  </span>
                </h1>

                <p className="mt-4 max-w-xl text-xs sm:text-base text-slate-200 font-semibold tracking-wide drop-shadow">
                  Wafy Campus Kalikavu • Igniting Creativity, Elevating Brotherhood
                </p>

                {/* Interactive Action Buttons */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 font-['Plus_Jakarta_Sans',sans-serif]">
                  <button
                    onClick={onScrollToResults}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-[#E06D53] px-6 sm:px-8 py-3.5 text-xs sm:text-sm font-black text-white shadow-xl shadow-cyan-950/70 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ring-white/40"
                  >
                    <Trophy className="size-4 text-amber-300" />
                    <span>View Live Standings</span>
                    <ChevronDown className="size-4 animate-bounce" />
                  </button>

                  <Link
                    href="/schedule"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-slate-900/80 px-5 sm:px-6 py-3.5 text-xs sm:text-sm font-black text-white backdrop-blur-xl shadow-xl hover:bg-white hover:text-slate-950 hover:border-white transition-all"
                  >
                    <Calendar className="size-4 text-cyan-400" />
                    <span>View Schedule</span>
                  </Link>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* ========================================================
            BOTTOM STATUS BAR: CLEAN MINIMAL CONTROLS
            ======================================================== */}
        <div className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 flex items-center justify-end font-['Plus_Jakarta_Sans',sans-serif]">
          {/* Asset preload status badge (fades out when fully ready) */}
          <div className="flex items-center gap-2">
            {loadProgress < 100 && (
              <div className="hidden sm:inline-flex items-center gap-2 bg-slate-900/80 border border-cyan-500/30 px-3 py-1.5 rounded-full text-[10px] font-bold text-cyan-300 backdrop-blur-xl">
                <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>Buffering 3D Frames: {loadProgress}%</span>
              </div>
            )}

            <button
              onClick={onScrollToResults}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs font-extrabold uppercase tracking-wider group bg-slate-950/60 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-md"
            >
              <span>Skip to Results</span>
              <ChevronDown className="size-3.5 group-hover:translate-y-0.5 transition-transform text-[#E06D53]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
