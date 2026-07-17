import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "focus-premium flex min-h-24 w-full rounded-2xl border border-navy/12 bg-ivory/70 px-4 py-3 text-sm font-medium text-navy shadow-inner transition-all duration-200 placeholder:text-slatebrand/55 hover:border-navy/20 focus:border-gold/55 focus:bg-ivory disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
