export type LoginAuthReason = 'sign-in-required' | 'admin-access-required' | 'session-expired';

export type LoginLocationState = {
  from?: string;
  adminRequired?: boolean;
  authReason?: LoginAuthReason;
  authMessage?: string;
};

export function buildLoginRedirectState(
  pathname: string,
  overrides: Omit<LoginLocationState, 'from'> = {},
): LoginLocationState {
  return {
    from: pathname,
    ...overrides,
  };
}