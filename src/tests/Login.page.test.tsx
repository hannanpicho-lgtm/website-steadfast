/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '@/app/pages/Login';

const serverLoginMock = vi.fn();
const signInAdminMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('@/app/services/serverAuth', () => ({
  serverLogin: (...args: unknown[]) => serverLoginMock(...args),
}));

vi.mock('@/app/services/supabaseAuth', () => ({
  signInAdmin: (...args: unknown[]) => signInAdminMock(...args),
}));

vi.mock('@/app/services/apiCompatibility', () => ({
  warmApiCompatibilityState: vi.fn(),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('Login page', () => {
  beforeEach(() => {
    serverLoginMock.mockReset();
    signInAdminMock.mockReset();
    navigateMock.mockReset();
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

  it('shows admin email prompt when login was redirected for admin access', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: {
              from: '/admin',
              adminRequired: true,
              authReason: 'admin-access-required',
            },
          },
        ]}
      >
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByText(/Use an authorized Steadfast account to open/)).toBeInTheDocument();
  });

  it('navigates to home after successful sign in and welcome modal continue', async () => {
    serverLoginMock.mockResolvedValue({ ok: true, mustChangePassword: false });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'SIGN IN' }));
    fireEvent.change(screen.getByPlaceholderText('Username / Phone'), { target: { value: 'alice_01' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'SIGN IN' })[1]);

    await screen.findByText("You've successfully signed in to Steadfast Digital");
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(navigateMock).toHaveBeenCalledWith('/home', { replace: true });
  });
});
