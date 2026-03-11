import { Navigate, Outlet } from 'react-router';
import { isAuthenticated, isCurrentUserAdmin } from '../services/referralSystem';

export default function RequireAdminLayout() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!isCurrentUserAdmin()) {
    return <Navigate to="/starting" replace />;
  }

  return <Outlet />;
}
