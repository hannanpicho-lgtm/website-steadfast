import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { verifyAndRestoreSession } from '../services/serverAuth';

export default function RequireAuthLayout() {
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const restored = await verifyAndRestoreSession();
      if (!isMounted) return;
      setStatus(restored ? 'authorized' : 'unauthorized');
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-[#1a1f2e] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-[#00D9FF]/30 border-t-[#00D9FF] animate-spin" />
          <p className="text-sm tracking-widest text-[#00D9FF]/70 uppercase">Loading</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return <Navigate to="/login" replace state={buildLoginRedirectState(location.pathname, { authReason: 'sign-in-required' })} />;
  }

  return <Outlet />;
}
