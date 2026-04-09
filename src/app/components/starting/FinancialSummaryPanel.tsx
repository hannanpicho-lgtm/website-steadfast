import { memo, type MouseEvent as ReactMouseEvent } from 'react';
import { Rocket, CreditCard, Snowflake } from 'lucide-react';

/* ─── Reusable financial-card wrapper with tilt + sheen FX ─── */
const FB_BASE = 'relative overflow-hidden rounded-xl border border-white/20 bg-white/12 p-3 backdrop-blur-sm transition-all duration-300 ease-out will-change-transform';
const FB_HOVER = 'hover:border-white/50 hover:shadow-[0_14px_28px_rgba(5,42,107,0.35)]';
const FB_GLOSS = 'before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(145deg,rgba(255,255,255,0.20)_0%,rgba(255,255,255,0.04)_45%,rgba(4,34,93,0.06)_100%)]';
const FB_RING = 'after:pointer-events-none after:absolute after:inset-[1px] after:rounded-[11px] after:border after:border-white/15 after:transition-all after:duration-300 hover:after:border-white/40';
const FB_SHEEN = 'pointer-events-none absolute inset-y-0 -left-[55%] w-[45%] bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.45)_48%,rgba(255,255,255,0)_100%)] opacity-0';

function fbMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
  if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return;
  const block = event.currentTarget;
  const rect = block.getBoundingClientRect();
  const tiltMultiplier = Number(block.dataset.tiltMult ?? 1);
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  const rotateY = ((offsetX / rect.width) - 0.5) * (6 * tiltMultiplier);
  const rotateX = (0.5 - (offsetY / rect.height)) * (6 * tiltMultiplier);
  block.style.transform = `perspective(960px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(0)`;
}

function fbMouseLeave(event: ReactMouseEvent<HTMLDivElement>) {
  event.currentTarget.style.transform = 'perspective(960px) rotateX(0deg) rotateY(0deg) translateZ(0)';
}

function fbMouseEnter(event: ReactMouseEvent<HTMLDivElement>) {
  const block = event.currentTarget;
  if (block.dataset.sheenPlayed === 'true') return;
  block.dataset.sheenPlayed = 'true';
  const sheen = block.querySelector<HTMLElement>('[data-financial-sheen]');
  if (!sheen) return;
  sheen.style.transition = 'none';
  sheen.style.transform = 'translateX(-135%)';
  sheen.style.opacity = '0';
  requestAnimationFrame(() => {
    window.setTimeout(() => {
      sheen.style.transition = 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease';
      sheen.style.opacity = '1';
      sheen.style.transform = 'translateX(235%)';
      window.setTimeout(() => { sheen.style.opacity = '0'; }, 620);
    }, 120);
  });
}

