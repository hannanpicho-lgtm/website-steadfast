import { Navigate, Outlet, useLocation } from 'react-router';
import { isAuthenticated } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';

export default function RequireAuthLayout() {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={buildLoginRedirectState(location.pathname, { authReason: 'sign-in-required' })} />;
  }

  return <Outlet />;
}
