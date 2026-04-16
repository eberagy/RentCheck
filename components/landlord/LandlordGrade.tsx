import { gradeColor, cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { LandlordGrade as TGrade } from '@/types'

interface LandlordGradeProps {
  grade: TGrade | null
  size?: 'sm' | 'md' | 'lg'
}

const GRADE_DESCRIPTIONS: Record<TGrade, string> = {
  A: 'Excellent landlord — few or no violations, high renter satisfaction',
  B: 'Good landlord — minor issues, mostly positive reviews',
  C: 'Average — some violations or mixed reviews',
  D: 'Below average — multiple violations or poor ratings',
  F: 'Significant concerns — high violations or very low ratings',
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
        <p className="text-xs max-w-xs font-medium">Grade {grade}: {GRADE_DESCRIPTIONS[grade]}</p>
        <p className="text-xs text-gray-400 mt-1">Based on violation history and renter ratings</p>
      </TooltipContent>
    </Tooltip>
  )
}
