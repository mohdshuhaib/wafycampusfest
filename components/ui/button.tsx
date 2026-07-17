import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "focus-premium group relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-xl text-sm font-semibold tracking-[0.01em] transition-all duration-300 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-navy text-ivory shadow-premium hover:-translate-y-0.5 hover:bg-deepblue active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_14px_30px_rgb(185_28_28/0.18)] hover:-translate-y-0.5 hover:bg-destructive/90 active:translate-y-0",
        outline:
          "border border-navy/15 bg-ivory/55 text-navy shadow-[inset_0_1px_0_rgb(255_255_255/0.55)] backdrop-blur-xl hover:-translate-y-0.5 hover:border-gold/45 hover:bg-ivory active:translate-y-0",
        secondary:
          "bg-deepblue/10 text-navy hover:-translate-y-0.5 hover:bg-deepblue/15 active:translate-y-0",
        ghost:
          "text-slatebrand hover:bg-navy/7 hover:text-navy active:bg-navy/10",
        link: "rounded-md px-0 text-navy underline-offset-4 hover:text-deepblue hover:underline",
        success: "bg-success text-success-foreground shadow-[0_14px_30px_rgb(46_125_84/0.18)] hover:-translate-y-0.5 hover:bg-success/90 active:translate-y-0",
        warning: "bg-gold text-navy shadow-gold hover:-translate-y-0.5 hover:bg-[#c9a22e] active:translate-y-0",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 rounded-2xl px-6 text-base has-[>svg]:px-5",
        icon: "size-10",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
