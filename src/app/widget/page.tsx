'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const WidgetContent = dynamic(() => import('@/components/widget/WidgetContent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#F56A34] border-t-transparent"></div>
        <p className="mt-4 text-gray-600 font-medium">Loading widget...</p>
      </div>
    </div>
  ),
})

export default function WidgetPage() {
  return (
    <div className="w-full h-full bg-gray-50" style={{ height: '100vh', overflow: 'hidden' }}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#F56A34] border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading widget...</p>
          </div>
        </div>
      }>
        <WidgetContent />
      </Suspense>
    </div>
  )
}

