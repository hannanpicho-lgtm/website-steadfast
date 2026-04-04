/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Withdrawal from '@/app/pages/Withdrawal';

const toastSuccessMock = vi.fn();
const toastInfoMock = vi.fn();
const toastErrorMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('@/app/components/Header', () => ({ Header: () => <div>Header</div> }));
vi.mock('@/app/components/BottomNavigation', () => ({ BottomNavigation: () => <div>BottomNavigation</div> }));
vi.mock('@/app/components/LiveChatBox', () => ({ LiveChatBox: () => <div>LiveChatBox</div> }));
vi.mock('@/app/services/referralSystem', () => ({ getCurrentUsername: () => 'alice_01' }));
vi.mock('@/app/services/loginRedirect', () => ({
  buildLoginRedirectState: () => ({ authReason: 'session-expired' }),
}));
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe('Withdrawal page', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    toastSuccessMock.mockReset();
    toastInfoMock.mockReset();
    toastErrorMock.mockReset();

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ username: 'alice_01', balance: 100, holdAmount: 20 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ walletProfile: null }),
      });

    vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);
  });

  it('fills withdrawal amount with available balance when ALL is clicked', async () => {
    render(
      <MemoryRouter>
        <Withdrawal />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('80.00 USD')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'ALL' }));

    const amountInput = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(amountInput.value).toBe('80.00');
  });

  it('submits withdrawal request with expected payload and shows success toast', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'w1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ username: 'alice_01', balance: 100, holdAmount: 20 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ walletProfile: null }),
      });

    render(
      <MemoryRouter>
        <Withdrawal />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('80.00 USD')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Withdraw Account'), { target: { value: 'wallet-abc-123' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '25' } });
    fireEvent.change(screen.getByPlaceholderText('Transaction Password'), { target: { value: 'tx-pass-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Withdrawal request submitted.');
    });

    const requestCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/me/withdrawals/request'));
    expect(requestCall).toBeTruthy();

    const requestInit = requestCall?.[1] as RequestInit;
    expect(requestInit.method).toBe('POST');
    const parsedBody = JSON.parse(String(requestInit.body));
    expect(parsedBody).toEqual({
      amount: 25,
      walletAddress: 'wallet-abc-123',
      method: 'BANK',
      transactionPassword: 'tx-pass-01',
    });
  });
});
