// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  defaultRewardsConfig,
  type WorkdayReward,
  type ResetReward,
  type AccumulatedReward,
} from '../app/services/rewardsConfig';

// ─── defaultRewardsConfig shape ───────────────────────────────────────────────

describe('defaultRewardsConfig shape', () => {
  it('has 5 workday salary tiers', () => {
    expect(defaultRewardsConfig.workday).toHaveLength(5);
  });

  it('has 6 reset reward tiers', () => {
    expect(defaultRewardsConfig.reset).toHaveLength(6);
  });

  it('has 4 accumulated reward tiers', () => {
    expect(defaultRewardsConfig.accumulated).toHaveLength(4);
  });

  it('workday tiers have unique IDs', () => {
    const ids = defaultRewardsConfig.workday.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reset tiers have unique IDs', () => {
    const ids = defaultRewardsConfig.reset.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('accumulated tiers have unique IDs', () => {
    const ids = defaultRewardsConfig.accumulated.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── workday salary values ────────────────────────────────────────────────────

describe('defaultRewardsConfig.workday', () => {
  it('all tiers are enabled by default', () => {
    defaultRewardsConfig.workday.forEach((tier: WorkdayReward) => {
      expect(tier.enabled).toBe(true);
    });
  });

  it('salary values are positive numbers', () => {
    defaultRewardsConfig.workday.forEach((tier: WorkdayReward) => {
      expect(tier.salary).toBeGreaterThan(0);
    });
  });

  it('workday counts are strictly increasing', () => {
    const days = defaultRewardsConfig.workday.map((r) => r.days);
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBeGreaterThan(days[i - 1]);
    }
  });

  it('salary values are strictly increasing', () => {
    const salaries = defaultRewardsConfig.workday.map((r) => r.salary);
    for (let i = 1; i < salaries.length; i++) {
      expect(salaries[i]).toBeGreaterThan(salaries[i - 1]);
    }
  });

  it('1-day salary tier exists with value $204', () => {
    const oneDayTier = defaultRewardsConfig.workday.find((r) => r.days === 1);
    expect(oneDayTier).toBeDefined();
    expect(oneDayTier!.salary).toBe(204);
  });

  it('30-day salary tier exists with value $6120', () => {
    const thirtyDayTier = defaultRewardsConfig.workday.find((r) => r.days === 30);
    expect(thirtyDayTier).toBeDefined();
    expect(thirtyDayTier!.salary).toBe(6120);
  });
});

// ─── reset reward values ───────────────────────────────────────────────────────

describe('defaultRewardsConfig.reset', () => {
  it('all reset tiers are enabled by default', () => {
    defaultRewardsConfig.reset.forEach((tier: ResetReward) => {
      expect(tier.enabled).toBe(true);
    });
  });

  it('deposit requirements are strictly increasing', () => {
    const deposits = defaultRewardsConfig.reset.map((r) => r.deposit);
    for (let i = 1; i < deposits.length; i++) {
      expect(deposits[i]).toBeGreaterThan(deposits[i - 1]);
    }
  });

  it('reward amounts are strictly increasing', () => {
    const rewards = defaultRewardsConfig.reset.map((r) => r.reward);
    for (let i = 1; i < rewards.length; i++) {
      expect(rewards[i]).toBeGreaterThan(rewards[i - 1]);
    }
  });

  it('each tier has a non-empty label, color, and labelColor', () => {
    defaultRewardsConfig.reset.forEach((tier: ResetReward) => {
      expect(tier.label.length).toBeGreaterThan(0);
      expect(tier.color.length).toBeGreaterThan(0);
      expect(tier.labelColor.length).toBeGreaterThan(0);
    });
  });

  it('Crown tier has deposit $30 000 and reward $12 888', () => {
    const crown = defaultRewardsConfig.reset.find((r) => r.label === 'Crown');
    expect(crown).toBeDefined();
    expect(crown!.deposit).toBe(30000);
    expect(crown!.reward).toBe(12888);
  });
});

// ─── accumulated reward rates ──────────────────────────────────────────────────

describe('defaultRewardsConfig.accumulated', () => {
  it('all accumulated tiers are enabled by default', () => {
    defaultRewardsConfig.accumulated.forEach((tier: AccumulatedReward) => {
      expect(tier.enabled).toBe(true);
    });
  });

  it('rates are between 0 and 1 (exclusive)', () => {
    defaultRewardsConfig.accumulated.forEach((tier: AccumulatedReward) => {
      expect(tier.rate).toBeGreaterThan(0);
      expect(tier.rate).toBeLessThan(1);
    });
  });

  it('rates are strictly increasing', () => {
    const rates = defaultRewardsConfig.accumulated.map((r) => r.rate);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeGreaterThan(rates[i - 1]);
    }
  });

  it('minDeposit values are strictly increasing', () => {
    const mins = defaultRewardsConfig.accumulated.map((r) => r.minDeposit);
    for (let i = 1; i < mins.length; i++) {
      expect(mins[i]).toBeGreaterThan(mins[i - 1]);
    }
  });

  it('the highest tier has no maxDeposit (null)', () => {
    const sorted = [...defaultRewardsConfig.accumulated].sort((a, b) => a.minDeposit - b.minDeposit);
    expect(sorted[sorted.length - 1].maxDeposit).toBeNull();
  });
});

// ─── productSystem defaults ────────────────────────────────────────────────────

describe('defaultRewardsConfig.productSystem', () => {
  it('productsPerSet is 10', () => {
    expect(defaultRewardsConfig.productSystem.productsPerSet).toBe(10);
  });

  it('maxSetsPerDay is 5', () => {
    expect(defaultRewardsConfig.productSystem.maxSetsPerDay).toBe(5);
  });

  it('minTimePerProduct is a positive number', () => {
    expect(defaultRewardsConfig.productSystem.minTimePerProduct).toBeGreaterThan(0);
  });

  it('autoApproveCommission defaults to true', () => {
    expect(defaultRewardsConfig.productSystem.autoApproveCommission).toBe(true);
  });

  it('requireProductConfirmation defaults to true', () => {
    expect(defaultRewardsConfig.productSystem.requireProductConfirmation).toBe(true);
  });
});
