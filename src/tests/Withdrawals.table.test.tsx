/** @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Withdrawals from '../app/admin/Withdrawals';

function makeWithdrawal(i: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `wd-${i}`,
    username: `user${i}`,
    amount: i * 100,
    method: 'BANK',
    walletAddress: `wallet-${i}`,
    status: 'Pending',
    requestedDate: new Date(2024, 0, i).toISOString(),
    ...overrides,
  };
}

const baseProps = {
  pendingWithdrawalCount: 0,
  financeLoading: false,
  handleExport: vi.fn(),
  handleApproveWithdrawal: vi.fn(),
  handleRejectWithdrawal: vi.fn(),
  formatCurrency: (v: number) => `$${v}`,
  formatDateTime: (d: string) => d,
};

describe('Withdrawals admin table', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders withdrawal rows with username and method', () => {
    const reqs = [makeWithdrawal(1), makeWithdrawal(2, { username: 'carol', method: 'USDT' })];
    render(<Withdrawals {...baseProps} withdrawalRequests={reqs} />);
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('carol')).toBeInTheDocument();
    expect(screen.getByText('USDT')).toBeInTheDocument();
  });

  it('shows pending count badge in the header', () => {
    render(<Withdrawals {...baseProps} pendingWithdrawalCount={5} withdrawalRequests={[]} />);
    expect(screen.getByText('5 Pending')).toBeInTheDocument();
  });

  it('shows Approve and Reject buttons only for Pending rows, not Approved rows', () => {
    const reqs = [
      makeWithdrawal(1, { status: 'Pending' }),
      makeWithdrawal(2, { status: 'Approved' }),
    ];
    render(<Withdrawals {...baseProps} withdrawalRequests={reqs} />);
    expect(screen.getAllByText('Approve')).toHaveLength(1);
    expect(screen.getAllByText('Reject')).toHaveLength(1);
  });

  it('calls handleApproveWithdrawal with the correct id when Approve is clicked', () => {
    const approveMock = vi.fn();
    render(
      <Withdrawals
        {...baseProps}
        handleApproveWithdrawal={approveMock}
        withdrawalRequests={[makeWithdrawal(7)]}
      />,
    );
    fireEvent.click(screen.getByText('Approve'));
    expect(approveMock).toHaveBeenCalledWith('wd-7');
  });

  it('calls handleRejectWithdrawal with the correct id when Reject is clicked', () => {
    const rejectMock = vi.fn();
    render(
      <Withdrawals
        {...baseProps}
        handleRejectWithdrawal={rejectMock}
        withdrawalRequests={[makeWithdrawal(3)]}
      />,
    );
    fireEvent.click(screen.getByText('Reject'));
    expect(rejectMock).toHaveBeenCalledWith('wd-3');
  });

  it('Previous page button is disabled on page 1', () => {
    render(<Withdrawals {...baseProps} withdrawalRequests={[makeWithdrawal(1)]} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  it('status filter hides rows that do not match the selected status', () => {
    const reqs = [
      makeWithdrawal(1, { status: 'Pending' }),
      makeWithdrawal(2, { username: 'dave', status: 'Approved' }),
    ];
    render(<Withdrawals {...baseProps} withdrawalRequests={reqs} />);

    const statusSelect = screen.getByRole('combobox');
    fireEvent.change(statusSelect, { target: { value: 'Pending' } });

    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.queryByText('dave')).not.toBeInTheDocument();
  });
});
