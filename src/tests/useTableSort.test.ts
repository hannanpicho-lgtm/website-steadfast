/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTableSort } from '@/app/hooks/useTableSort';

type Row = {
  id: string;
  username: string;
  amount: number;
  status: string;
  date: string;
};

const rows: Row[] = [
  { id: '1', username: 'alice', amount: 150, status: 'Pending', date: '2026-04-03T10:00:00.000Z' },
  { id: '2', username: 'bob', amount: 50, status: 'Completed', date: '2026-04-04T10:00:00.000Z' },
  { id: '3', username: 'charlie', amount: 300, status: 'Pending', date: '2026-04-02T10:00:00.000Z' },
];

describe('useTableSort', () => {
  it('sorts date columns descending by default', () => {
    const { result } = renderHook(() =>
      useTableSort<Row>({
        items: rows,
        defaultDateCol: 'date',
        searchFields: ['id', 'username'],
        searchTerm: '',
        filterStatus: 'all',
      }),
    );

    act(() => {
      result.current.handleSort('date');
    });

    expect(result.current.sorted.map((row) => row.id)).toEqual(['2', '1', '3']);
  });

  it('filters by search and status', () => {
    const { result } = renderHook(() =>
      useTableSort<Row>({
        items: rows,
        defaultDateCol: 'date',
        searchFields: ['id', 'username'],
        searchTerm: 'a',
        filterStatus: 'pending',
      }),
    );

    expect(result.current.filtered.map((row) => row.username)).toEqual(['alice', 'charlie']);
  });

  it('sorts amount ascending then descending when toggled', () => {
    const { result } = renderHook(() =>
      useTableSort<Row>({
        items: rows,
        defaultDateCol: 'date',
        searchFields: ['id', 'username'],
        searchTerm: '',
        filterStatus: 'all',
      }),
    );

    act(() => {
      result.current.handleSort('amount');
    });
    expect(result.current.sorted.map((row) => row.amount)).toEqual([50, 150, 300]);

    act(() => {
      result.current.handleSort('amount');
    });
    expect(result.current.sorted.map((row) => row.amount)).toEqual([300, 150, 50]);
  });
});
