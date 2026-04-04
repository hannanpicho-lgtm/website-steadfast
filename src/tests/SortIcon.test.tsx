/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SortIcon } from '@/app/admin/SortIcon';

describe('SortIcon', () => {
  it('renders neutral icon when column is not active', () => {
    const { container } = render(<SortIcon col="amount" sortCol="date" sortDir="asc" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.className.baseVal).toContain('opacity-40');
  });

  it('renders active ascending icon style when sorted asc', () => {
    const { container } = render(<SortIcon col="amount" sortCol="amount" sortDir="asc" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.className.baseVal).toContain('text-[#00D9FF]');
  });

  it('renders active descending icon style when sorted desc', () => {
    const { container } = render(<SortIcon col="amount" sortCol="amount" sortDir="desc" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.className.baseVal).toContain('text-[#00D9FF]');
  });
});
