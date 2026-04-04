import React, { useState, useCallback } from 'react';
import {
  Upload, Search, Download, Eye, Edit, Trash2, Package, Tag, Sparkles,
  CheckSquare, Square, X, ChevronDown, Filter, Layers,
} from 'lucide-react';

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

type VipConfig = { level: number; name: string; commission: number; color?: string };

interface ProductManagementProps {
  products: any[];
  vipConfigurations?: VipConfig[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  productPage: number;
  setProductPage: React.Dispatch<React.SetStateAction<number>>;
  productsPerPage: number;
  setSelectedItem: (item: any) => void;
  setModalType: (type: any) => void;
  handleExport: () => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkStatusUpdate: (ids: string[], status: string) => void;
  onOpenImport: () => void;
}

const VIP_TIER_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40' },
  2: { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/40' },
  3: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/40' },
  4: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40' },
  5: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
};

const PRODUCT_IMAGE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='100%25' height='100%25' fill='%231a2234'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='18'%3EImage unavailable%3C/text%3E%3C/svg%3E";

function buildPublicImageFallbackProxyUrl(value: unknown): string {
  const raw = normalizeText(value, '').trim();
  if (!raw) {
    return '';
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }

    const hostAndPath = `${parsed.host}${parsed.pathname}${parsed.search}`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(hostAndPath)}&w=800&h=600&fit=cover`;
  } catch {
    return '';
  }
}

function resolveProductImageSrc(product: any): string {
  const raw = normalizeText(product?.image || product?.imageUrl, '').trim();
  return raw || PRODUCT_IMAGE_PLACEHOLDER;
}

export default function ProductManagement({
  products,
  vipConfigurations = [],
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  productPage,
  setProductPage,
  productsPerPage,
  setSelectedItem,
  setModalType,
  handleExport,
  onBulkDelete,
  onBulkStatusUpdate,
  onOpenImport,
}: ProductManagementProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterVipTier, setFilterVipTier] = useState<string>('all');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const normalizedSearchTerm = searchTerm.toLowerCase();

  const filteredProducts = products.filter((product) => {
    const productName = normalizeText(product?.product || product?.name, 'Unnamed product');
    const productCategory = normalizeText(product?.category, '');
    const productMerchant = normalizeText(product?.merchant, '');
    const productSku = normalizeText(product?.sku, '');
    const productStatus = normalizeText(product?.status, 'Inactive');
    const productVipTier = normalizeNumber(product?.vipTier, 0);
    const productPrice = normalizeNumber(product?.price, 0);

    const matchesSearch = normalizedSearchTerm === ''
      || productName.toLowerCase().includes(normalizedSearchTerm)
      || productCategory.toLowerCase().includes(normalizedSearchTerm)
      || productMerchant.toLowerCase().includes(normalizedSearchTerm)
      || productSku.toLowerCase().includes(normalizedSearchTerm);

    const matchesStatus = filterStatus === 'all' || productStatus.toLowerCase() === filterStatus;

    const matchesVipTier = filterVipTier === 'all'
      || (filterVipTier === '0' && productVipTier === 0)
      || String(productVipTier) === filterVipTier;

    const matchesPriceMin = filterPriceMin === '' || productPrice >= Number(filterPriceMin);
    const matchesPriceMax = filterPriceMax === '' || productPrice <= Number(filterPriceMax);

    return matchesSearch && matchesStatus && matchesVipTier && matchesPriceMin && matchesPriceMax;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => normalizeText(p?.status) === 'Active').length;
  const aiGeneratedProducts = products.filter((p) => normalizeText(p?.source) === 'AI Generated').length;
  const bulkImportedProducts = products.filter((p) => normalizeText(p?.source) === 'Bulk Import').length;
  const manualProducts = products.filter(
    (p) => normalizeText(p?.source) !== 'AI Generated' && normalizeText(p?.source) !== 'Bulk Import',
  ).length;

  const totalValue = products.reduce((sum, p) => sum + normalizeNumber(p?.price), 0);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
  const safeProductPage = Math.min(productPage, totalProductPages);
  const productStartIndex = (safeProductPage - 1) * productsPerPage;
  const paginatedProducts = filteredProducts.slice(productStartIndex, productStartIndex + productsPerPage);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const pageIds = paginatedProducts.map((p) => String(p.id));
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [paginatedProducts, selectedIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const pageAllSelected =
    paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedIds.has(String(p.id)));

  const selectedCount = selectedIds.size;
  const selectedArray = Array.from(selectedIds);

  const hasActiveFilters = filterVipTier !== 'all' || filterPriceMin !== '' || filterPriceMax !== '';

  const clearAdvancedFilters = () => {
    setFilterVipTier('all');
    setFilterPriceMin('');
    setFilterPriceMax('');
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Product Management</h2>
          <p className="text-gray-400 text-sm mt-1">Manage product catalog with manual, bulk, or AI generation</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenImport}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            <Layers size={16} />
            Import CSV/JSON
          </button>
          <button
            onClick={() => setModalType('add-product-manual')}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            <Upload size={16} />
            Add Manually
          </button>
          <button
            onClick={() => setModalType('add-product-ai')}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            <Sparkles size={16} />
            AI Generate
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#1a1f2e] hover:bg-[#2c3e50] border border-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="text-blue-400" size={16} />
            <p className="text-gray-400 text-xs">Total</p>
          </div>
          <p className="text-2xl font-bold text-white">{totalProducts}</p>
          <p className="text-gray-400 text-xs mt-1">{activeProducts} active</p>
        </div>
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="text-green-400" size={16} />
            <p className="text-gray-400 text-xs">Total Value</p>
          </div>
          <p className="text-xl font-bold text-white">${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
          <p className="text-gray-400 text-xs mt-1">catalog value</p>
        </div>
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="text-purple-400" size={16} />
            <p className="text-gray-400 text-xs">AI Generated</p>
          </div>
          <p className="text-2xl font-bold text-white">{aiGeneratedProducts}</p>
          <p className="text-gray-400 text-xs mt-1">{totalProducts > 0 ? ((aiGeneratedProducts / totalProducts) * 100).toFixed(0) : '0'}%</p>
        </div>
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="text-green-400" size={16} />
            <p className="text-gray-400 text-xs">Bulk Import</p>
          </div>
          <p className="text-2xl font-bold text-white">{bulkImportedProducts}</p>
          <p className="text-gray-400 text-xs mt-1">{totalProducts > 0 ? ((bulkImportedProducts / totalProducts) * 100).toFixed(0) : '0'}%</p>
        </div>
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Upload className="text-blue-400" size={16} />
            <p className="text-gray-400 text-xs">Manual</p>
          </div>
          <p className="text-2xl font-bold text-white">{manualProducts}</p>
          <p className="text-gray-400 text-xs mt-1">{totalProducts > 0 ? ((manualProducts / totalProducts) * 100).toFixed(0) : '0'}%</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-[#252b3d] p-4 rounded-lg space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, category, merchant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#00D9FF]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white text-sm focus:border-[#00D9FF] focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive / Paused</option>
          </select>
          <button
            onClick={() => setShowAdvancedFilters((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              showAdvancedFilters || hasActiveFilters
                ? 'bg-[#00D9FF]/10 border-[#00D9FF]/40 text-[#00D9FF]'
                : 'bg-[#1a1f2e] border-gray-600 text-gray-400 hover:border-gray-400'
            }`}
          >
            <Filter size={16} />
            Filters
            {hasActiveFilters && (
              <span className="w-4 h-4 bg-[#00D9FF] text-[#1a1f2e] rounded-full text-[10px] font-bold flex items-center justify-center">
                !
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearAdvancedFilters}
              className="px-3 py-2 text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <X size={14} />
              Clear filters
            </button>
          )}
        </div>

        {/* Advanced filters */}
        {showAdvancedFilters && (
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 whitespace-nowrap">VIP Tier:</label>
              <select
                value={filterVipTier}
                onChange={(e) => {
                  setFilterVipTier(e.target.value);
                  setProductPage(1 as any);
                }}
                className="px-3 py-1.5 bg-[#1a1f2e] border border-gray-600 rounded text-white text-xs focus:border-[#00D9FF] focus:outline-none"
              >
                <option value="all">All Tiers</option>
                <option value="0">Untagged</option>
                <option value="1">VIP 1 ($25–$120)</option>
                <option value="2">VIP 2 ($100–$280)</option>
                <option value="3">VIP 3 ($240–$600)</option>
                <option value="4">VIP 4 ($500–$1,250)</option>
                <option value="5">VIP 5 ($1,100–$2,600)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 whitespace-nowrap">Price:</label>
              <input
                type="number"
                placeholder="Min $"
                value={filterPriceMin}
                min={0}
                onChange={(e) => {
                  setFilterPriceMin(e.target.value);
                  setProductPage(1 as any);
                }}
                className="w-20 px-2 py-1.5 bg-[#1a1f2e] border border-gray-600 rounded text-white text-xs focus:border-[#00D9FF] focus:outline-none"
              />
              <span className="text-gray-500 text-xs">–</span>
              <input
                type="number"
                placeholder="Max $"
                value={filterPriceMax}
                min={0}
                onChange={(e) => {
                  setFilterPriceMax(e.target.value);
                  setProductPage(1 as any);
                }}
                className="w-20 px-2 py-1.5 bg-[#1a1f2e] border border-gray-600 rounded text-white text-xs focus:border-[#00D9FF] focus:outline-none"
              />
            </div>
            {vipConfigurations.length > 0 && (
              <div className="text-xs text-gray-500 ml-auto">
                {vipConfigurations.map((v) => (
                  <span key={v.level} className="mr-3">VIP{v.level}: {(v.commission * 100).toFixed(1)}% commission</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Action Bar — visible when items selected */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 bg-[#1a2535] border border-[#00D9FF]/30 rounded-lg px-4 py-3">
          <button onClick={clearSelection} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
          <span className="text-white font-semibold text-sm">
            {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button
              onClick={() => { onBulkStatusUpdate(selectedArray, 'Active'); clearSelection(); }}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Set Active
            </button>
            <button
              onClick={() => { onBulkStatusUpdate(selectedArray, 'Paused'); clearSelection(); }}
              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Set Paused
            </button>
            <button
              onClick={() => { onBulkDelete(selectedArray); clearSelection(); }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
            >
              <Trash2 size={12} />
              Delete {selectedCount}
            </button>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {paginatedProducts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Package className="mx-auto mb-3 opacity-30" size={48} />
          <p className="text-lg">No products found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Select All for current page */}
          <div className="col-span-full flex items-center gap-2 text-xs text-gray-400">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              {pageAllSelected ? (
                <CheckSquare size={14} className="text-[#00D9FF]" />
              ) : (
                <Square size={14} />
              )}
              {pageAllSelected ? 'Deselect page' : 'Select page'}
            </button>
            {selectedCount > 0 && (
              <span className="text-[#00D9FF]">{selectedCount} selected</span>
            )}
          </div>

          {paginatedProducts.map((product) => {
            const productId = String(product.id);
            const isSelected = selectedIds.has(productId);
            const vipTier = normalizeNumber(product?.vipTier, 0);
            const tierColors = vipTier >= 1 && vipTier <= 5 ? VIP_TIER_COLORS[vipTier] : null;
            const productName = normalizeText(product?.product || product?.name, 'Unnamed product');
            const productSource = normalizeText(product?.source, 'Manual');
            const fallbackPublicProxyUrl = buildPublicImageFallbackProxyUrl(product?.image || product?.imageUrl);

            return (
              <div
                key={productId}
                className={`bg-[#252b3d] rounded-lg overflow-hidden transition-all group relative ${
                  isSelected
                    ? 'ring-2 ring-[#00D9FF] shadow-lg shadow-[#00D9FF]/10'
                    : 'hover:ring-2 hover:ring-[#00D9FF]/50'
                }`}
              >
                {/* Selection checkbox overlay */}
                <button
                  onClick={() => toggleSelect(productId)}
                  className="absolute top-2 left-2 z-10 w-6 h-6 bg-black/60 hover:bg-black/80 rounded flex items-center justify-center transition-colors"
                  aria-label={isSelected ? 'Deselect' : 'Select'}
                >
                  {isSelected ? (
                    <CheckSquare size={14} className="text-[#00D9FF]" />
                  ) : (
                    <Square size={14} className="text-gray-300" />
                  )}
                </button>

                <div className="relative">
                  <img
                    src={resolveProductImageSrc(product)}
                    alt={productName}
                    className="w-full h-44 object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const stage = target.dataset.fallbackStage ?? '';

                      if (stage !== 'public-proxy' && fallbackPublicProxyUrl && target.src !== fallbackPublicProxyUrl) {
                        target.dataset.fallbackStage = 'public-proxy';
                        target.src = fallbackPublicProxyUrl;
                        return;
                      }

                      if (stage !== 'placeholder') {
                        target.dataset.fallbackStage = 'placeholder';
                        target.src = PRODUCT_IMAGE_PLACEHOLDER;
                        return;
                      }

                      target.onerror = null;
                    }}
                    onLoad={(e) => {
                      e.currentTarget.dataset.fallbackStage = 'loaded';
                    }}
                  />
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {productSource === 'AI Generated' && (
                      <span className="px-2 py-0.5 bg-purple-500/90 backdrop-blur-sm text-white rounded text-[10px] font-semibold flex items-center gap-0.5">
                        <Sparkles size={10} />
                        AI
                      </span>
                    )}
                    {productSource === 'Bulk Import' && (
                      <span className="px-2 py-0.5 bg-green-600/90 backdrop-blur-sm text-white rounded text-[10px] font-semibold">
                        Import
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 backdrop-blur-sm text-white rounded text-[10px] font-semibold ${
                        normalizeText(product?.status, 'Inactive') === 'Active'
                          ? 'bg-green-500/90'
                          : 'bg-gray-500/90'
                      }`}
                    >
                      {normalizeText(product?.status, 'Inactive')}
                    </span>
                  </div>
                </div>

                <div className="p-3">
                  {/* VIP tier badge */}
                  {tierColors && (
                    <div className="mb-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${tierColors.bg} ${tierColors.text} ${tierColors.border}`}
                      >
                        VIP {vipTier}
                      </span>
                    </div>
                  )}

                  <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">{productName}</h3>

                  <div className="flex items-center gap-1 mb-2 text-xs text-gray-400">
                    <span>{normalizeText(product?.merchant, 'Marketplace')}</span>
                    {normalizeText(product?.category) && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span>{normalizeText(product?.category)}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-gray-500 text-[10px]">Value</p>
                      <p className="text-[#00D9FF] font-bold">${normalizeNumber(product?.price).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-[10px]">Commission</p>
                      <p className="text-green-400 font-bold">{(normalizeNumber(product?.commission) * 100).toFixed(2)}%</p>
                      <p className="text-green-300 text-[10px]">
                        +${(normalizeNumber(product?.price) * normalizeNumber(product?.commission)).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setSelectedItem(product); setModalType('view-product'); }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#1a1f2e] hover:bg-[#00D9FF] hover:text-[#1a1f2e] text-gray-300 rounded transition-colors text-xs"
                    >
                      <Eye size={12} />
                      View
                    </button>
                    <button
                      onClick={() => { setSelectedItem(product); setModalType('edit-product'); }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#1a1f2e] hover:bg-blue-500 hover:text-white text-gray-300 rounded transition-colors text-xs"
                    >
                      <Edit size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => { setSelectedItem(product); setModalType('delete-product'); }}
                      className="px-2 py-1.5 bg-[#1a1f2e] hover:bg-red-500 hover:text-white text-gray-300 rounded transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between bg-[#252b3d] px-6 py-4 rounded-lg">
        <p className="text-sm text-gray-400">
          Showing {filteredProducts.length === 0 ? 0 : productStartIndex + 1}
          –{Math.min(productStartIndex + paginatedProducts.length, filteredProducts.length)} of{' '}
          {filteredProducts.length} products
          {filteredProducts.length !== totalProducts && (
            <span className="text-gray-600"> (filtered from {totalProducts})</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous page"
            onClick={() => setProductPage((current) => Math.max(1, current - 1))}
            disabled={safeProductPage <= 1}
            className="px-3 py-1 bg-[#1a1f2e] border border-gray-600 text-gray-400 rounded hover:bg-[#2c3e50] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            Previous
          </button>
          <button aria-label={`Page ${safeProductPage} of ${totalProductPages}`} className="px-3 py-1 bg-[#00D9FF] text-[#1a1f2e] font-semibold rounded text-sm">
            {safeProductPage} / {totalProductPages}
          </button>
          <button
            aria-label="Next page"
            onClick={() => setProductPage((current) => Math.min(totalProductPages, current + 1))}
            disabled={safeProductPage >= totalProductPages}
            className="px-3 py-1 bg-[#1a1f2e] border border-gray-600 text-gray-400 rounded hover:bg-[#2c3e50] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
