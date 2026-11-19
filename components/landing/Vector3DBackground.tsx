"use client"

import React from "react"

export default function Vector3DBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#F8FAFC]">
      {/* ========================================================
          1. CRISP ARCHITECTURAL VECTOR GRID WITH INTERSECTION CROSSES
          ======================================================== */}
      <svg
        className="absolute inset-0 size-full opacity-[0.45]"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          {/* Main 60x60 Vector Grid */}
          <pattern
            id="vector-grid-pattern"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="#0A4258"
              strokeWidth="0.75"
              strokeOpacity="0.12"
            />
            {/* Crosshair at intersection */}
            <path
              d="M 28 30 L 32 30 M 30 28 L 30 32"
              fill="none"
              stroke="#0891B2"
              strokeWidth="1"
              strokeOpacity="0.25"
            />
          </pattern>

          {/* Isometric Diamond Grid */}
          <pattern
            id="iso-grid-pattern"
            width="120"
            height="69.28"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 0 34.64 L 60 0 L 120 34.64 L 60 69.28 Z"
              fill="none"
              stroke="#E06D53"
              strokeWidth="0.5"
              strokeOpacity="0.08"
            />
          </pattern>

          {/* Linear Gradients for Topographic Curves */}
          <linearGradient id="topo-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891B2" stopOpacity="0.28" />
            <stop offset="50%" stopColor="#0A4258" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#E06D53" stopOpacity="0.24" />
          </linearGradient>

          <linearGradient id="topo-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E06D53" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.15" />
          </linearGradient>

          <linearGradient id="poly-grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#0A4258" />
          </linearGradient>

          <linearGradient id="poly-grad-coral" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#E06D53" />
          </linearGradient>

          <linearGradient id="poly-grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#vector-grid-pattern)" />
        <rect width="100%" height="100%" fill="url(#iso-grid-pattern)" />
      </svg>

      {/* ========================================================
          2. TOPOGRAPHIC 3D VECTOR CONTOUR WAVES
          ======================================================== */}
      <div className="absolute inset-0 size-full pointer-events-none opacity-60">
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Wave 1: Flowing from Top Left to Center Right */}
          <path
            d="M -100 220 C 300 120, 600 350, 1000 240 C 1250 170, 1400 310, 1600 260"
            stroke="url(#topo-grad-1)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <path
            d="M -100 260 C 300 160, 600 390, 1000 280 C 1250 210, 1400 350, 1600 300"
            stroke="url(#topo-grad-1)"
            strokeWidth="1.2"
          />
          <path
            d="M -100 300 C 300 200, 600 430, 1000 320 C 1250 250, 1400 390, 1600 340"
            stroke="url(#topo-grad-1)"
            strokeWidth="1"
            strokeOpacity="0.6"
          />

          {/* Wave 2: Sweeping across Bottom Right to Mid Left */}
          <path
            d="M -100 750 C 400 680, 800 850, 1150 720 C 1350 640, 1500 780, 1600 740"
            stroke="url(#topo-grad-2)"
            strokeWidth="1.5"
          />
          <path
            d="M -100 790 C 400 720, 800 890, 1150 760 C 1350 680, 1500 820, 1600 780"
            stroke="url(#topo-grad-2)"
            strokeWidth="1.2"
            strokeDasharray="6 4"
          />
          <path
            d="M -100 830 C 400 760, 800 930, 1150 800 C 1350 720, 1500 860, 1600 820"
            stroke="url(#topo-grad-2)"
            strokeWidth="0.8"
            strokeOpacity="0.5"
          />
        </svg>
      </div>

      {/* ========================================================
          3. 3D VECTOR WIREFRAME GEOMETRIC ACCENTS (NO BUBBLES!)
          ======================================================== */}
      {/* 3D Wireframe Icosahedron / Polyhedron (Top-Left) */}
      <div className="absolute top-24 -left-8 sm:left-12 size-36 sm:size-44 opacity-40 animate-float-slow pointer-events-none [transform-style:preserve-3d]">
        <svg viewBox="0 0 100 100" className="size-full">
          {/* Facets */}
          <polygon
            points="50,5 90,30 90,75 50,95 10,75 10,30"
            fill="rgba(6, 182, 212, 0.04)"
            stroke="url(#poly-grad-cyan)"
            strokeWidth="1.5"
          />
          <line x1="50" y1="5" x2="50" y2="95" stroke="#0891B2" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="10" y1="30" x2="90" y2="75" stroke="#0891B2" strokeWidth="0.8" />
          <line x1="10" y1="75" x2="90" y2="30" stroke="#0891B2" strokeWidth="0.8" />
          <polygon
            points="50,25 75,45 75,65 50,75 25,65 25,45"
            fill="none"
            stroke="#0A4258"
            strokeWidth="1.2"
          />
          {/* Vertex Nodes */}
          <circle cx="50" cy="5" r="2.5" fill="#06B6D4" />
          <circle cx="90" cy="30" r="2" fill="#06B6D4" />
          <circle cx="90" cy="75" r="2" fill="#06B6D4" />
          <circle cx="50" cy="95" r="2.5" fill="#06B6D4" />
          <circle cx="10" cy="75" r="2" fill="#06B6D4" />
          <circle cx="10" cy="30" r="2" fill="#06B6D4" />
        </svg>
      </div>

      {/* 3D Wireframe Isometric Cube Prism (Top-Right) */}
      <div className="absolute top-36 -right-6 sm:right-16 size-40 sm:size-48 opacity-45 animate-float-reverse pointer-events-none">
        <svg viewBox="0 0 100 100" className="size-full">
          {/* Top Face */}
          <polygon
            points="50,10 85,30 50,50 15,30"
            fill="rgba(224, 109, 83, 0.06)"
            stroke="url(#poly-grad-coral)"
            strokeWidth="1.5"
          />
          {/* Left Face */}
          <polygon
            points="15,30 50,50 50,90 15,70"
            fill="rgba(224, 109, 83, 0.03)"
            stroke="url(#poly-grad-coral)"
            strokeWidth="1.5"
          />
          {/* Right Face */}
          <polygon
            points="50,50 85,30 85,70 50,90"
            fill="rgba(224, 109, 83, 0.09)"
            stroke="url(#poly-grad-coral)"
            strokeWidth="1.5"
          />
          {/* Inner 3D Axis Lines */}
          <line x1="50" y1="50" x2="50" y2="10" stroke="#FB7185" strokeWidth="0.75" strokeDasharray="2 2" />
          <circle cx="50" cy="50" r="2" fill="#E06D53" />
          <circle cx="85" cy="30" r="2" fill="#FB7185" />
          <circle cx="15" cy="30" r="2" fill="#FB7185" />
          <circle cx="50" cy="90" r="2" fill="#E06D53" />
        </svg>
      </div>

      {/* 3D Wireframe Octahedron Diamond (Mid-Left) */}
      <div className="absolute bottom-52 left-6 sm:left-24 size-32 sm:size-36 opacity-35 animate-float-gentle pointer-events-none">
        <svg viewBox="0 0 100 100" className="size-full">
          <polygon
            points="50,10 85,50 50,90 15,50"
            fill="rgba(245, 158, 11, 0.04)"
            stroke="url(#poly-grad-gold)"
            strokeWidth="1.4"
          />
          <line x1="15" y1="50" x2="85" y2="50" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="50" y1="10" x2="50" y2="90" stroke="#F59E0B" strokeWidth="1" />
          <circle cx="50" cy="10" r="2" fill="#F59E0B" />
          <circle cx="50" cy="90" r="2" fill="#F59E0B" />
          <circle cx="15" cy="50" r="2" fill="#F59E0B" />
          <circle cx="85" cy="50" r="2" fill="#F59E0B" />
        </svg>
      </div>

      {/* 3D Geometric Vector Grid Matrix (Bottom Floor Perspective) */}
      <div className="absolute -bottom-6 inset-x-0 h-72 perspective-grid-3d opacity-25 pointer-events-none" />

      {/* ========================================================
          4. SUBTLE ACCENT GRADIENTS (Soft Vector Lighting)
          ======================================================== */}
      <div className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-cyan-400/10 via-teal-300/5 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] -left-32 h-[550px] w-[550px] rounded-full bg-gradient-to-tr from-amber-400/10 via-orange-300/5 to-transparent blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 -right-20 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-rose-400/10 via-[#E06D53]/5 to-transparent blur-[150px] pointer-events-none" />
    </div>
  )
}
