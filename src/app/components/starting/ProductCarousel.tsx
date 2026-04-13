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

function getOptimizedCarouselImageUrl(rawUrl: string | null | undefined, width: number): string {
  if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
    return '';
  }

  try {
    const parsed = new URL(rawUrl);
    // Most catalog images use Unsplash; clamp payload for faster mobile rendering.
    if (!parsed.hostname.includes('images.unsplash.com')) {
      return rawUrl;
    }

    parsed.searchParams.set('auto', 'format');
    parsed.searchParams.set('fit', 'crop');
    parsed.searchParams.set('q', '70');
    parsed.searchParams.set('w', String(Math.max(240, Math.round(width))));
    return parsed.toString();
  } catch {
    return rawUrl;
  }
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
  const nextSlide = tasks[(index + 1) % tasks.length];
  const slideImageSmall = getOptimizedCarouselImageUrl(slide.image, 360);
  const slideImageLarge = getOptimizedCarouselImageUrl(slide.image, 720);
  const nextSlideImage = getOptimizedCarouselImageUrl(nextSlide?.image, 360);
  const MAX_DOTS = 24;
  const normalizedIndex = index % tasks.length;
  const isCompactDots = tasks.length > MAX_DOTS;
  const compactStart = isCompactDots
    ? Math.max(0, Math.min(normalizedIndex - Math.floor(MAX_DOTS / 2), tasks.length - MAX_DOTS))
    : 0;
  const dotIndices = isCompactDots
    ? Array.from({ length: MAX_DOTS }, (_, offset) => compactStart + offset)
    : Array.from({ length: tasks.length }, (_, i) => i);

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
              src={slideImageLarge || slide.image}
              srcSet={`${slideImageSmall || slide.image} 360w, ${slideImageLarge || slide.image} 720w`}
              sizes="(max-width: 640px) 82vw, 420px"
              alt={getPrimaryLabel(slide.product)}
              width={360}
              height={260}
              loading="eager"
              decoding="async"
              className="relative z-[1] max-h-[220px] sm:max-h-[260px] max-w-[280px] sm:max-w-[360px] w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            />
            {/* Warm up the next slide image so transitions feel instant on mobile. */}
            {nextSlide?.image ? (
              <img
                src={nextSlideImage || nextSlide.image}
                alt=""
                aria-hidden="true"
                width={1}
                height={1}
                loading="eager"
                decoding="async"
                className="absolute opacity-0 pointer-events-none w-0 h-0"
              />
            ) : null}
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
      <div className="flex justify-center gap-2 mt-4 flex-wrap">
        {dotIndices.map((i) => (
          <button
            key={i}
            onClick={() => onIndexChange(() => i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`w-2 h-2 rounded-full transition-colors ${i === normalizedIndex ? 'bg-[#00D9FF]' : 'bg-gray-600'}`}
          />
        ))}
      </div>
      {isCompactDots ? (
        <p className="mt-2 text-[11px] text-gray-400 text-center">{normalizedIndex + 1} / {tasks.length}</p>
      ) : null}
    </div>
  );
});
