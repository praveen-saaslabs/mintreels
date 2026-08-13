import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import type { SpeakerBadgeVariant } from "@/lib/speaker-style"
import { cn } from "@/lib/utils"

const speakerVariantClasses = {
  speaker1:
    "bg-speaker-1-bg text-speaker-1 focus-visible:ring-speaker-1/20 [a]:hover:bg-speaker-1-bg/80",
  speaker2:
    "bg-speaker-2-bg text-speaker-2 focus-visible:ring-speaker-2/20 [a]:hover:bg-speaker-2-bg/80",
  speaker3:
    "bg-speaker-3-bg text-speaker-3 focus-visible:ring-speaker-3/20 [a]:hover:bg-speaker-3-bg/80",
  speaker4:
    "bg-speaker-4-bg text-speaker-4 focus-visible:ring-speaker-4/20 [a]:hover:bg-speaker-4-bg/80",
  speaker5:
    "bg-speaker-5-bg text-speaker-5 focus-visible:ring-speaker-5/20 [a]:hover:bg-speaker-5-bg/80",
  speaker6:
    "bg-speaker-6-bg text-speaker-6 focus-visible:ring-speaker-6/20 [a]:hover:bg-speaker-6-bg/80",
  speaker7:
    "bg-speaker-7-bg text-speaker-7 focus-visible:ring-speaker-7/20 [a]:hover:bg-speaker-7-bg/80",
  speaker8:
    "bg-speaker-8-bg text-speaker-8 focus-visible:ring-speaker-8/20 [a]:hover:bg-speaker-8-bg/80",
  speaker9:
    "bg-speaker-9-bg text-speaker-9 focus-visible:ring-speaker-9/20 [a]:hover:bg-speaker-9-bg/80",
  speaker10:
    "bg-speaker-10-bg text-speaker-10 focus-visible:ring-speaker-10/20 [a]:hover:bg-speaker-10-bg/80",
} as const satisfies Record<SpeakerBadgeVariant, string>

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-[var(--glass-border-subtle)] bg-[var(--glass-bg)] text-foreground backdrop-blur-sm [a]:hover:bg-[var(--glass-bg-elevated)] [a]:hover:text-foreground",
        ghost:
          "hover:bg-[var(--glass-bg)] hover:text-foreground dark:hover:bg-[var(--glass-bg)]",
        link: "text-primary underline-offset-4 hover:underline",
        ...speakerVariantClasses,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
