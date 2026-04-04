import { useMemo, useState } from 'react';

type SortDir = 'asc' | 'desc';

interface UseTableSortOpts<T> {
  items: T[];
  defaultDateCol?: string;
  searchFields: (keyof T)[];
  searchTerm: string;
  filterStatus: string;
  itemsPerPage?: number;
  extraFilter?: (item: T) => boolean;
}

export function useTableSort<T extends Record<string, unknown>>({
  items,
  defaultDateCol = 'date',
  searchFields,
  searchTerm,
  filterStatus,
  itemsPerPage = 15,
  extraFilter,
}: UseTableSortOpts<T>) {
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === defaultDateCol ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const handleSearch = (val: string) => { setPage(1); return val; };
  const handleFilterStatus = (val: string) => { setPage(1); return val; };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchSearch =
        !q ||
        searchFields.some((field) =>
          String(item[field] ?? '').toLowerCase().includes(q),
        );
      const matchStatus =
        filterStatus === 'all' ||
        String((item as Record<string, unknown>).status ?? '').toLowerCase() === filterStatus.toLowerCase();
      const matchExtra = !extraFilter || extraFilter(item);
      return matchSearch && matchStatus && matchExtra;
    });
  }, [items, searchTerm, filterStatus, searchFields, extraFilter]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      if (sortCol === defaultDateCol) {
        aVal = new Date(String(a[sortCol] ?? '')).getTime();
        bVal = new Date(String(b[sortCol] ?? '')).getTime();
      } else if (sortCol === 'amount') {
        aVal = Number(a.amount ?? 0);
        bVal = Number(b.amount ?? 0);
      } else {
        aVal = String(a[sortCol] ?? '').toLowerCase();
        bVal = String(b[sortCol] ?? '').toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortCol, sortDir, defaultDateCol]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * itemsPerPage;
  const paginated = sorted.slice(startIdx, startIdx + itemsPerPage);

  return {
    sortCol,
    sortDir,
    page: safePage,
    setPage,
    handleSort,
    handleSearch,
    handleFilterStatus,
    filtered,
    sorted,
    totalPages,
    paginated,
    startIdx,
  };
}
