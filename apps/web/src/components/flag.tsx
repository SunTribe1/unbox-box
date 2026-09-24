import { flagCode } from '@unbox-box/tools'
import { cn } from '@/lib/utils'

// One-page preview builds resolve assets relative to the page; path builds from the root.
const BASE = process.env.NEXT_PUBLIC_QUERY_ROUTING === '1' ? 'flags' : '/flags'

/** A country flag (flag-icons, MIT) from an ISO alpha-2 code. Decorative unless `label` is
 *  given; renders nothing for an unknown code. */
export function Flag({
  code,
  label,
  className,
}: {
  code: string | null | undefined
  label?: string
  className?: string
}) {
  const key = flagCode(code)
  if (!key) return null
  return (
    // A plain img: flags are static files, no image pipeline needed.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE}/${key}.svg`}
      alt={label ?? ''}
      title={label}
      width={16}
      height={12}
      loading="lazy"
      decoding="async"
      className={cn(
        'inline-block h-3 w-4 shrink-0 rounded-[2px] object-cover ring-1 ring-border',
        className,
      )}
    />
  )
}
