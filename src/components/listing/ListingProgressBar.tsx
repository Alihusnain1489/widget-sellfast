'use client'

interface Step {
  number: number
  label: string
  field: string
}

interface ListingProgressBarProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (step: number) => void
}

export default function ListingProgressBar({ steps, currentStep }: ListingProgressBarProps) {
  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100

  return (
    <div className="w-full pb-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStep} of {steps.length}: {steps[currentStep - 1].label}
        </span>
        <span className="text-sm font-medium text-[#F56A34]">
          {Math.round(progressPercentage)}%
        </span>
      </div>
      
      <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#F56A34] to-[#E55A24] rounded-full transition-all duration-500 ease-out shadow-md"
          style={{ width: `${progressPercentage}%` }}
        >
          <div className="h-full w-full bg-white/20 animate-pulse" />
        </div>
      </div>
    </div>
  )
}