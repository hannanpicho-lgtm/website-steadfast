import { usePlatformMode, type PlatformMode } from '../hooks/usePlatformMode';

const BANNER_STYLES: Record<Exclude<PlatformMode, 'active'>, { bg: string; text: string; icon: string }> = {
  readonly: {
    bg: 'bg-amber-500/90 backdrop-blur-sm',
    text: "We're performing a quick system update. Your funds are safe — transactions will resume shortly.",
    icon: '⏳',
  },
  shutdown: {
    bg: 'bg-red-600/90 backdrop-blur-sm',
    text: 'Scheduled maintenance in progress. Your account and funds are fully secure.',
    icon: '🔧',
  },
};

export default function PlatformModeBanner() {
  const { mode, graceActive, graceRemainingMs } = usePlatformMode();

  if (mode === 'active') return null;

  const style = BANNER_STYLES[mode];
  const graceSeconds = Math.ceil(graceRemainingMs / 1000);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] ${style.bg} text-white text-center py-2 px-4 text-sm font-medium shadow-lg`}
      role="alert"
      aria-live="assertive"
    >
      <span className="mr-2">{style.icon}</span>
      {style.text}
      {mode === 'readonly' && graceActive && graceSeconds > 0 && (
        <span className="ml-2 opacity-80">Estimated wait: ~{graceSeconds}s</span>
      )}
    </div>
  );
}
