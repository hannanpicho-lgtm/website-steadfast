/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinancialSummaryPanel, type FinancialSummaryProps } from '@/app/components/starting/FinancialSummaryPanel';

const baseProps: FinancialSummaryProps = {
  todayCommission: 12.50,
  isFrozen: false,
  availableBalance: 500.00,
  frozenBalance: 0,
  holdAmount: 25.00,
  frozenUpholdAmount: 0,
  totalBalance: 525.00,
  afterSettlement: 0,
  luckyBonus: 3.00,
  isPremiumActive: false,
  premiumDisplayName: '',
  premiumCommissionRate: 0,
  earnedPremiumProfit: 0,
  projectedPremiumProfit: 0,
};

// Mock useAnimatedNumber to return immediate formatted strings
vi.mock('@/app/hooks/useAnimatedNumber', () => ({
  useAnimatedNumber: (value: number, opts?: { suffix?: string }) =>
    `${value.toFixed(2)}${opts?.suffix ?? ''}`,
}));

describe('FinancialSummaryPanel', () => {
  it('renders Financial Summary badge', () => {
    render(<FinancialSummaryPanel {...baseProps} />);
    expect(screen.getByText('Financial Summary')).toBeTruthy();
  });

  it('renders today commission value', () => {
    render(<FinancialSummaryPanel {...baseProps} />);
    expect(screen.getByText("Today's Commission")).toBeTruthy();
    expect(screen.getByText('12.50 USD')).toBeTruthy();
  });

  it('renders available balance in unfrozen state', () => {
    render(<FinancialSummaryPanel {...baseProps} />);
    expect(screen.getByText('Available Balance')).toBeTruthy();
    expect(screen.getByText('500.00 USD')).toBeTruthy();
  });

  it('renders current balance label when frozen', () => {
    render(<FinancialSummaryPanel {...baseProps} isFrozen frozenBalance={450} />);
    expect(screen.getByText('Current Balance')).toBeTruthy();
  });

  it('renders hold amount', () => {
    render(<FinancialSummaryPanel {...baseProps} />);
    expect(screen.getByText('Hold Amount')).toBeTruthy();
    expect(screen.getByText('25.00 USD')).toBeTruthy();
  });

  it('renders total account balance', () => {
    render(<FinancialSummaryPanel {...baseProps} />);
    expect(screen.getByText('Total Account Balance')).toBeTruthy();
    expect(screen.getByText('525.00 USD')).toBeTruthy();
  });

  it('renders lucky bonus', () => {
    render(<FinancialSummaryPanel {...baseProps} />);
    expect(screen.getByText('Lucky Bonus')).toBeTruthy();
    expect(screen.getByText('3.00 USD')).toBeTruthy();
  });

  it('shows "Ready To Submit" when not frozen', () => {
    render(<FinancialSummaryPanel {...baseProps} />);
    expect(screen.getByText('Ready To Submit')).toBeTruthy();
  });

  it('shows "Settlement Review" when frozen', () => {
    render(<FinancialSummaryPanel {...baseProps} isFrozen />);
    expect(screen.getByText('Settlement Review')).toBeTruthy();
  });

  it('renders before/hold/after section when frozen', () => {
    render(
      <FinancialSummaryPanel
        {...baseProps}
        isFrozen
        frozenBalance={400}
        frozenUpholdAmount={100}
        afterSettlement={300}
      />
    );
    expect(screen.getByText('Before / Hold / After')).toBeTruthy();
    expect(screen.getByText('Before')).toBeTruthy();
    expect(screen.getByText('Hold')).toBeTruthy();
    expect(screen.getByText('After')).toBeTruthy();
  });

  it('does not render premium section when inactive', () => {
    render(<FinancialSummaryPanel {...baseProps} />);
    expect(screen.queryByText('Premium Estimated Profit')).toBeFalsy();
  });

  it('renders premium section when active', () => {
    render(
      <FinancialSummaryPanel
        {...baseProps}
        isPremiumActive
        premiumDisplayName="Gold Bundle"
        premiumCommissionRate={5.5}
        projectedPremiumProfit={27.50}
      />
    );
    expect(screen.getByText('Premium Estimated Profit')).toBeTruthy();
    expect(screen.getByText('27.50 USD')).toBeTruthy();
  });
});
