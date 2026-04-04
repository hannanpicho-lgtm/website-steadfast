/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '@/app/pages/Login';

const serverLoginMock = vi.fn();
const signInAdminMock = vi.fn();

vi.mock('@/app/services/serverAuth', () => ({
  serverLogin: (...args: unknown[]) => serverLoginMock(...args),
}));

vi.mock('@/app/services/supabaseAuth', () => ({
  signInAdmin: (...args: unknown[]) => signInAdminMock(...args),
}));

vi.mock('@/app/services/apiCompatibility', () => ({
  warmApiCompatibilityState: vi.fn(),
}));

describe('Login page', () => {
  beforeEach(() => {
    serverLoginMock.mockReset();
    signInAdminMock.mockReset();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  it('reveals sign in form when SIGN IN is clicked', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'SIGN IN' }));

    expect(screen.getByPlaceholderText('Username / Phone')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('shows service unavailable message when backend is down', async () => {
    serverLoginMock.mockResolvedValue({ ok: false, serverDown: true, error: null });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'SIGN IN' }));
    fireEvent.change(screen.getByPlaceholderText('Username / Phone'), { target: { value: 'alice_01' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'SIGN IN' })[1]);

    await waitFor(() => {
      expect(screen.getByText('Login service is temporarily unavailable. Please try again in a moment.')).toBeInTheDocument();
    });
  });
});
