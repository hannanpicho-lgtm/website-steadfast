import { Navigate, Outlet, useLocation } from 'react-router';
import { isAuthenticated } from '../services/referralSystem';

export default function RequireAuthLayout() {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
