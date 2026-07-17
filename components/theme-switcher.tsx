"use client"

import * as React from "react"

export function ThemeSwitcher() {
  React.useEffect(() => {
    document.documentElement.classList.remove("dark")
    localStorage.setItem("theme", "light")
  }, [])

  return null
}
