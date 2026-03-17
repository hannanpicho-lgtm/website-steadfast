import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';
import { isSupabaseAdminAuthenticated } from '../services/supabaseAuth';
import AdminSessionDiagnostics from '../components/admin/AdminSessionDiagnostics';
import { buildLoginRedirectState } from '../services/loginRedirect';

export default function RequireAdminLayout() {
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const authorized = await isSupabaseAdminAuthenticated();
      if (!isMounted) {
        return;
      }

      setStatus(authorized ? 'authorized' : 'unauthorized');
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1f2e]">
        <Loader2 className="animate-spin text-[#00D9FF]" size={40} />
      </div>
    );
  }

  if (status === 'unauthorized') {
    return <Navigate to="/login" replace state={buildLoginRedirectState(location.pathname, { adminRequired: true, authReason: 'admin-access-required' })} />;
  }

  return (
    <>
      <Outlet />
      <AdminSessionDiagnostics />
    </>
  );
}
