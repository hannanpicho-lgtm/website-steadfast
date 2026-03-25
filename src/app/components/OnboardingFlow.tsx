import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Rocket, CreditCard, Trophy, CheckCircle2, Zap, Star } from 'lucide-react';
import { getCurrentUsername } from '../services/referralSystem';
import logoImage from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';

const ONBOARDING_KEY = 'steadfast:onboarded:v1';

function hasCompletedOnboarding(username: string): boolean {
  try {
    return localStorage.getItem(`${ONBOARDING_KEY}:${username}`) === 'true';
  } catch {
    return true;
  }
}

function markOnboardingComplete(username: string): void {
  try {
    localStorage.setItem(`${ONBOARDING_KEY}:${username}`, 'true');
  } catch {
    // ignore
  }
}

const steps = [
  {
    id: 'welcome',
    icon: Star,
    accentColor: '#00D9FF',
    glowColor: 'rgba(0,217,255,0.25)',
    title: 'Welcome to Steadfast Digital',
    subtitle: 'A performance-driven platform built to grow your revenue',
    body: "You've joined a data-led digital marketing ecosystem trusted by top brands. This quick tour will help you get the most out of your account — it only takes a minute.",
    cta: "Let's Begin",
  },
  {
    id: 'tasks',
    icon: Zap,
    accentColor: '#a78bfa',
    glowColor: 'rgba(167,139,250,0.25)',
    title: 'Complete Tasks & Earn',
    subtitle: 'Your primary income source on the platform',
    body: "Each day you'll receive a set of review tasks from our client brands. Completing each task earns a commission. Your daily earnings accumulate in your balance — ready to withdraw when you meet the threshold.",
    points: ['Browse your daily task queue', 'Submit each review to earn commission', 'Completed sets unlock bonus rewards'],
    cta: 'Got It',
  },
  {
    id: 'deposit',
    icon: CreditCard,
    accentColor: '#34d399',
    glowColor: 'rgba(52,211,153,0.25)',
    title: 'Fund & Withdraw Freely',
    subtitle: 'Full control over your account balance',
    body: "Deposit funds to unlock higher-tier task sets with larger commissions. Withdrawals are processed once your balance meets the minimum threshold. Your earnings are yours — transfer out whenever you're ready.",
    points: ['Minimum deposit unlocks your first task set', 'Withdrawals are reviewed within 24 hours', 'Transaction password keeps your funds secure'],
    cta: 'Understood',
  },
  {
    id: 'vip',
    icon: Trophy,
    accentColor: '#fbbf24',
    glowColor: 'rgba(251,191,36,0.25)',
    title: 'Climb the VIP Tiers',
    subtitle: 'Higher level = higher commission per task',
    body: "Steadfast operates a tiered VIP system. As your deposit level grows, you advance through ranks — each granting you more tasks per day and a higher commission rate per completed task. The best deal packages multiply your earning potential significantly.",
    points: ['VIP 1 → VIP 6 and beyond', 'Special "Best Deal" reward packages', 'Premium tasks unlock at elite tiers'],
    cta: 'Exciting!',
  },
  {
    id: 'ready',
    icon: Rocket,
    accentColor: '#00D9FF',
    glowColor: 'rgba(0,217,255,0.25)',
    title: "You're All Set!",
    subtitle: 'Start earning from your very first task',
    body: "Your account is ready. Head to your task dashboard to begin. Remember: completing your full daily set maximises your commission. If you need help at any time, our live support team is standing by.",
    cta: 'Start Earning',
  },
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const Icon = current.icon;

  function navigate(dir: 'forward' | 'back') {
    if (isAnimating) return;
    setAnimDir(dir);
    setIsAnimating(true);
    setTimeout(() => {
      if (dir === 'forward') {
        setStep((s) => Math.min(s + 1, steps.length - 1));
      } else {
        setStep((s) => Math.max(s - 1, 0));
      }
      setIsAnimating(false);
    }, 200);
  }

  function handleNext() {
    if (isLast) {
      const username = getCurrentUsername();
      if (username) markOnboardingComplete(username);
      onComplete();
    } else {
      navigate('forward');
    }
  }

  function handleSkip() {
    const username = getCurrentUsername();
    if (username) markOnboardingComplete(username);
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(8,15,28,0.85)', backdropFilter: 'blur(8px)' }}>
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0d1b2e 0%, #111d30 60%, #0a1525 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px ${current.glowColor}`,
        }}
      >
        {/* Decorative top bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${current.accentColor}, transparent)`, transition: 'background 0.4s ease' }}
        />

        {/* Skip button */}
        {!isLast && (
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-1.5 rounded-full transition-all duration-200 hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            aria-label="Skip onboarding"
          >
            <X size={18} />
          </button>
        )}

        {/* Content */}
        <div
          className="px-7 pt-8 pb-7"
          style={{
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating ? (animDir === 'forward' ? 'translateX(12px)' : 'translateX(-12px)') : 'translateX(0)',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
          }}
        >
          {/* Logo on welcome step, icon otherwise */}
          {step === 0 ? (
            <div className="flex flex-col items-center mb-5">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: current.accentColor }} />
                <img src={logoImage} alt="Steadfast Digital" className="relative z-10 w-16 h-16 object-contain" />
              </div>
              <span className="text-[10px] tracking-[0.35em] font-bold uppercase" style={{ color: current.accentColor }}>STEADFAST DIGITAL</span>
            </div>
          ) : (
            <div className="flex flex-col items-center mb-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{
                  background: `linear-gradient(135deg, ${current.accentColor}22, ${current.accentColor}11)`,
                  border: `1px solid ${current.accentColor}30`,
                  boxShadow: `0 0 24px ${current.glowColor}`,
                }}
              >
                <Icon size={24} style={{ color: current.accentColor }} strokeWidth={1.8} />
              </div>
            </div>
          )}

          <h2 className="text-center text-[1.45rem] font-extrabold tracking-tight text-white mb-1.5 leading-tight">
            {current.title}
          </h2>
          <p className="text-center text-sm font-medium mb-4" style={{ color: current.accentColor }}>
            {current.subtitle}
          </p>
          <p className="text-center text-sm leading-relaxed text-white/65 mb-5">
            {current.body}
          </p>

          {current.points && (
            <ul className="mb-5 space-y-2.5">
              {current.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: current.accentColor }} />
                  <span className="text-sm text-white/75 leading-snug">{point}</span>
                </li>
              ))}
            </ul>
          )}

          {/* CTA Button */}
          <button
            onClick={handleNext}
            className="w-full rounded-xl py-3.5 font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${current.accentColor}, ${current.accentColor}cc)`,
              color: step === 0 || step === steps.length - 1 ? '#0a1525' : '#0a1525',
              boxShadow: `0 4px 20px ${current.glowColor}, 0 1px 0 rgba(255,255,255,0.15) inset`,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = ''; }}
          >
            {current.cta}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>

        {/* Footer: progress + back nav */}
        <div className="px-7 pb-6 flex items-center justify-between">
          {/* Back button */}
          <button
            onClick={() => navigate('back')}
            disabled={step === 0}
            className="flex items-center gap-1 text-xs font-medium transition-all duration-200"
            style={{ color: step === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.45)', cursor: step === 0 ? 'default' : 'pointer' }}
          >
            <ChevronLeft size={14} />
            Back
          </button>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div
                key={s.id}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? '20px' : '6px',
                  height: '6px',
                  background: i === step ? current.accentColor : i < step ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </div>

          {/* Step counter */}
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {step + 1} / {steps.length}
          </span>
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const username = getCurrentUsername();
    if (!username) return;
    if (!hasCompletedOnboarding(username)) {
      // Small delay so the page finishes rendering first
      const timer = setTimeout(() => setShouldShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function completeOnboarding() {
    setShouldShow(false);
  }

  return { shouldShow, completeOnboarding };
}
