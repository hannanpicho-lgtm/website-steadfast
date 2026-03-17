import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Server, 
  Database, 
  Zap,
  MessageSquare,
  Users,
  Activity
} from 'lucide-react';
import { projectId, publicAnonKey } from '@utils/supabase/info';

interface HealthCheck {
  name: string;
  status: 'checking' | 'success' | 'error';
  message: string;
  icon: any;
}

export default function DeploymentStatus() {
  const [checks, setChecks] = useState<HealthCheck[]>([
    { name: 'Server Health', status: 'checking', message: 'Testing...', icon: Server },
    { name: 'Database Connection', status: 'checking', message: 'Testing...', icon: Database },
    { name: 'User API', status: 'checking', message: 'Testing...', icon: Users },
    { name: 'Chat System', status: 'checking', message: 'Testing...', icon: MessageSquare },
    { name: 'Task Submission', status: 'checking', message: 'Testing...', icon: Activity },
    { name: 'Premium System', status: 'checking', message: 'Testing...', icon: Zap },
  ]);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  useEffect(() => {
    runHealthChecks();
  }, []);

  const runHealthChecks = async () => {
    // Test 1: Server Health
    await testEndpoint(0, `${serverUrl}/health`, 'Server is running');

    // Test 2: Database Connection (via user endpoint)
    await testEndpoint(1, `${serverUrl}/user/ugreen`, 'Database connected');

    // Test 3: User API
    await testEndpoint(2, `${serverUrl}/user/ugreen`, 'User API operational');

    // Test 4: Chat System
    await testEndpoint(3, `${serverUrl}/cs/chat/ugreen`, 'Chat system ready');

    // Test 5: Task Submission (just check user data loads)
    await testEndpoint(4, `${serverUrl}/tasks/ugreen`, 'Task system ready');

    // Test 6: Premium System
    await testEndpoint(5, `${serverUrl}/premium/ugreen`, 'Premium system ready');
  };

  const testEndpoint = async (index: number, url: string, successMessage: string) => {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        updateCheck(index, 'success', successMessage);
      } else {
        updateCheck(index, 'error', `HTTP ${response.status}`);
      }
    } catch (error) {
      updateCheck(index, 'error', 'Connection failed');
    }
  };

  const updateCheck = (index: number, status: 'success' | 'error', message: string) => {
    setChecks(prev => {
      const newChecks = [...prev];
      newChecks[index] = { ...newChecks[index], status, message };
      return newChecks;
    });
  };

  const allSuccess = checks.every(check => check.status === 'success');
  const anyError = checks.some(check => check.status === 'error');
  const isChecking = checks.some(check => check.status === 'checking');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🚀 Deployment Status
          </h1>
          <p className="text-gray-400 text-lg">
            Steadfast Digital Platform - Production Health Check
          </p>
        </div>

        {/* Overall Status */}
        <div className={`mb-8 p-8 rounded-2xl border-2 ${
          allSuccess 
            ? 'bg-green-500/10 border-green-500' 
            : anyError 
            ? 'bg-red-500/10 border-red-500'
            : 'bg-blue-500/10 border-blue-500'
        }`}>
          <div className="flex items-center justify-center gap-4">
            {isChecking && <Loader2 className="animate-spin text-blue-400" size={48} />}
            {allSuccess && <CheckCircle className="text-green-400" size={48} />}
            {anyError && !isChecking && <XCircle className="text-red-400" size={48} />}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">
                {isChecking ? 'Running Health Checks...' : allSuccess ? 'All Systems Operational' : 'System Issues Detected'}
              </h2>
              <p className="text-gray-300">
                {isChecking ? 'Please wait while we verify all components' : allSuccess ? 'Platform is ready for production' : 'Some components need attention'}
              </p>
            </div>
          </div>
        </div>

        {/* Health Checks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {checks.map((check, index) => (
            <div
              key={index}
              className={`bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border-2 transition-all ${
                check.status === 'success'
                  ? 'border-green-500/50'
                  : check.status === 'error'
                  ? 'border-red-500/50'
                  : 'border-gray-700'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  check.status === 'success'
                    ? 'bg-green-500/20'
                    : check.status === 'error'
                    ? 'bg-red-500/20'
                    : 'bg-gray-700/50'
                }`}>
                  <check.icon 
                    className={
                      check.status === 'success'
                        ? 'text-green-400'
                        : check.status === 'error'
                        ? 'text-red-400'
                        : 'text-gray-400'
                    } 
                    size={24} 
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{check.name}</h3>
                  <div className="flex items-center gap-2">
                    {check.status === 'checking' && (
                      <Loader2 className="animate-spin text-blue-400" size={16} />
                    )}
                    {check.status === 'success' && (
                      <CheckCircle className="text-green-400" size={16} />
                    )}
                    {check.status === 'error' && (
                      <XCircle className="text-red-400" size={16} />
                    )}
                    <p className={`text-sm ${
                      check.status === 'success'
                        ? 'text-green-400'
                        : check.status === 'error'
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}>
                      {check.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Platform Info */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Platform Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400 mb-1">Version</p>
              <p className="text-white font-semibold">1.0.0</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Deployment Date</p>
              <p className="text-white font-semibold">March 11, 2026</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Environment</p>
              <p className="text-white font-semibold">Production</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Pages</p>
              <p className="text-white font-semibold">12 Pages</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">API Endpoints</p>
              <p className="text-white font-semibold">13 Endpoints</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Status</p>
              <p className="text-green-400 font-semibold">Live</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-center font-semibold transition-colors"
          >
            Home
          </a>
          <a
            href="/profile"
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg text-center font-semibold transition-colors"
          >
            Profile
          </a>
          <a
            href="/admin"
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg text-center font-semibold transition-colors"
          >
            Admin
          </a>
          <a
            href="/support"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-center font-semibold transition-colors"
          >
            Support
          </a>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-400 text-sm">
          <p>Steadfast Digital Platform • Built with React + Supabase</p>
          <p className="mt-2">
            {allSuccess ? '✅ All systems operational' : isChecking ? '⏳ Running diagnostics...' : '⚠️ Check system status above'}
          </p>
        </div>
      </div>
    </div>
  );
}
