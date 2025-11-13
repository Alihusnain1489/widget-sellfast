import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface ListingProgress {
  category?: string
  categoryId?: string
  brand?: string
  brandId?: string
  model?: string
  modelId?: string
  specs?: Record<string, string>
  location?: string
  latitude?: number
  longitude?: number
  condition?: string
  batteryCycles?: string
  description?: string
  images?: string[]
  currentStep: number
}

interface ListingStore {
  progress: ListingProgress
  setProgress: (data: Partial<ListingProgress>) => void
  clearStep: (stepNumber: number) => void
  resetProgress: () => void
  setStep: (step: number) => void
}

const initialProgress: ListingProgress = {
  currentStep: 0,
}

export const useListingStore = create<ListingStore>()(
  persist(
    (set) => ({
      progress: initialProgress,
      setProgress: (data) =>
        set((state) => ({
          progress: {
            ...state.progress,
            ...data,
          },
        })),
      clearStep: (stepNumber) =>
        set((state) => {
          const updated = { ...state.progress }
          
          if (stepNumber <= 0) {
            delete updated.category
            delete updated.categoryId
          }
          if (stepNumber <= 1) {
            delete updated.brand
            delete updated.brandId
          }
          if (stepNumber <= 2) {
            delete updated.model
            delete updated.modelId
          }
          if (stepNumber <= 3) {
            delete updated.specs
          }
          if (stepNumber <= 4) {
            delete updated.condition
            delete updated.batteryCycles
            delete updated.description
          }
          if (stepNumber <= 5) {
            delete updated.location
            delete updated.latitude
            delete updated.longitude
          }
          if (stepNumber <= 6) {
            delete updated.images
          }
          
          updated.currentStep = stepNumber
          return { progress: updated }
        }),
      resetProgress: () =>
        set({
          progress: initialProgress,
        }),
      setStep: (step) =>
        set((state) => ({
          progress: {
            ...state.progress,
            currentStep: step,
          },
        })),
    }),
    {
      name: 'listing-widget-progress',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

