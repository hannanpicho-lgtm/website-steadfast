/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Signup from '@/app/pages/Signup';

const serverSignupMock = vi.fn();
const serverLoginMock = vi.fn();
const navigateMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastInfoMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/app/services/serverAuth', () => ({
  serverSignup: (...args: unknown[]) => serverSignupMock(...args),
  serverLogin: (...args: unknown[]) => serverLoginMock(...args),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe('Signup page', () => {
  beforeEach(() => {
    serverSignupMock.mockReset();
    serverLoginMock.mockReset();
    navigateMock.mockReset();
    toastSuccessMock.mockReset();
    toastInfoMock.mockReset();
    toastErrorMock.mockReset();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  it('shows terms error when terms are not accepted', async () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'alice_01' } });
    fireEvent.change(screen.getByPlaceholderText('Phone number'), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByPlaceholderText('Transaction Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByPlaceholderText('Login Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm Login Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByPlaceholderText('Invite Code'), { target: { value: 'STF01' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Please accept Terms and Conditions to continue.')).toBeInTheDocument();
    expect(serverSignupMock).not.toHaveBeenCalled();
  });

  it('submits successfully and navigates to home after auto-login', async () => {
    serverSignupMock.mockResolvedValue({
      ok: true,
      invitationCode: 'INV01',
      referralRate: 0.2,
      parentReward: 1,
    });
    serverLoginMock.mockResolvedValue({ ok: true });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'alice_01' } });
    fireEvent.change(screen.getByPlaceholderText('Phone number'), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByPlaceholderText('Transaction Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByPlaceholderText('Login Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm Login Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByPlaceholderText('Invite Code'), { target: { value: 'STF01' } });
    fireEvent.click(screen.getByLabelText('I accept the Terms and Conditions'));

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(serverSignupMock).toHaveBeenCalledTimes(1);
      expect(serverLoginMock).toHaveBeenCalledWith('alice_01', 'secret123');
      expect(navigateMock).toHaveBeenCalledWith('/home', { replace: true });
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });

  it('marks short admin referral code as invalid on blur without network call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    const adminCodeInput = screen.getByPlaceholderText('Referral Code (optional)');
    fireEvent.change(adminCodeInput, { target: { value: 'AB' } });
    fireEvent.blur(adminCodeInput);

    expect(await screen.findByText('✗ Invalid')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('marks admin referral code as valid when verification succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    const adminCodeInput = screen.getByPlaceholderText('Referral Code (optional)');
    fireEvent.change(adminCodeInput, { target: { value: 'ABCDE' } });
    fireEvent.blur(adminCodeInput);

    expect(await screen.findByText('✓ Valid')).toBeInTheDocument();
  });
});
