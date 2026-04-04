import React, { useState } from 'react';
import { X } from 'lucide-react';

/* ── Reset Credentials Modal ───────────────────────────────── */

interface ResetCredentialsModalProps {
  username: string;
  onConfirm: (loginPassword: string, transactionPassword: string) => void;
  onClose: () => void;
}

export function ResetCredentialsModal({ username, onConfirm, onClose }: ResetCredentialsModalProps) {
  const [loginPassword, setLoginPassword] = useState('');
  const [transactionPassword, setTransactionPassword] = useState('');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#252b3d] border border-gray-700 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-bold">Reset Credentials</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <p className="text-gray-400 text-sm mb-4">Set new credentials for <span className="text-white font-semibold">{username}</span></p>

        <label className="block text-gray-400 text-xs mb-1">New Login Password</label>
        <input
          type="text"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          placeholder="Enter new login password"
          className="w-full px-3 py-2 mb-3 bg-[#1a1f2e] border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#00D9FF]"
        />

        <label className="block text-gray-400 text-xs mb-1">New Transaction Password</label>
        <input
          type="text"
          value={transactionPassword}
          onChange={(e) => setTransactionPassword(e.target.value)}
          placeholder="Enter new transaction password"
          className="w-full px-3 py-2 mb-4 bg-[#1a1f2e] border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#00D9FF]"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
          <button
            onClick={() => { if (loginPassword && transactionPassword) onConfirm(loginPassword, transactionPassword); }}
            disabled={!loginPassword || !transactionPassword}
            className="px-4 py-2 bg-[#00D9FF] text-[#1a1f2e] font-semibold rounded text-sm hover:bg-[#00C4E6] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Reset Credentials
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Credit Score Modal ────────────────────────────────────── */

interface CreditScoreModalProps {
  username: string;
  currentScore: number;
  onConfirm: (newScore: number) => void;
  onClose: () => void;
}

export function CreditScoreModal({ username, currentScore, onConfirm, onClose }: CreditScoreModalProps) {
  const [score, setScore] = useState(String(currentScore));

  const parsed = Number(score);
  const valid = score.trim() !== '' && !isNaN(parsed) && parsed >= 0 && parsed <= 200;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#252b3d] border border-gray-700 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-bold">Set Credit Score</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Set credit score for <span className="text-white font-semibold">{username}</span>
          <span className="text-gray-500 ml-1">(current: {currentScore})</span>
        </p>

        <label className="block text-gray-400 text-xs mb-1">New Credit Score (0–200)</label>
        <input
          type="number"
          min={0}
          max={200}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="w-full px-3 py-2 mb-4 bg-[#1a1f2e] border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#00D9FF]"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
          <button
            onClick={() => { if (valid) onConfirm(parsed); }}
            disabled={!valid}
            className="px-4 py-2 bg-[#00D9FF] text-[#1a1f2e] font-semibold rounded text-sm hover:bg-[#00C4E6] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Set Score
          </button>
        </div>
      </div>
    </div>
  );
}
