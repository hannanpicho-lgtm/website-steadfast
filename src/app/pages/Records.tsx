import { UserCircle, ChevronLeft, Package, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';

// Product data - same as Starting page
const products = [
  {
    id: 1,
    name: 'Premium Wireless Headphones with Noise Cancellation, 30-hour battery life, Studio quality sound...',
    price: 299.99,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop'
  },
  {
    id: 2,
    name: 'Smart Watch Pro with fitness tracking, heart rate monitor, GPS navigation, waterproof design...',
    price: 399.00,
    rating: 4.2,
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=300&fit=crop'
  },
  {
    id: 3,
    name: '10-inch Tablet with 128GB storage, 8GB RAM, high-resolution display, perfect for work and entertainment...',
    price: 549.99,
    rating: 4.1,
    image: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=300&fit=crop'
  }
];

interface UserData {
  username: string;
  vipLevel: number;
  tasksCompleted: number;
  tasksLimit: number;
}

interface TaskRecord {
  username: string;
  productPrice: number;
  commission: number;
  isPremium: boolean;
  timestamp: string;
  tasksCompleted: number;
}

export default function Records() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const sessionUsername = getCurrentUsername();
  const username = sessionUsername ?? 'ugreen';
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  // VIP commission rates
  const commissionRates: Record<number, number> = {
    1: 0.5,   // 0.5%
    2: 1.0,   // 1%
    3: 1.5,   // 1.5%
    4: 2.0,   // 2%
    5: 2.5    // 2.5%
  };

  useEffect(() => {
    if (!sessionUsername) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate, sessionUsername]);

  const fetchUser = async (name: string) => {
    const userResponse = await fetch(`${serverUrl}/user/${name}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data');
    }
    return userResponse.json();
  };

  const fetchTasks = async (name: string) => {
    const tasksResponse = await fetch(`${serverUrl}/tasks/${name}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    if (!tasksResponse.ok) {
      throw new Error('Failed to fetch tasks');
    }
    return tasksResponse.json();
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      try {
        const [user, tasks] = await Promise.all([fetchUser(username), fetchTasks(username)]);
        setUserData(user);
        setTaskRecords(tasks);
      } catch {
        const [user, tasks] = await Promise.all([fetchUser('ugreen'), fetchTasks('ugreen')]);
        setUserData(user);
        setTaskRecords(tasks);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get completed products (products that were submitted)
  const completedProducts = taskRecords.map((task, index) => {
    const productIndex = index % products.length;
    return {
      ...products[productIndex],
      commission: task.commission,
      isPremium: task.isPremium,
      timestamp: task.timestamp,
      submittedPrice: task.productPrice
    };
  });

  // Get pending products (remaining products to submit today)
  const pendingCount = (userData?.tasksLimit || 40) - (userData?.tasksCompleted || 0);
  const pendingProducts = Array.from({ length: pendingCount }, (_, index) => {
    const productIndex = ((userData?.tasksCompleted || 0) + index) % products.length;
    const product = products[productIndex];
    const commissionRate = commissionRates[userData?.vipLevel || 1] || 0.5;
    const estimatedCommission = product.price * (commissionRate / 100);
    
    return {
      ...product,
      estimatedCommission,
      commissionRate
    };
  });

  // Determine which products to show based on active tab
  const getFilteredProducts = () => {
    if (activeTab === 'completed') {
      return completedProducts;
    } else if (activeTab === 'pending') {
      return pendingProducts;
    } else {
      // All - show both completed and pending
      return [...completedProducts, ...pendingProducts];
    }
  };

  const filteredProducts = getFilteredProducts();

  return (
    <div className="size-full overflow-auto pb-20 bg-white">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Back Button and Title */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="bg-[#0066b3] text-white p-2 rounded hover:bg-[#0052a3] transition-colors justify-self-start"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0066b3] text-center">Records</h1>
          <div className="w-9" aria-hidden="true"></div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 sm:py-3 rounded text-sm sm:text-base font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-[#0066b3] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 sm:py-3 rounded text-sm sm:text-base font-semibold transition-colors ${
              activeTab === 'pending'
                ? 'bg-[#0066b3] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-2 sm:py-3 rounded text-sm sm:text-base font-semibold transition-colors ${
              activeTab === 'completed'
                ? 'bg-[#0066b3] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Records List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-[#0066b3]" />
              <p className="text-xl font-bold text-gray-600 mb-2">Loading...</p>
              <p className="text-gray-500">Fetching your records</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <p className="text-xl font-bold text-gray-600 mb-2">No more data</p>
              <p className="text-gray-500">
                {activeTab === 'completed' && 'You haven\'t submitted any products yet'}
                {activeTab === 'pending' && 'All tasks completed for today!'}
                {activeTab === 'all' && 'No records available'}
              </p>
            </div>
          ) : (
            filteredProducts.map((product, index) => {
              const isCompleted = 'commission' in product;
              const isPending = 'estimatedCommission' in product;
              
              return (
                <div 
                  key={`${product.id}-${index}`} 
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <img 
                        src={product.image} 
                        alt={product.name.split(',')[0]} 
                        className="w-20 h-20 object-contain rounded"
                      />
                    </div>
                    
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500 text-sm">⭐</span>
                          <span className="text-xs text-gray-600">{product.rating}</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-800">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>

                      {/* Commission Info */}
                      <div className="space-y-1">
                        {isCompleted && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Commission:</span>
                              <span className="text-sm font-bold text-green-600">
                                +${product.commission.toFixed(2)}
                              </span>
                            </div>
                            {product.isPremium && (
                              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded inline-block">
                                🎉 PREMIUM 10X
                              </div>
                            )}
                          </>
                        )}
                        
                        {isPending && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Est. Commission:</span>
                              <span className="text-sm font-bold text-blue-600">
                                ${product.estimatedCommission.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Rate:</span>
                              <span className="text-xs font-semibold text-gray-700">
                                {product.commissionRate}% (VIP{userData?.vipLevel})
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0 flex flex-col items-end justify-between">
                      {isCompleted ? (
                        <>
                          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                            <CheckCircle size={12} />
                            Completed
                          </div>
                          {product.timestamp && (
                            <span className="text-xs text-gray-400 mt-2">
                              {new Date(product.timestamp).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Clock size={12} />
                          Pending
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Live Chat Box */}
      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}