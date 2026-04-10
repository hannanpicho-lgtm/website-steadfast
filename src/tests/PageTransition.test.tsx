/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PageTransition } from '@/app/components/PageTransition';

// Wrap in MemoryRouter so useLocation() works
function renderTransition(children: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/test']}>
      <PageTransition>{children}</PageTransition>
    </MemoryRouter>
  );
}

describe('PageTransition', () => {
  it('renders children inside animated wrapper', () => {
    const { getByText } = renderTransition(<div>Page Content</div>);
    expect(getByText('Page Content')).toBeTruthy();
  });

  it('wraps content in a motion div with will-change style', () => {
    const { container } = renderTransition(<p>Test</p>);
    const motionDiv = container.querySelector('[style*="will-change"]');
    expect(motionDiv).toBeTruthy();
  });

  it('renders different content for different paths', () => {
    const { getByText, rerender } = render(
      <MemoryRouter initialEntries={['/page-a']}>
        <PageTransition>
          <div>Page A</div>
        </PageTransition>
      </MemoryRouter>
    );
    expect(getByText('Page A')).toBeTruthy();

    rerender(
      <MemoryRouter initialEntries={['/page-b']}>
        <PageTransition>
          <div>Page B</div>
        </PageTransition>
      </MemoryRouter>
    );
    expect(getByText('Page B')).toBeTruthy();
  });
});
