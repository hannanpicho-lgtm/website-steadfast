import React from 'react';
import { Upload, Search, Download, Eye, Edit, Trash2, Package, Tag, Sparkles } from 'lucide-react';

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

interface ProductManagementProps {
  products: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  productPage: number;
  setProductPage: React.Dispatch<React.SetStateAction<number>>;
  productsPerPage: number;
  setSelectedItem: (item: any) => void;
  setModalType: any;
  handleExport: () => void;
}

export default function ProductManagement({
  products,
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
}: ProductManagementProps) {
  const normalizedSearchTerm = searchTerm.toLowerCase();
  const filteredProducts = products.filter(product => {
    const productName = normalizeText(product?.name, 'Unnamed product');
    const productCategory = normalizeText(product?.category, 'Uncategorized');
    const productMerchant = normalizeText(product?.merchant, 'Unknown merchant');
    const productSku = normalizeText(product?.sku, 'N/A');
    const productStatus = normalizeText(product?.status, 'Inactive');

    const matchesSearch = productName.toLowerCase().includes(normalizedSearchTerm) ||
                         productCategory.toLowerCase().includes(normalizedSearchTerm) ||
                         productMerchant.toLowerCase().includes(normalizedSearchTerm) ||
                         productSku.toLowerCase().includes(normalizedSearchTerm);
    const matchesFilter = filterStatus === 'all' || productStatus.toLowerCase() === filterStatus;
    return matchesSearch && matchesFilter;
  });
  const totalProducts = products.length;
  const activeProducts = products.filter((product) => normalizeText(product?.status) === 'Active').length;
  const aiGeneratedProducts = products.filter((product) => normalizeText(product?.source) === 'AI Generated').length;
  const manualProducts = products.filter((product) => normalizeText(product?.source) === 'Manual').length;
  const aiGeneratedPercent = totalProducts > 0 ? ((aiGeneratedProducts / totalProducts) * 100).toFixed(0) : '0';
  const manualPercent = totalProducts > 0 ? ((manualProducts / totalProducts) * 100).toFixed(0) : '0';
  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
  const safeProductPage = Math.min(productPage, totalProductPages);
  const productStartIndex = (safeProductPage - 1) * productsPerPage;
  const paginatedProducts = filteredProducts.slice(productStartIndex, productStartIndex + productsPerPage);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Product Management</h2>
          <p className="text-gray-400 text-sm mt-1">Manage product catalog with manual upload or AI generation</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setModalType('add-product-manual')} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
            <Upload size={18} />
            Add Manually
          </button>
          <button onClick={() => setModalType('add-product-ai')} className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
            <Sparkles size={18} />
            AI Generate
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="text-blue-400" size={18} />
            <p className="text-gray-400 text-xs">Total Products</p>
          </div>
          <p className="text-2xl font-bold text-white">{totalProducts}</p>
          <p className="text-gray-400 text-xs mt-1">{activeProducts} active</p>
        </div>
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="text-green-400" size={18} />
            <p className="text-gray-400 text-xs">Total Value</p>
          </div>
          <p className="text-2xl font-bold text-white">${products.reduce((sum, product) => sum + (normalizeNumber(product?.price) * normalizeNumber(product?.stock)), 0).toLocaleString()}</p>
          <p className="text-gray-400 text-xs mt-1">Inventory value</p>
        </div>
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-purple-400" size={18} />
            <p className="text-gray-400 text-xs">AI Generated</p>
          </div>
          <p className="text-2xl font-bold text-white">{aiGeneratedProducts}</p>
          <p className="text-gray-400 text-xs mt-1">{aiGeneratedPercent}% of total</p>
        </div>
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="text-blue-400" size={18} />
            <p className="text-gray-400 text-xs">Manual Upload</p>
          </div>
          <p className="text-2xl font-bold text-white">{manualProducts}</p>
          <p className="text-gray-400 text-xs mt-1">{manualPercent}% of total</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4 bg-[#252b3d] p-4 rounded-lg">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, category, merchant, or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF]"
          />
        </div>
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={handleExport} className="flex items-center gap-2 bg-[#1a1f2e] hover:bg-[#2c3e50] border border-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedProducts.map((product) => (
          <div key={product.id} className="bg-[#252b3d] rounded-lg overflow-hidden hover:ring-2 hover:ring-[#00D9FF] transition-all group">
            <div className="relative">
              <img src={normalizeText(product?.imageUrl, 'https://via.placeholder.com/400x300?text=Product')} alt={normalizeText(product?.name, 'Unnamed product')} className="w-full h-48 object-cover" />
              <div className="absolute top-2 right-2 flex gap-2">
                {normalizeText(product?.source) === 'AI Generated' && (
                  <span className="px-2 py-1 bg-purple-500/90 backdrop-blur-sm text-white rounded text-xs font-semibold flex items-center gap-1">
                    <Sparkles size={12} />
                    AI
                  </span>
                )}
                <span className={`px-2 py-1 backdrop-blur-sm text-white rounded text-xs font-semibold ${
                  normalizeText(product?.status, 'Inactive') === 'Active' ? 'bg-green-500/90' : 'bg-gray-500/90'
                }`}>
                  {normalizeText(product?.status, 'Inactive')}
                </span>
              </div>
              {normalizeNumber(product?.stock) === 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-red-400 font-bold text-lg">OUT OF STOCK</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="mb-3">
                <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">{normalizeText(product?.name, 'Unnamed product')}</h3>
                <p className="text-gray-400 text-xs line-clamp-2">{normalizeText(product?.description, 'No description available')}</p>
              </div>
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-gray-400">{normalizeText(product?.category, 'Uncategorized')}</span>
                <span className="text-gray-500">SKU: {normalizeText(product?.sku, 'N/A')}</span>
              </div>
              <div className="flex items-center gap-2 mb-3 text-xs">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">{normalizeText(product?.merchant, 'Unknown merchant')}</span>
                <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded">{normalizeNumber(product?.stock)} in stock</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-400 text-xs">Price</p>
                  <p className="text-[#00D9FF] font-bold text-lg">${normalizeNumber(product?.price).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Commission</p>
                  <p className="text-green-400 font-bold text-lg">{(normalizeNumber(product?.commission) * 100).toFixed(1)}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setSelectedItem(product); setModalType('view-product'); }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#1a1f2e] hover:bg-[#00D9FF] hover:text-[#1a1f2e] text-gray-300 rounded transition-colors text-xs"
                >
                  <Eye size={14} />
                  View
                </button>
                <button 
                  onClick={() => { setSelectedItem(product); setModalType('edit-product'); }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#1a1f2e] hover:bg-blue-500 hover:text-white text-gray-300 rounded transition-colors text-xs"
                >
                  <Edit size={14} />
                  Edit
                </button>
                <button 
                  onClick={() => { setSelectedItem(product); setModalType('delete-product'); }}
                  className="px-3 py-2 bg-[#1a1f2e] hover:bg-red-500 hover:text-white text-gray-300 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-[#252b3d] px-6 py-4 rounded-lg">
        <p className="text-sm text-gray-400">
          Showing {filteredProducts.length === 0 ? 0 : productStartIndex + 1}
          -{Math.min(productStartIndex + paginatedProducts.length, filteredProducts.length)} of {filteredProducts.length} products
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setProductPage((current) => Math.max(1, current - 1))}
            disabled={safeProductPage <= 1}
            className="px-3 py-1 bg-[#1a1f2e] border border-gray-600 text-gray-400 rounded hover:bg-[#2c3e50] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button className="px-3 py-1 bg-[#00D9FF] text-[#1a1f2e] font-semibold rounded">
            {safeProductPage} / {totalProductPages}
          </button>
          <button
            onClick={() => setProductPage((current) => Math.min(totalProductPages, current + 1))}
            disabled={safeProductPage >= totalProductPages}
            className="px-3 py-1 bg-[#1a1f2e] border border-gray-600 text-gray-400 rounded hover:bg-[#2c3e50] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
