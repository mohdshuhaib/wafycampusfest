"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "focus-premium peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-navy/10 bg-navy/12 p-0.5 shadow-inner outline-none transition-all duration-300 data-[state=checked]:border-gold/50 data-[state=checked]:bg-navy disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-ivory shadow-premium ring-0 transition-transform duration-300 data-[state=checked]:translate-x-5 data-[state=checked]:bg-gold data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