function FinancialBlock({ tiltMult = 1, className = '', children }: { tiltMult?: number; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`${FB_BASE} ${FB_HOVER} ${FB_GLOSS} ${FB_RING} ${className}`}
      onMouseMove={fbMouseMove}
      onMouseLeave={fbMouseLeave}
      onMouseEnter={fbMouseEnter}
      data-tilt-mult={tiltMult}
    >
      <span data-financial-sheen className={FB_SHEEN} />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

export interface FinancialSummaryProps {
  todayCommission: number;
  isFrozen: boolean;
  availableBalance: number;
  frozenBalance: number;
  holdAmount: number;
  frozenUpholdAmount: number;
  totalBalance: number;
  afterSettlement: number;
  luckyBonus: number;
  isPremiumActive: boolean;
  premiumDisplayName: string;
  premiumCommissionRate: number;
  earnedPremiumProfit: number;
  projectedPremiumProfit: number;
}

export const FinancialSummaryPanel = memo(function FinancialSummaryPanel(props: FinancialSummaryProps) {
  const {
    todayCommission, isFrozen, availableBalance, frozenBalance,
    holdAmount, frozenUpholdAmount, totalBalance, afterSettlement,
    luckyBonus, isPremiumActive, premiumDisplayName, premiumCommissionRate,
    earnedPremiumProfit, projectedPremiumProfit,
  } = props;

  return (
    <div className="relative mb-6 overflow-hidden rounded-[22px] bg-[linear-gradient(145deg,#0b72e7_0%,#0d92f4_52%,#19c0ff_100%)] text-white shadow-[0_16px_36px_rgba(6,58,145,0.22)]">
      <div className="absolute inset-x-0 top-0 h-20 bg-white/10 blur-3xl" />
      <div className="relative p-4 md:p-5">
        <div className="mx-auto max-w-md text-center">
          <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/90">
            Financial Summary
          </div>

          <FinancialBlock tiltMult={1.1} className="mt-3 px-4 py-4">
            <Rocket className="mx-auto" size={26} />
            <h3 className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Today's Commission</h3>
            <p className="mt-2 text-3xl font-bold leading-none">{todayCommission.toFixed(2)} USD</p>
            <p className="mt-2 text-xs text-white/80">Updated from completed submissions in the current working day.</p>
            {isFrozen && (
              <p className="mt-1 text-[11px] text-amber-100/90">Includes premium commission profit shown in settlement details.</p>
            )}
          </FinancialBlock>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <FinancialBlock>
            <div className="flex flex-col items-center text-center gap-2 md:flex-row md:text-left md:gap-3">
              <div className="rounded-full bg-white/15 p-1.5 shrink-0">
                <CreditCard size={15} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  {isFrozen ? 'Current Balance' : 'Available Balance'}
                </p>
                <p className="mt-1 text-xl font-bold">
                  {(isFrozen ? Math.max(0, frozenBalance) : availableBalance).toFixed(2)} USD
                </p>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-white/75 md:text-left">
              {isFrozen ? 'Balance held before premium settlement.' : 'Funds currently available for new submissions.'}
            </p>
          </FinancialBlock>

          <FinancialBlock>
            <div className="flex flex-col items-center text-center gap-2 md:flex-row md:text-left md:gap-3">
              <div className="rounded-full bg-white/15 p-1.5 shrink-0">
                <Snowflake size={15} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Hold Amount</p>
                <p className={`mt-1 text-xl font-bold ${isFrozen ? 'text-[#ffe1e1]' : 'text-white'}`}>
                  {isFrozen && frozenUpholdAmount > 0 ? '-' : ''}{(isFrozen ? frozenUpholdAmount : holdAmount).toFixed(2)} USD
                </p>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-white/75 md:text-left">
              {isFrozen ? 'Reserved for the premium settlement requirement.' : 'Amount currently reserved from the working balance.'}
            </p>
          </FinancialBlock>
        </div>

        <FinancialBlock tiltMult={1.2} className="mt-3 rounded-[18px] after:rounded-[15px] hover:border-white/60 hover:shadow-[0_20px_34px_rgba(5,42,107,0.46)] before:bg-[linear-gradient(145deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0.06)_45%,rgba(4,34,93,0.08)_100%)] hover:after:border-white/45 p-4">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">Total Account Balance</p>
          <p className="mt-1.5 text-center text-[1.75rem] font-bold">{totalBalance.toFixed(2)} USD</p>
          <p className="mt-1.5 text-center text-[11px] text-white/75">
            {isFrozen
              ? 'Includes pre-freeze balance, current hold amount, and earned premium profit.'
              : 'Reflects the active account balance across the current task cycle.'}
          </p>
        </FinancialBlock>

        {isFrozen && (
          <div className="mt-3 rounded-[18px] border border-amber-300/30 bg-amber-500/10 p-3">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">Before / Hold / After</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-white/15 bg-white/10 p-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/70">Before Freeze</p>
                <p className="mt-1 text-sm font-bold text-white">{Math.max(0, frozenBalance).toFixed(2)} USD</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/70">Premium Hold</p>
                <p className="mt-1 text-sm font-bold text-[#ffe1e1]">{frozenUpholdAmount > 0 ? '-' : ''}{frozenUpholdAmount.toFixed(2)} USD</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/70">After Settlement</p>
                <p className="mt-1 text-sm font-bold text-[#b8ffd4]">{afterSettlement.toFixed(2)} USD</p>
              </div>
            </div>
          </div>
        )}

        {isPremiumActive && (
          <FinancialBlock className="mt-3">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">Premium Estimated Profit</p>
              <p className="mt-1 text-xl font-bold text-[#b8ffd4]">
                {(earnedPremiumProfit > 0 ? earnedPremiumProfit : projectedPremiumProfit).toFixed(2)} USD
              </p>
              <p className="mt-1.5 text-[11px] text-white/75">
                {earnedPremiumProfit > 0
                  ? 'Earned premium commission from completed premium tasks.'
                  : `Projected from ${premiumDisplayName} at ${premiumCommissionRate.toFixed(2)}% rate.`}
              </p>
            </div>
          </FinancialBlock>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <FinancialBlock className="bg-[#083b93]/35 border-white/15 hover:border-white/45 before:bg-[linear-gradient(145deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.03)_45%,rgba(4,34,93,0.10)_100%)] after:border-white/10 hover:after:border-white/30">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Lucky Bonus</p>
              <p className="mt-1 text-xl font-bold">{luckyBonus.toFixed(2)} USD</p>
              <p className="mt-1.5 text-[11px] text-white/75">Bonus value currently carried on the account.</p>
            </div>
          </FinancialBlock>
          <FinancialBlock className="bg-[#083b93]/35 border-white/15 hover:border-white/45 before:bg-[linear-gradient(145deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.03)_45%,rgba(4,34,93,0.10)_100%)] after:border-white/10 hover:after:border-white/30">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Working Status</p>
              <p className="mt-1 text-xl font-bold">{isFrozen ? 'Settlement Review' : 'Ready To Submit'}</p>
              <p className="mt-1.5 text-[11px] text-white/75">
                {isFrozen ? 'Submission remains paused until the premium requirement is cleared.' : 'The account can continue processing eligible tasks.'}
              </p>
            </div>
          </FinancialBlock>
        </div>
      </div>
    </div>
  );
});
