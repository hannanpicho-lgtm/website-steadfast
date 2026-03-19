import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { getStoredSessionToken, verifyAndRestoreSession } from '../services/serverAuth';

export default function RequireAuthLayout() {
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const token = getStoredSessionToken();
      if (!token) {
        if (isMounted) setStatus('unauthorized');
        return;
      }

      const restored = await verifyAndRestoreSession();
      if (!isMounted) return;
      setStatus(restored ? 'authorized' : 'unauthorized');
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === 'checking') {
    return <div className="min-h-screen bg-[#1f2638]" />;
  }

  if (status === 'unauthorized') {
    return <Navigate to="/login" replace state={buildLoginRedirectState(location.pathname, { authReason: 'sign-in-required' })} />;
  }

  return <Outlet />;
}
