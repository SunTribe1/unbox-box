'use client'

import { useEffect, useRef } from 'react'
import { paintRadialGlow, type Rgb, type Stop } from '@/lib/dither'
import { cn } from '@/lib/utils'

/** Reads a CSS colour (any syntax the browser knows, e.g. oklch) as sRGB, via a 1×1 canvas. */
function resolveColor(css: string): Rgb | null {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx || !css) return null
  ctx.fillStyle = css
  ctx.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

interface GlowCanvasProps {
  /** Centre and radii as fractions of the element's width and height. */
  at: readonly [number, number]
  size: readonly [number, number]
  /** Alpha stops of the theme's --glow colour over --background. */
  stops: readonly Stop[]
  className?: string
}

/** A soft radial light, painted per pixel with dithering so Chrome shows no rings (see
 *  lib/dither.ts). Drawn once per resize at CSS-pixel resolution: the light has no detail a
 *  denser canvas would show. */
export function GlowCanvas({ at, size, stops, className }: GlowCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const style = getComputedStyle(canvas)
    const background = resolveColor(style.getPropertyValue('--background').trim())
    const color = resolveColor(style.getPropertyValue('--glow').trim())
    if (!background || !color) return

    const paint = () => {
      const [w, h] = [canvas.clientWidth, canvas.clientHeight]
      if (!w || !h) return
      canvas.width = w
      canvas.height = h
      const image = ctx.createImageData(w, h)
      paintRadialGlow(image.data, w, h, {
        background,
        color,
        center: [at[0] * w, at[1] * h],
        radius: [size[0] * w, size[1] * h],
        stops,
      })
      ctx.putImageData(image, 0, 0)
    }
    paint()
    const observer = new ResizeObserver(paint)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [at, size, stops])

  return <canvas ref={ref} aria-hidden className={cn('absolute inset-0 size-full', className)} />
}
