import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/** The type-scale utilities in globals.css are font sizes, not text colors; without this,
 *  tailwind-merge would drop `text-label` whenever a `text-muted-foreground` follows it. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display',
            'title',
            'label',
            'caption',
            'hero',
            'headline',
            'subhead',
            'lead',
            'eyebrow',
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Reads a CSS custom property (for canvas charts, which can't use classes). */
export function cssVar(name: string, el: Element = document.documentElement): string {
  return getComputedStyle(el).getPropertyValue(name).trim()
}
