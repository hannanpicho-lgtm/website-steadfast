/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Withdrawal from '@/app/pages/Withdrawal';

vi.mock('@/app/components/Header', () => ({ Header: () => <div>Header</div> }));
vi.mock('@/app/components/BottomNavigation', () => ({ BottomNavigation: () => <div>BottomNavigation</div> }));
vi.mock('@/app/components/LiveChatBox', () => ({ LiveChatBox: () => <div>LiveChatBox</div> }));
vi.mock('@/app/services/referralSystem', () => ({ getCurrentUsername: () => 'alice_01' }));
vi.mock('@/app/services/loginRedirect', () => ({
  buildLoginRedirectState: () => ({ authReason: 'session-expired' }),
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Withdrawal page', () => {
  beforeEach(() => {
    const fetchMock = vi.fn()
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
});
