import { compoundColor } from '@/lib/tyres'
import { cn } from '@/lib/utils'
import { TyreIcon, type IconProps } from './index'

/** The tyre icon tinted in its compound colour. */
export function CompoundTyre({
  compound,
  className,
  style,
  ...props
}: IconProps & { compound: string }) {
  return (
    <TyreIcon
      className={cn('size-4 shrink-0', className)}
      style={{ color: compoundColor(compound), ...style }}
      {...props}
    />
  )
}
