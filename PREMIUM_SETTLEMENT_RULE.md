# Premium Settlement Rule (PSR-001)

**Document Date**: March 25, 2026  
**Status**: ACTIVE - Production Rule  
**Version**: 1.0

---

## Overview

This rule defines the exact financial settlement customers receive when completing a premium product assignment. It ensures transparency, honors customer investment, and guarantees earned profit is retained.

---

## The Rule

When a customer completes all premium tasks and the account unfreezes, the final settlement is calculated as:

### Final Settlement Balance
```
finalBalance = preFreezeBalance + holdAmount + premiumCommissionEarned
```

### Final Settlement Commission  
```
finalCommission = baseCommissionBeforeFreeze + premiumCommissionEarned
```

---

## Principles

1. **Pre-Freeze Balance is Preserved**: The customer's balance at the moment premium was assigned is restored in full.
2. **Hold Amount is Returned**: The top-up/reserve amount the customer invested is released and added back to their account.
3. **All Earned Premium Commission is Retained**: Every dollar of premium commission earned during the assignment persists in the final settlement.
4. **No Daily Resets During Premium**: Commission earned during premium assignment does not get wiped by calendar day boundaries.
5. **Transparency**: The frozen state display accurately reflects what the customer will receive after settlement.

---

## Real Example (Production Case)

**Customer**: sixkilla3  
**Before Premium Assignment:**
- Balance: $1,248.98
- Commission: $28.46

**After Premium Assignment Triggered (Frozen State):**
- Pre-Freeze Balance: $954.92 (balance after premium bundle deduction)
- Hold Amount: $294.06 (premium investment/top-up required)
- Premium Commission Earned: $62.45 (from completed bundled tasks)
- **Displayed Frozen Total Balance**: $1,311.43
- **Displayed Frozen Commission**: $90.91

**After Premium Completion (Unfrozen Settlement):**
- Final Balance: $954.92 + $294.06 + $62.45 = **$1,311.43** ✓
- Final Commission: $28.46 + $62.45 = **$90.91** ✓
- Hold Amount: $0 (released and consolidated)

**Customer Benefit from Premium**:
- Kept pre-freeze balance: $954.92
- Earned premium commission: $62.45 (10X regular rate)
- Recovered investment: $294.06
- **Net profit from premium**: $62.45
- **Trustworthiness**: Frozen promise = Final settlement ✓

---

## Implementation Guarantee

This rule is enforced at three critical points:

1. **Frozen Display** (Frontend - Starting.tsx):
   - Shows: `preFreezeBalance + holdAmount + premiumCommissionEarned`
   - Ensures customer sees honest settlement expectation

2. **Completion Settlement** (Backend - completePremiumTaskForUser):
   - When premium completes: `balance += holdAmount`
   - Consolidates hold into final balance
   - Releases hold to zero

3. **Daily Commission Preservation**:
   - No daily resets of `todayCommission` during or after premium
   - Commission earned during premium persists permanently

---

## Changes Made

**Commit be84372e** (v124): Removed daily commission reset rule
- Ensures earned premium commission is not wiped by calendar boundaries
- `todayCommission` now accumulates permanently

**Commit e8e83fcf** (v125): Added hold consolidation at completion
- When premium completes: `balance = balance + holdAmount`
- Ensures final settlement matches frozen promise

---

## Validation Checklist

Before marking premium settlement as complete, verify:

- [ ] `finalBalance = preFreezeBalance + holdAmount + premissionCommissionEarned`
- [ ] `finalCommission = baseCommission + premiumCommissionEarned`
- [ ] `holdAmount = 0` after settlement
- [ ] `isFrozen = false` after settlement
- [ ] `activePremium = null` after settlement
- [ ] Customer's frozen display total matches final balance

---

## Support

Any premiums not matching this rule are considered a settlement failure and must be escalated for manual admin review.

