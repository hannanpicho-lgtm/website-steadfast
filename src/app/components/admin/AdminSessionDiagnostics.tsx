import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../../services/supabaseAuth';

const AUTO_HIDE_DELAY_MS = 10_000;

type DiagnosticsState = {
  status: 'loading' | 'active' | 'missing' | 'error';
  email: string;
  roleClaim: string;
  userId: string;
  message: string | null;
};

function extractRoleClaim(appMetadata: Record<string, unknown> | null | undefined): string {
  if (!appMetadata) {
    return 'none';
  }

  if (typeof appMetadata.role === 'string' && appMetadata.role.trim()) {
    return appMetadata.role;
  }

  if (Array.isArray(appMetadata.roles)) {
    const roles = appMetadata.roles
      .filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
      .map((role) => role.trim());

    if (roles.length > 0) {
      return roles.join(', ');
    }
  }

  return 'none';
}

export default function AdminSessionDiagnostics() {
  const [isVisible, setIsVisible] = useState(true);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({
    status: 'loading',
    email: 'Checking admin session...',
    roleClaim: 'unknown',
    userId: '-',
    message: null,
  });

  const refreshDiagnostics = useCallback(async () => {
    setIsVisible(true);
    setDiagnostics((previous) => ({
      ...previous,
      status: 'loading',
      message: null,
    }));

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setDiagnostics({
        status: 'error',
        email: 'Unknown',
        roleClaim: 'unknown',
        userId: '-',
        message: sessionError.message,
      });
      return;
    }

    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setDiagnostics({
        status: 'missing',
        email: 'No active session',
        roleClaim: 'none',
        userId: '-',
        message: 'Session token not found. Please sign in again.',
      });
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) {
      setDiagnostics({
        status: 'error',
        email: 'Unknown',
        roleClaim: 'unknown',
        userId: '-',
        message: userError?.message ?? 'Unable to fetch admin profile.',
      });
      return;
    }

    setDiagnostics({
      status: 'active',
      email: userData.user.email ?? 'No email on account',
      roleClaim: extractRoleClaim((userData.user.app_metadata ?? null) as Record<string, unknown> | null),
      userId: userData.user.id,
      message: null,
    });
  }, []);

  useEffect(() => {
    void refreshDiagnostics();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void refreshDiagnostics();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refreshDiagnostics]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsVisible(false);
    }, AUTO_HIDE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [diagnostics.status, diagnostics.message, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="fixed right-4 bottom-4 z-40 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-gray-700 bg-[#13192b]/95 backdrop-blur p-4 shadow-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-[#00D9FF]" size={16} />
          <p className="text-white text-sm font-semibold">Admin Session Diagnostics</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void refreshDiagnostics()}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1a1f2e] transition-colors"
            title="Refresh diagnostics"
          >
            <RefreshCw className={diagnostics.status === 'loading' ? 'animate-spin' : ''} size={14} />
          </button>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1a1f2e] transition-colors"
            title="Close diagnostics"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs">
        <p className="text-gray-300 truncate" title={diagnostics.email}>Email: <span className="text-white">{diagnostics.email}</span></p>
        <p className="text-gray-300">Role claim: <span className="text-white">{diagnostics.roleClaim}</span></p>
        <p className="text-gray-300 truncate" title={diagnostics.userId}>UID: <span className="text-white">{diagnostics.userId}</span></p>
      </div>

      {diagnostics.message && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2">
          <AlertTriangle className="text-yellow-300 mt-0.5" size={14} />
          <p className="text-yellow-200 text-xs leading-4">{diagnostics.message}</p>
        </div>
      )}
    </aside>
  );
}
