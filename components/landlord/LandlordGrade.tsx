import { gradeColor, cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { LandlordGrade as TGrade } from '@/types'

interface LandlordGradeProps {
  grade: TGrade | null
  size?: 'sm' | 'md' | 'lg'
}

export function LandlordGrade({ grade, size = 'md' }: LandlordGradeProps) {
  if (!grade) return null

  const sizeClass = size === 'sm'
    ? 'h-7 w-7 text-sm'
    : size === 'lg'
    ? 'h-14 w-14 text-2xl'
    : 'h-10 w-10 text-lg'

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              'rounded-lg font-bold flex items-center justify-center cursor-default',
              sizeClass,
              gradeColor(grade)
            )}
          />
        }
      >
        {grade}
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs max-w-xs font-medium">Summary of public renter reviews on Vett.</p>
        <p className="text-xs text-gray-400 mt-1">Not a credit or background report. Not from a consumer reporting agency.</p>
      </TooltipContent>
    </Tooltip>
  )
}
