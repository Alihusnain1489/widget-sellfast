import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative max-h-[90vh] bg-gray-50 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-black/90">
                Sell Fast 
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-2xl">
                The most trusted marketplace for laptops, smartphones, tablets, smartwatches, and gaming devices. Get the best offers from verified buyers in minutes.
              </p>
              <Link href="#category">
                <button className="orange-gradient text-white px-8 py-4 mb-4 rounded-xl text-lg font-semibold hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl flex items-center gap-2">
                  Start Selling Now
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </Link>

              {/* Stats */}
            <div className="flex flex-wrap gap-8 pt-4">
              <div>
                <div className="text-2xl md:text-4xl font-bold text-gray-800">50K+</div>
                <div className="text-gray-600 text-sm md:text-base">Active Sellers</div>
              </div>
              <div>
                <div className="text-2xl md:text-4xl font-bold text-gray-800">$2M+</div>
                <div className="text-gray-600 text-sm md:text-base">Devices Sold</div>
              </div>
              <div>
                <div className="text-2xl md:text-4xl font-bold text-gray-800">4.9★</div>
                <div className="text-gray-600 text-sm md:text-base">User Rating</div>
              </div>
            </div>
            </div>
         
          {/* Right Image */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="/bg-2.jpg"
                alt="Happy seller with smartphone"
                className="w-full h-[400px] object-cover"
              />
            </div>
            {/* Decorative gradient overlay on image */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-orange-500/20 rounded-3xl pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
