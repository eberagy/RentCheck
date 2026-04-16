import { CheckCircle2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface VerifiedBadgeProps {
  size?: 'sm' | 'md'
}

export function VerifiedBadge({ size = 'md' }: VerifiedBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={`inline-flex items-center gap-1 rounded-full font-semibold text-white cursor-default
              ${size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}
              bg-teal-500`}
          />
        }
      >
        <CheckCircle2 className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        Verified
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs max-w-xs">
          This landlord has verified their identity with Vett. Verification does not imply endorsement.
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
