import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

export function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: 'asc' | 'desc' }) {
  if (sortCol !== col) return <ChevronsUpDown size={14} className="ml-1 inline opacity-40" />;
  return sortDir === 'asc'
    ? <ChevronUp size={14} className="ml-1 inline text-[#00D9FF]" />
    : <ChevronDown size={14} className="ml-1 inline text-[#00D9FF]" />;
}
