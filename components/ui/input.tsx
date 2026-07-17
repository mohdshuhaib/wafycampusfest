import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "focus-premium h-11 w-full min-w-0 rounded-xl border border-navy/12 bg-ivory/70 px-4 py-2 text-base text-navy shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] outline-none transition-all duration-300 placeholder:text-slatebrand/55 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-navy/20 focus-visible:border-gold/60 focus-visible:bg-ivory",
        "aria-invalid:border-destructive/60 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
