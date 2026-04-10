/** @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock virtual scrolling to render all rows in JSDOM (zero-size container)
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (opts: { count: number; estimateSize: () => number }) => {
    const size = opts.estimateSize();
    return {
      getVirtualItems: () =>
        Array.from({ length: opts.count }, (_, i) => ({
          index: i,
          start: i * size,
          end: (i + 1) * size,
          size,
          key: i,
        })),
      getTotalSize: () => opts.count * size,
      measureElement: vi.fn(),
    };
  },
}));

import Transactions from '../app/admin/Transactions';

function makeTx(i: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `tx-${i}`,
    username: `user${i}`,
    amount: i * 50,
    type: 'Deposit',
    method: 'Bank',
    status: 'Completed',
    date: new Date(2024, 0, i + 1).toISOString(),
    txHash: `hash${i}`,
    ...overrides,
  };
}

const baseProps = {
  financeLoading: false,
  handleExport: vi.fn(),
  formatCurrency: (v: number) => `$${v}`,
  formatDateTime: (d: string) => d,
};

describe('Transactions admin table', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders transaction rows with username and type', () => {
    const txs = [makeTx(1), makeTx(2, { username: 'bob', type: 'Withdrawal' })];
    render(<Transactions {...baseProps} transactions={txs} />);
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    // 'Withdrawal' appears in both the type <option> and the row <span>
    expect(screen.getAllByText('Withdrawal').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty-state message when no transactions provided', () => {
    render(<Transactions {...baseProps} transactions={[]} />);
    expect(screen.getByText('No transactions recorded yet.')).toBeInTheDocument();
  });

  it('type dropdown filters out rows that do not match the selected type', () => {
    const txs = [
      makeTx(1, { username: 'alice', type: 'Deposit' }),
      makeTx(2, { username: 'bob', type: 'Withdrawal' }),
    ];
    render(<Transactions {...baseProps} transactions={txs} />);

    // First combobox is the type select, second is status
    const [typeSelect] = screen.getAllByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'withdrawal' } });

    expect(screen.queryByText('alice')).not.toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('renders all rows without pagination (virtual scroll)', () => {
    const txs = Array.from({ length: 16 }, (_, i) => makeTx(i + 1));
    render(<Transactions {...baseProps} transactions={txs} />);
    // All 16 rows are visible in virtual scroll (no pagination)
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('user16')).toBeInTheDocument();
  });
});
