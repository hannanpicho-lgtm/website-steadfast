/** @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock virtual scrolling to render all rows in JSDOM (zero-size container)
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (opts: { count: number; estimateSize: () => number }) => {
    const size = opts.estimateSize();
    return {
      getVirtualItems: () =>
        Array.from({ length: opts.count }, (_, i) => ({
          index: i,
          start: i * size,
          end: (i + 1) * size,
          size,
          key: i,
        })),
      getTotalSize: () => opts.count * size,
      measureElement: vi.fn(),
    };
  },
}));

import UserManagement from '../app/admin/UserManagement';

function makeUser(i: number, overrides: Record<string, unknown> = {}) {
  return {
    username: `user${String(i).padStart(2, '0')}`,
    balance: i * 100,
    vipLevel: 1,
    isSuspended: false,
    createdAt: new Date(2024, 0, i).toISOString(),
    tasksCompleted: 0,
    referredByAdminName: 'admin',
    ...overrides,
  };
}

const defaultProps = {
  platformUsers: [] as ReturnType<typeof makeUser>[],
  platformUsersLoaded: true,
  platformUsersLoading: false,
  isSuperAdmin: true,
  searchTerm: '',
  setSearchTerm: vi.fn(),
  filterStatus: 'all',
  setFilterStatus: vi.fn(),
  userPage: 1,
  setUserPage: vi.fn(),
  usersPerPage: 5,
  setSelectedItem: vi.fn(),
  setModalType: vi.fn(),
  handleExport: vi.fn(),
  onToggleSuspension: vi.fn(),
  onResetTaskSet: vi.fn(),
  onRestoreNaturalState: vi.fn(),
  onResetCredentials: vi.fn(),
  onSetCreditScore: vi.fn(),
  onRecalculateFinancialState: vi.fn(),
  onReconcilePremiumUser: vi.fn(),
  onReconcilePremiumAll: vi.fn(),
  reconcilingPremiumUser: false,
  reconcilingPremiumAll: false,
};

describe('UserManagement table', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders user rows from platformUsers prop', () => {
    const users = [makeUser(1), makeUser(2), makeUser(3)];
    render(<UserManagement {...defaultProps} platformUsers={users} />);
    expect(screen.getByText('user01')).toBeInTheDocument();
    expect(screen.getByText('user02')).toBeInTheDocument();
    expect(screen.getByText('user03')).toBeInTheDocument();
  });

  it('filters displayed rows when searchTerm prop matches only one user', () => {
    const users = [
      makeUser(1, { username: 'alice' }),
      makeUser(2, { username: 'bob' }),
      makeUser(3, { username: 'charlie' }),
    ];
    render(<UserManagement {...defaultProps} platformUsers={users} searchTerm="alice" />);
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.queryByText('bob')).not.toBeInTheDocument();
    expect(screen.queryByText('charlie')).not.toBeInTheDocument();
  });

  it('sorts rows alphabetically ascending when Username header is clicked', () => {
    const users = [
      makeUser(1, { username: 'charlie' }),
      makeUser(2, { username: 'alice' }),
      makeUser(3, { username: 'bob' }),
    ];
    render(<UserManagement {...defaultProps} platformUsers={users} />);

    const usernameHeader = Array.from(document.querySelectorAll('th')).find(
      (th) => th.textContent?.startsWith('Username'),
    )!;
    fireEvent.click(usernameHeader);

    const html = document.body.innerHTML;
    expect(html.indexOf('alice')).toBeLessThan(html.indexOf('bob'));
    expect(html.indexOf('bob')).toBeLessThan(html.indexOf('charlie'));
  });

  it('renders all rows in virtual scroll (no pagination buttons)', () => {
    const users = Array.from({ length: 6 }, (_, i) => makeUser(i + 1));
    render(<UserManagement {...defaultProps} platformUsers={users} />);
    expect(screen.getByText('user01')).toBeInTheDocument();
    expect(screen.getByText('user06')).toBeInTheDocument();
  });
});
