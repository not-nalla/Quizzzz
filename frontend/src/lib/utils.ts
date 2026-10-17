import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-display",
        "text-h1",
        "text-h2",
        "text-h3",
        "text-h4",
        "text-body-lg",
        "text-body",
        "text-small",
        "text-caption",
        "text-button",
        "text-label",
        "text-nav-item",
        "text-th",
        "text-td",
        "text-stat",
        "text-question",
        "text-option",
        "text-timer",
        "text-code",
        "text-chat",
      ],
      "font-family": [
        "font-display",
        "font-sans",
        "font-button",
        "font-mono",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs))
}
