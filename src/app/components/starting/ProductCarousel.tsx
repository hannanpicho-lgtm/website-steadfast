import { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselTask {
  id: string;
  product: string;
  price: number;
  image: string;
  rating: number;
}

interface ProductCarouselProps {
  tasks: CarouselTask[];
  index: number;
  onIndexChange: (updater: (prev: number) => number) => void;
}

function getPrimaryLabel(value: string | null | undefined, fallback = 'Product'): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  if (!normalized) return fallback;
  return normalized.split(',')[0];
}

export const ProductCarousel = memo(function ProductCarousel({ tasks, index, onIndexChange }: ProductCarouselProps) {
  if (tasks.length === 0) {
    return (
      <div className="bg-[#252d42] rounded-lg p-6 mb-6 border border-white/10 text-center text-gray-400">
        No active tasks are available right now.
      </div>
    );
  }

  const slide = tasks[index % tasks.length];

  return (
    <div className="bg-[#252d42] rounded-lg p-4 sm:p-6 mb-6 border border-[#00D9FF]/20 relative select-none">
      {/* Prev button */}
      <button
        onClick={() => onIndexChange(i => (i - 1 + tasks.length) % tasks.length)}
        aria-label="Previous slide"
        className="absolute left-1 sm:left-2 top-[40%] -translate-y-1/2 z-10 bg-[#1a1f2e]/80 hover:bg-[#252d42] backdrop-blur-sm border border-white/20 rounded-full p-1.5 shadow-md transition-all hover:scale-110"
      >
        <ChevronLeft size={20} className="text-gray-300" />
      </button>

      {/* Slide content */}
      <div className="text-center px-6 sm:px-8">
        {/* 3D Cinema Display Frame */}
        <div className="flex items-center justify-center mb-4 h-[260px] sm:h-[300px]">
          <div
            className="relative flex items-center justify-center w-[300px] sm:w-[380px] h-[240px] sm:h-[280px] rounded-xl"
            style={{
              background: 'linear-gradient(145deg, #1e2740, #151b2e)',
              border: '2px solid rgba(0, 217, 255, 0.15)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(0,217,255,0.06), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 6px rgba(0,0,0,0.3)',
              perspective: '800px',
              transform: 'perspective(800px) rotateX(1deg)',
            }}
          >
            {/* Screen bezel highlight */}
            <div className="absolute inset-[3px] rounded-lg overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 30%)' }} />
            {/* Product image — fills the display */}
            <img
              key={slide.id}
              src={slide.image}
              alt={getPrimaryLabel(slide.product)}
              width={360}
              height={260}
              loading="lazy"
              className="relative z-[1] max-h-[220px] sm:max-h-[260px] max-w-[280px] sm:max-w-[360px] w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            />
          </div>
        </div>
        <h3 className="text-base font-semibold text-white mb-2 line-clamp-2">{slide.product}</h3>
        <div className="flex items-center justify-center gap-1 mb-2">
          <span className="text-yellow-500">⭐</span>
          <span className="text-sm font-semibold text-gray-300">{slide.rating}</span>
        </div>
        <p className="text-xl font-bold text-white">Price: {slide.price.toFixed(2)} USD</p>
      </div>

      {/* Next button */}
      <button
        onClick={() => onIndexChange(i => (i + 1) % tasks.length)}
        aria-label="Next slide"
        className="absolute right-1 sm:right-2 top-[40%] -translate-y-1/2 z-10 bg-[#1a1f2e]/80 hover:bg-[#252d42] backdrop-blur-sm border border-white/20 rounded-full p-1.5 shadow-md transition-all hover:scale-110"
      >
        <ChevronRight size={20} className="text-gray-300" />
      </button>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {tasks.map((_, i) => (
          <button
            key={i}
            onClick={() => onIndexChange(() => i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`w-2 h-2 rounded-full transition-colors ${i === index ? 'bg-[#00D9FF]' : 'bg-gray-600'}`}
          />
        ))}
      </div>
    </div>
  );
});
