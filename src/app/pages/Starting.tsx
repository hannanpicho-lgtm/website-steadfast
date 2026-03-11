import { UserCircle, Rocket, CreditCard, Snowflake, Loader2, Lock, AlertTriangle, DollarSign } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';

// Product data for carousel
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
  balance: number;
  todayCommission: number;
  holdAmount: number;
  luckyBonus: number;
  tasksCompleted: number;
  tasksLimit: number;
  isFrozen?: boolean;
  activePremium?: any;
  premiumQueue?: any[];
}

// Starting page - Product submission platform with commission tracking
export default function Starting() {
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastCommission, setLastCommission] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  
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

  // Get current product to submit
  const currentProduct = products[currentProductIndex % products.length];
  const commissionRate = userData ? commissionRates[userData.vipLevel] || 0.5 : 0.5;
  const estimatedCommission = currentProduct.price * (commissionRate / 100);

  // Fetch user data on mount
  useEffect(() => {
    if (!sessionUsername) {
      navigate('/login');
      return;
    }
    fetchUserData();
  }, [navigate, sessionUsername]);

  const fetchUserByName = async (name: string) => {
    const response = await fetch(`${serverUrl}/user/${name}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    return response.json();
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      let data;
      try {
        data = await fetchUserByName(username);
      } catch {
        // Fallback keeps dashboard usable for newly registered local users.
        data = await fetchUserByName('ugreen');
      }
      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTask = async () => {
    if (!userData || submitting) return;
    
    if (userData.tasksCompleted >= userData.tasksLimit) {
      alert('Daily task limit reached! Please come back tomorrow.');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch(`${serverUrl}/submit-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          username,
          productPrice: currentProduct.price,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit task');
      }
      
      const result = await response.json();
      
      // Update user data with new values
      setUserData({
        ...userData,
        tasksCompleted: result.tasksCompleted,
        balance: result.balance,
        todayCommission: result.todayCommission,
        luckyBonus: result.luckyBonus,
      });
      
      // Show success message
      setLastCommission(result.commission);
      setIsPremium(result.isPremium);
      setShowSuccess(true);
      
      // Move to next product
      setCurrentProductIndex((prev) => prev + 1);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting task:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center bg-[#1a1f2e]">
        <Loader2 className="animate-spin text-[#00D9FF]" size={48} />
      </div>
    );
  }

  return (
    <div className="size-full overflow-auto pb-20 bg-[#1a1f2e]">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Ticker Banner */}
      <div className="bg-[#00D9FF] text-[#1a1f2e] py-3 px-6 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap font-semibold">
          <span className="mx-8">SleepAre8: user wins 77.00 USD prize in the task</span>
          <span className="mx-8">Fugene55: user wins 15,257.00 USD prize in the task</span>
          <span className="mx-8">jhoman1988: user wins prize in the task</span>
          <span className="mx-8">SleepAre8: user wins 77.00 USD prize in the task</span>
          <span className="mx-8">Fugene55: user wins 15,257.00 USD prize in the task</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Greeting Section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-400">Hello,</p>
            <h1 className="text-2xl font-bold text-white">ugreen</h1>
          </div>
          <Link 
            to="/vip-levels"
            className="flex items-center gap-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white px-4 py-2 rounded-full hover:from-orange-500 hover:to-orange-600 transition-all cursor-pointer"
          >
            <span className="font-bold">VIP1</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
          </Link>
        </div>

        {/* Product Carousel */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm overflow-hidden">
          <div className="flex gap-6 animate-carousel">
            {/* Product 1 */}
            <div className="flex-shrink-0 w-full max-w-sm">
              <div className="flex items-center justify-center mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop" 
                  alt="Headphones" 
                  className="max-w-[200px] w-full object-contain"
                />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold mb-2 line-clamp-2">
                  Premium Wireless Headphones with Noise Cancellation, 30-hour battery life, Studio quality sound...
                </h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-sm font-semibold">4.5</span>
                  </div>
                </div>
                <p className="text-xl font-bold">Price: 299.99 USD</p>
              </div>
            </div>

            {/* Product 2 */}
            <div className="flex-shrink-0 w-full max-w-sm">
              <div className="flex items-center justify-center mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=300&fit=crop" 
                  alt="Smart Watch" 
                  className="max-w-[200px] w-full object-contain"
                />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold mb-2 line-clamp-2">
                  Smart Watch Pro with fitness tracking, heart rate monitor, GPS navigation, waterproof design...
                </h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-sm font-semibold">4.2</span>
                  </div>
                </div>
                <p className="text-xl font-bold">Price: 399.00 USD</p>
              </div>
            </div>

            {/* Product 3 */}
            <div className="flex-shrink-0 w-full max-w-sm">
              <div className="flex items-center justify-center mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=300&fit=crop" 
                  alt="Tablet" 
                  className="max-w-[200px] w-full object-contain"
                />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold mb-2 line-clamp-2">
                  10-inch Tablet with 128GB storage, 8GB RAM, high-resolution display, perfect for work and entertainment...
                </h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-sm font-semibold">4.1</span>
                  </div>
                </div>
                <p className="text-xl font-bold">Price: 549.99 USD</p>
              </div>
            </div>

            {/* Product 4 */}
            <div className="flex-shrink-0 w-full max-w-sm">
              <div className="flex items-center justify-center mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop" 
                  alt="Headphones" 
                  className="max-w-[200px] w-full object-contain"
                />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold mb-2 line-clamp-2">
                  Premium Wireless Headphones with Noise Cancellation, 30-hour battery life, Studio quality sound...
                </h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-sm font-semibold">4.5</span>
                  </div>
                </div>
                <p className="text-xl font-bold">Price: 299.99 USD</p>
              </div>
            </div>

            {/* Duplicate first product for seamless loop */}
            <div className="flex-shrink-0 w-full max-w-sm">
              <div className="flex items-center justify-center mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop" 
                  alt="Headphones" 
                  className="max-w-[200px] w-full object-contain"
                />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold mb-2 line-clamp-2">
                  Premium Wireless Headphones with Noise Cancellation, 30-hour battery life, Studio quality sound...
                </h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-sm font-semibold">4.5</span>
                  </div>
                </div>
                <p className="text-xl font-bold">Price: 299.99 USD</p>
              </div>
            </div>
          </div>
        </div>

        {/* FREEZE BANNER - Premium Bundle Assigned */}
        {userData?.isFrozen && userData?.activePremium && (
          <div className="bg-gradient-to-br from-red-600 to-orange-600 border-4 border-yellow-400 rounded-lg p-6 mb-6 shadow-2xl animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <Lock className="text-yellow-300" size={32} />
              <h2 className="text-2xl font-bold text-white text-center">🔒 ACCOUNT FROZEN</h2>
              <Lock className="text-yellow-300" size={32} />
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
              <h3 className="text-yellow-300 font-bold text-lg mb-3 text-center">Premium Bundle Assigned</h3>
              
              {/* Premium Product */}
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">Premium Product:</span>
                  <span className="text-white font-bold text-xl">${userData.activePremium.premiumProductValue.toFixed(2)}</span>
                </div>
              </div>

              {/* Bundled Products */}
              <div className="mb-3">
                <p className="text-white font-semibold mb-2">Bundled Products:</p>
                <div className="space-y-2">
                  {userData.activePremium.bundledProducts.map((product: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 bg-white/20 rounded p-2">
                      <img src={product.image} alt={product.name} className="w-12 h-12 object-contain rounded" />
                      <div className="flex-1">
                        <p className="text-white text-sm font-semibold line-clamp-1">{product.name.split(',')[0]}</p>
                      </div>
                      <span className="text-white font-bold">${product.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Details */}
              <div className="border-t border-white/30 pt-3 space-y-2">
                <div className="flex items-center justify-between text-white">
                  <span>Total Bundle Value:</span>
                  <span className="font-bold text-lg">${userData.activePremium.totalBundleValue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-white">
                  <span>Balance Before:</span>
                  <span className="font-bold">${userData.activePremium.balanceBeforeAssignment.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-yellow-300 text-lg">
                  <span className="font-bold">Current Balance:</span>
                  <span className="font-bold">
                    {userData.balance < 0 ? '-' : ''}${Math.abs(userData.balance).toFixed(2)} 
                    {userData.balance < 0 && ' (NEGATIVE)'}
                  </span>
                </div>
              </div>

              {/* Top-up Warning */}
              {userData.activePremium.negativeAmount > 0 && (
                <div className="bg-red-500 rounded-lg p-3 mt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="text-white" size={20} />
                    <span className="text-white font-bold">Top-up Required:</span>
                  </div>
                  <div className="text-center">
                    <span className="text-white font-bold text-2xl">${userData.activePremium.topUpRequired.toFixed(2)}</span>
                  </div>
                  <Link to="/deposit" className="block mt-2 bg-white text-red-600 font-bold py-2 px-4 rounded text-center hover:bg-gray-100 transition-colors">
                    <DollarSign className="inline mr-1" size={18} />
                    Deposit Now
                  </Link>
                </div>
              )}

              {/* Task Progress */}
              <div className="mt-4 bg-white/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">Complete Tasks to Unlock:</span>
                  <span className="text-yellow-300 font-bold">{userData.activePremium.tasksCompleted} / {userData.activePremium.totalTasks}</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: userData.activePremium.totalTasks }).map((_, index) => (
                    <div 
                      key={index} 
                      className={`flex-1 h-2 rounded ${index < userData.activePremium.tasksCompleted ? 'bg-green-500' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Commission Earned */}
              <div className="mt-3 text-center">
                <p className="text-white text-sm mb-1">Commission Earned So Far:</p>
                <p className="text-green-300 font-bold text-xl">${userData.activePremium.commissionEarned.toFixed(2)} (VIP{userData.vipLevel} {commissionRate}%)</p>
              </div>

              {/* Queue Info */}
              {userData.premiumQueue && userData.premiumQueue.length > 1 && (
                <div className="mt-3 bg-purple-500/50 rounded p-2 text-center">
                  <p className="text-white text-sm">
                    ⏳ {userData.premiumQueue.length - 1} more premium bundle{userData.premiumQueue.length > 2 ? 's' : ''} in queue
                  </p>
                </div>
              )}
            </div>

            <p className="text-white text-xs text-center italic">
              Account will unlock after completing all bundled tasks or depositing the required top-up amount
            </p>
          </div>
        )}

        {/* Current Product to Submit */}
        <div className="bg-gradient-to-br from-[#252d42] to-[#1a1f2e] border border-[#00D9FF]/30 rounded-lg p-6 mb-6 shadow-xl">
          <h3 className="text-[#00D9FF] font-bold text-lg mb-4 text-center">Next Product to Submit</h3>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center mb-3">
              <img 
                src={currentProduct.image} 
                alt={currentProduct.name.split(',')[0]} 
                className="max-w-[150px] w-full object-contain"
              />
            </div>
            <div className="text-center">
              <h4 className="text-sm font-semibold mb-2 line-clamp-2 text-gray-800">
                {currentProduct.name}
              </h4>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span>
                  <span className="text-sm font-semibold text-gray-700">{currentProduct.rating}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#1a1f2e] rounded-lg p-4 border border-[#00D9FF]/20">
              <p className="text-gray-400 text-xs mb-1">Product Value</p>
              <p className="text-white font-bold text-lg">${currentProduct.price.toFixed(2)}</p>
            </div>
            <div className="bg-[#1a1f2e] rounded-lg p-4 border border-[#00D9FF]/20">
              <p className="text-gray-400 text-xs mb-1">VIP Level</p>
              <p className="text-white font-bold text-lg">VIP{userData?.vipLevel || 1}</p>
            </div>
          </div>

          {/* Commission Details */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-semibold">Commission Rate:</p>
              <p className="text-white font-bold text-xl">{commissionRate}%</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold">Estimated Profit:</p>
              <p className="text-white font-bold text-2xl">${estimatedCommission.toFixed(2)}</p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-yellow-400 text-xs text-center">
              💡 5% chance for premium products with 10x commission bonus!
            </p>
          </div>
        </div>

        {/* Starting Button */}
        <button 
          className={`w-full bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-4 rounded-lg mb-6 text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${submitting ? 'animate-pulse' : ''}`}
          onClick={handleSubmitTask}
          disabled={submitting || (userData?.tasksCompleted >= userData?.tasksLimit)}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={24} />
              Submitting...
            </span>
          ) : (
            `Starting (${userData?.tasksCompleted || 0} / ${userData?.tasksLimit || 40})`
          )}
        </button>

        {/* Success Notification */}
        {showSuccess && (
          <div className={`mb-6 p-4 rounded-lg text-center font-bold animate-bounce ${isPremium ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : 'bg-green-500 text-white'}`}>
            {isPremium ? '🎉 PREMIUM PRODUCT! 10X COMMISSION! 🎉' : '✅ Task Submitted Successfully!'}
            <div className="text-2xl mt-2">+${lastCommission.toFixed(2)} USD</div>
          </div>
        )}

        {/* Commission Panel */}
        <div className="bg-gradient-to-br from-[#00D9FF] to-[#00a8cc] rounded-lg p-6 text-[#1a1f2e] mb-6">
          {/* Today's Commission */}
          <div className="text-center mb-6">
            <Rocket className="mx-auto mb-2" size={40} />
            <h3 className="text-lg font-semibold mb-1">TODAY'S COMMISSION</h3>
            <p className="text-3xl font-bold mb-1">{(userData?.todayCommission || 0).toFixed(2)} USD</p>
            <p className="text-sm opacity-90">The displayed amount reflects today's earned commissions.</p>
          </div>

          <div className="border-t border-[#1a1f2e]/30 my-6"></div>

          {/* Balance and Hold Amount */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="text-center">
              <CreditCard className="mx-auto mb-2" size={32} />
              <h4 className="font-semibold mb-1">BALANCE</h4>
              <p className="text-2xl font-bold mb-1">{(userData?.balance || 0).toFixed(2)} USD</p>
              <p className="text-xs opacity-90">The total balance reflects both the deposited amount and earned commissions.</p>
            </div>
            <div className="text-center">
              <Snowflake className="mx-auto mb-2" size={32} />
              <h4 className="font-semibold mb-1">Hold Amount</h4>
              <p className="text-2xl font-bold mb-1">{(userData?.holdAmount || 0).toFixed(2)} USD</p>
              <p className="text-xs opacity-90">Contact Support for inquiries</p>
            </div>
          </div>

          <div className="border-t border-[#1a1f2e]/30 my-6"></div>

          {/* Special Lucky Bonus */}
          <div className="text-center">
            <h4 className="font-semibold mb-1">Special Lucky Bonus</h4>
            <p className="text-2xl font-bold">{(userData?.luckyBonus || 0).toFixed(2)} USD</p>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-white rounded-lg p-6 text-center shadow-sm mb-6">
          <h3 className="text-xl font-bold mb-2">Important Notice</h3>
          <p className="text-sm text-gray-700 mb-1">Online Support Hours: 9:00 - 23:00</p>
          <p className="text-sm text-gray-700">Please contact online support for your assistance</p>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-400 mb-6">
          <p>© 2026 Steadfast Digital, Inc. All rights reserved</p>
        </div>
      </div>

      {/* Live Chat Box */}
      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}