/** @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductManagement from '../app/admin/ProductManagement';

const baseProps = {
  products: [],
  searchTerm: '',
  setSearchTerm: vi.fn(),
  filterStatus: 'all',
  setFilterStatus: vi.fn(),
  productPage: 1,
  setProductPage: vi.fn(),
  productsPerPage: 12,
  setSelectedItem: vi.fn(),
  setModalType: vi.fn(),
  handleExport: vi.fn(),
  onBulkDelete: vi.fn(),
  onBulkStatusUpdate: vi.fn(),
  onOpenImport: vi.fn(),
};

describe('ProductManagement image integrity', () => {
  it('renders a provided product image URL as-is', () => {
    render(
      <ProductManagement
        {...baseProps}
        products={[{ id: 'p1', product: 'Desk Lamp', image: 'https://cdn.example.com/lamp.jpg', price: 50, commission: 0.01, status: 'Active' }]}
      />,
    );

    const image = screen.getByAltText('Desk Lamp') as HTMLImageElement;
    expect(image.src).toContain('https://cdn.example.com/lamp.jpg');
  });

  it('uses neutral placeholder when image is missing', () => {
    render(
      <ProductManagement
        {...baseProps}
        products={[{ id: 'p2', product: 'Keyboard', price: 79, commission: 0.01, status: 'Active' }]}
      />,
    );

    const image = screen.getByAltText('Keyboard') as HTMLImageElement;
    expect(image.src).toContain('https://via.placeholder.com/400x300?text=Image+Unavailable');
  });

  it('switches to neutral placeholder when image fails to load', () => {
    render(
      <ProductManagement
        {...baseProps}
        products={[{ id: 'p3', product: 'Monitor', image: 'https://broken.example.com/image.jpg', price: 220, commission: 0.01, status: 'Active' }]}
      />,
    );

    const image = screen.getByAltText('Monitor') as HTMLImageElement;
    fireEvent.error(image);

    expect(image.src).toContain('https://via.placeholder.com/400x300?text=Image+Unavailable');
  });
});
