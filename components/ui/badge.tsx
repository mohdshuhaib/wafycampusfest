import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "focus-premium inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] transition-all duration-300 [&>svg]:size-3 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default:
          "border-navy/10 bg-navy text-ivory [a&]:hover:bg-deepblue",
        secondary:
          "border-deepblue/10 bg-deepblue/10 text-deepblue [a&]:hover:bg-deepblue/15",
        destructive:
          "border-destructive/10 bg-destructive/10 text-destructive [a&]:hover:bg-destructive/15",
        outline:
          "border-navy/12 bg-ivory/50 text-slatebrand [a&]:hover:border-gold/35 [a&]:hover:text-navy",
        gold:
          "border-gold/30 bg-gold/16 text-navy",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
