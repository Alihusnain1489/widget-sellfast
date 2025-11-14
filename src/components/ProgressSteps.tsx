"use client";
import { useRouter } from "next/navigation";
import { useListing, STEPS } from "@/context/ListingContext";

export default function ProgressSteps() {
  const { progress, clearStep } = useListing();
  const router = useRouter();

  const handleStepClick = (stepNumber: number) => {
    if (stepNumber <= progress.currentStep) {
      clearStep(stepNumber);
      
      // Navigate to the appropriate route
      const routes: Record<number, string> = {
        0: '/sell',
        1: progress.category ? `/sell/${encodeURIComponent(progress.category.toLowerCase())}` : '/sell',
        2: progress.category && progress.brand ? `/sell/${encodeURIComponent(progress.category.toLowerCase())}/${encodeURIComponent(progress.brand.toLowerCase())}` : '/sell',
        3: progress.category && progress.brand && progress.model ? `/sell/${encodeURIComponent(progress.category.toLowerCase())}/${encodeURIComponent(progress.brand.toLowerCase())}/${encodeURIComponent(progress.model.toLowerCase())}` : '/sell',
        4: progress.category && progress.brand && progress.model ? `/sell/${encodeURIComponent(progress.category.toLowerCase())}/${encodeURIComponent(progress.brand.toLowerCase())}/${encodeURIComponent(progress.model.toLowerCase())}/location` : '/sell',
        5: progress.category && progress.brand && progress.model ? `/sell/${encodeURIComponent(progress.category.toLowerCase())}/${encodeURIComponent(progress.brand.toLowerCase())}/${encodeURIComponent(progress.model.toLowerCase())}/location` : '/sell',
      };
      
      const route = routes[stepNumber] || '/sell';
      router.push(route);
    }
  };

  return (
    <div className="flex justify-center mb-6 flex-wrap gap-2">
      {Object.entries(STEPS).map(([stepNum, step]) => {
        const stepNumber = parseInt(stepNum);
        const isActive = progress.currentStep >= stepNumber;
        const isCompleted = progress.currentStep > stepNumber;
        const canClick = stepNumber <= progress.currentStep;

        return (
          <div key={stepNumber} className="flex items-center">
            <button
              onClick={() => canClick && handleStepClick(stepNumber)}
              disabled={!canClick}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                isCompleted
                  ? "bg-[#F56A34] text-white hover:scale-110 cursor-pointer"
                  : isActive
                  ? "bg-[#F56A34] text-white ring-4 ring-[#F56A34]/30"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              } ${canClick ? 'hover:shadow-lg' : ''}`}
              title={canClick ? `Click to modify ${step.label}` : step.label}
            >
              {isCompleted ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                stepNumber === progress.currentStep ? stepNumber + 1 : stepNumber + 1
              )}
            </button>
            {stepNumber < Object.keys(STEPS).length - 1 && (
              <div
                className={`w-12 h-1 ${
                  isActive ? "bg-[#F56A34]" : "bg-gray-200"
                }`}
              ></div>
            )}
          </div>
        );
      })}
      <div className="w-full text-center mt-4">
        <div className="flex justify-center gap-4 text-xs text-gray-600">
          {Object.entries(STEPS).map(([stepNum, step]) => (
            <span key={stepNum} className={progress.currentStep >= parseInt(stepNum) ? 'text-[#F56A34] font-semibold' : ''}>
              {parseInt(stepNum) + 1}. {step.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
