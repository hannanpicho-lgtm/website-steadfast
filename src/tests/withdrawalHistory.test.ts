// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import WithdrawalHistory from '../app/pages/WithdrawalHistory';

vi.mock('../app/components/Header', () => ({
  Header: ({ onContactClick }: { onContactClick: () => void }) =>
    React.createElement('button', { onClick: onContactClick }, 'Header'),
}));

vi.mock('../app/components/BottomNavigation', () => ({
  BottomNavigation: () => React.createElement('div', null, 'BottomNavigation'),
}));

vi.mock('../app/components/LiveChatBox', () => ({
  LiveChatBox: () => React.createElement('div', null, 'LiveChatBox'),
}));

vi.mock('../app/services/referralSystem', () => ({
  getCurrentUsername: () => 'demo_user',
}));

vi.mock('../app/services/loginRedirect', () => ({
  buildLoginRedirectState: () => ({ from: '/withdrawal-history' }),
}));

vi.mock('@utils/supabase/info', () => ({
  projectId: 'test-project',
  publicAnonKey: 'test-anon-key',
}));

const toastErrorMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

type WithdrawalRecord = {
  id: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedDate: string;
  method: string;
  walletAddress: string;
  txHash: string;
};

const makeRecord = (overrides: Partial<WithdrawalRecord>): WithdrawalRecord => ({
  id: crypto.randomUUID(),
  amount: 100,
  status: 'Pending',
  requestedDate: '2026-03-22T06:00:00.000Z',
  method: 'USDT',
  walletAddress: 'TRX_TEST_ACCOUNT',
  txHash: '0xabc123',
  ...overrides,
});

const fixtureWithdrawals: WithdrawalRecord[] = [
  makeRecord({ id: 'w1', amount: 120, status: 'Pending', walletAddress: 'TRX_PENDING_111' }),
  makeRecord({ id: 'w2', amount: 250, status: 'Approved', walletAddress: 'TRX_APPROVED_222' }),
  makeRecord({ id: 'w3', amount: 75, status: 'Rejected', walletAddress: 'TRX_REJECTED_333' }),
];

const fetchMock = vi.fn();

function responseJson(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function waitFor(assertion: () => void, timeoutMs = 3000) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - start > timeoutMs) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find(
    (node) => node.textContent?.trim() === label,
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button with label "${label}" not found`);
  }

  return button;
}

describe('WithdrawalHistory tab filtering', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    // Enable React act environment in Vitest jsdom for deterministic updates.
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    fetchMock.mockReset();
    toastErrorMock.mockReset();
    fetchMock.mockResolvedValue(responseJson(fixtureWithdrawals));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/withdrawal-history'] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, {
              path: '/withdrawal-history',
              element: React.createElement(WithdrawalHistory),
            }),
          ),
        ),
      );
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('shows Reviewing by default, then Success and Reject after tab clicks', async () => {
    await waitFor(() => {
      expect(container.textContent).toContain('$120.00');
    });

    // Default tab (Reviewing -> Pending)
    expect(container.textContent).toContain('$120.00');
    expect(container.textContent).not.toContain('$250.00');
    expect(container.textContent).not.toContain('$75.00');

    // Success tab (Approved)
    await act(async () => {
      findButton(container, 'Success').click();
    });

    await waitFor(() => {
      expect(container.textContent).toContain('$250.00');
    });

    expect(container.textContent).not.toContain('$120.00');
    expect(container.textContent).not.toContain('$75.00');

    // Reject tab (Rejected)
    await act(async () => {
      findButton(container, 'Reject').click();
    });

    await waitFor(() => {
      expect(container.textContent).toContain('$75.00');
    });

    expect(container.textContent).not.toContain('$120.00');
    expect(container.textContent).not.toContain('$250.00');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
