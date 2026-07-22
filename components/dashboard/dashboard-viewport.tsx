"use client"

import { useEffect } from "react"

export function DashboardViewport() {
  useEffect(() => {
    const existing = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    const previousContent = existing?.getAttribute("content")
    const meta = existing || document.createElement("meta")

    meta.name = "viewport"
    meta.content = "width=1180, initial-scale=1"
    if (!existing) document.head.appendChild(meta)

    return () => {
      if (previousContent) {
        meta.content = previousContent
      } else {
        meta.remove()
      }
    }
  }, [])

  return null
}
