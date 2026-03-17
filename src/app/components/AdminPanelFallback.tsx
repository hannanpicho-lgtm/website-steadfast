import React from 'react';

export default function AdminPanelFallback({ label }: { label: string }) {
  return (
    <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-8 text-center text-gray-400">
      {label}
    </div>
  );
}
