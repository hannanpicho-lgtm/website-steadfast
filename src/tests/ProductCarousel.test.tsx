/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCarousel } from '@/app/components/starting/ProductCarousel';

const tasks = [
  { id: 't1', product: 'Widget Alpha', image: '/img/a.png', rating: 4.5, price: 29.99 },
  { id: 't2', product: 'Widget Beta', image: '/img/b.png', rating: 4.8, price: 49.99 },
  { id: 't3', product: 'Widget Gamma', image: '/img/c.png', rating: 3.9, price: 19.99 },
];

describe('ProductCarousel', () => {
  it('renders product name and price', () => {
    const onIndexChange = vi.fn();
    render(<ProductCarousel tasks={tasks} index={0} onIndexChange={onIndexChange} />);

    expect(screen.getByText('Widget Alpha')).toBeTruthy();
    expect(screen.getByText(/29\.99 USD/)).toBeTruthy();
  });

  it('shows empty message when no tasks', () => {
    const onIndexChange = vi.fn();
    render(<ProductCarousel tasks={[]} index={0} onIndexChange={onIndexChange} />);

    expect(screen.getByText(/No active tasks/)).toBeTruthy();
  });

  it('renders rating', () => {
    const onIndexChange = vi.fn();
    render(<ProductCarousel tasks={tasks} index={0} onIndexChange={onIndexChange} />);

    expect(screen.getByText('4.5')).toBeTruthy();
  });

  it('calls onIndexChange when next button is clicked', () => {
    const onIndexChange = vi.fn();
    render(<ProductCarousel tasks={tasks} index={0} onIndexChange={onIndexChange} />);

    const nextBtn = screen.getByLabelText('Next slide');
    fireEvent.click(nextBtn);

    expect(onIndexChange).toHaveBeenCalledTimes(1);
  });

  it('calls onIndexChange when prev button is clicked', () => {
    const onIndexChange = vi.fn();
    render(<ProductCarousel tasks={tasks} index={1} onIndexChange={onIndexChange} />);

    const prevBtn = screen.getByLabelText('Previous slide');
    fireEvent.click(prevBtn);

    expect(onIndexChange).toHaveBeenCalledTimes(1);
  });

  it('renders dot indicators for each task', () => {
    const onIndexChange = vi.fn();
    render(<ProductCarousel tasks={tasks} index={0} onIndexChange={onIndexChange} />);

    const dots = screen.getAllByLabelText(/Go to slide/);
    expect(dots.length).toBe(3);
  });

  it('clicking a dot calls onIndexChange', () => {
    const onIndexChange = vi.fn();
    render(<ProductCarousel tasks={tasks} index={0} onIndexChange={onIndexChange} />);

    const dot2 = screen.getByLabelText('Go to slide 2');
    fireEvent.click(dot2);

    expect(onIndexChange).toHaveBeenCalledTimes(1);
  });

  it('renders the correct product for a given index', () => {
    const onIndexChange = vi.fn();
    render(<ProductCarousel tasks={tasks} index={2} onIndexChange={onIndexChange} />);

    expect(screen.getByText('Widget Gamma')).toBeTruthy();
    expect(screen.getByText(/19\.99 USD/)).toBeTruthy();
  });
});
