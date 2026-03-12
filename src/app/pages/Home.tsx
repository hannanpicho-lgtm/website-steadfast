import { useState } from 'react';
import { Link } from 'react-router';
import { Gift, Calendar, ArrowDownToLine, Wallet, ScrollText, Award, HelpCircle, Info } from 'lucide-react';
import { Header } from '../components/Header';
import { LiveChat } from '../components/LiveChat';
import { BottomNavigation } from '../components/BottomNavigation';
import { ChatNotificationBadge } from '../components/ChatNotificationBadge';
import globalImage from '../../assets/1cbf981c77f37e78708a06ee7a7737a1add4db70.png';
import steadfastLogo from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';
import gladzyOwletUbsImg from '../../assets/12f5de16e3bd12e9f21217623982c3c1698003e7.png';
import blastRoosterBoxedImg from '../../assets/5271b6862b412e3ac4a743b8cdf2a4ab80e806a0.png';
import boxedPetPlateVitaminImg from '../../assets/740c385d72ae1fb45975a181493bcb6a217983d2.png';
import { getCurrentUsername } from '../services/referralSystem';

// Client card data
const clientLogos = [
  { src: steadfastLogo, alt: 'Steadfast Digital', isMain: true },
  { src: gladzyOwletUbsImg, alt: 'GLADZY, Owlet, UBS', isMain: false },
  { src: blastRoosterBoxedImg, alt: 'BLAST, Black Rooster, BOXED', isMain: false },
  { src: boxedPetPlateVitaminImg, alt: 'BOXED, PET PLATE, The Vitamin Shoppe', isMain: false },
];

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const username = getCurrentUsername() ?? 'ugreen';

  return (
    <div className="size-full overflow-auto pb-20 bg-[#1a1f2e]">
      {/* Header with Navigation */}
      <div className="bg-[#1a1f2e] border-b border-gray-700/30">
        <Header onContactClick={() => setIsChatOpen(true)} />
        
        {/* Navigation Bar */}
        <nav className="max-w-7xl mx-auto px-6 pb-4 hidden md:flex items-center gap-8 justify-center">
          <Link to="/about" className="text-sm text-white hover:text-[#00D9FF] transition-colors">Who We Are</Link>
          <a href="#areas-of-focus" className="text-sm text-white hover:text-[#00D9FF] transition-colors">Areas of Focus</a>
          <a href="#how-it-works" className="text-sm text-white hover:text-[#00D9FF] transition-colors">How It Works</a>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[500px] flex flex-col items-center justify-center bg-gradient-to-br from-[#2a3f5f] via-[#1a1f2e] to-[#3d2a4a] overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto transform -translate-x-1/2 -translate-y-1/2 object-cover"
            style={{
              filter: 'brightness(0.4) contrast(1.1) saturate(0.8) hue-rotate(200deg)'
            }}
          >
            <source src="https://imagine-public.x.ai/imagine-public/share-videos/a3612b1a-ba58-4437-9515-779c1ee1fe9e.mp4" type="video/mp4" />
            {/* Fallback for browsers that don't support video */}
            Your browser does not support the video tag.
          </video>
          {/* Dual-layer overlay for better color matching and text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e]/70 via-[#2a3f5f]/60 to-[#1a1f2e]/75"></div>
          <div className="absolute inset-0 bg-[#00D9FF]/5"></div>
        </div>

        {/* Abstract background pattern (now layered on top of video) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-[#00D9FF] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 text-center text-white px-6 py-20">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl" style={{ textShadow: '0 0 30px rgba(93, 173, 226, 0.5), 0 4px 20px rgba(0, 0, 0, 0.8)' }}>Steadfast Digital</h1>
          <p className="text-xl md:text-2xl mb-4 font-light drop-shadow-2xl" style={{ textShadow: '0 0 20px rgba(93, 173, 226, 0.3), 0 2px 15px rgba(0, 0, 0, 0.8)' }}>a Performance-driven Digital Marketing Agency</p>
          <p className="text-lg mb-8 text-gray-200 drop-shadow-2xl" style={{ textShadow: '0 0 15px rgba(93, 173, 226, 0.3), 0 2px 10px rgba(0, 0, 0, 0.8)' }}>Data Optimization Platform for E-commerce Growth</p>
          <Link 
            to="/starting"
            className="inline-block bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-8 py-3 rounded font-bold text-sm tracking-wider transition-all duration-300 shadow-2xl hover:shadow-[0_0_30px_rgba(0,217,255,0.6)] hover:scale-105"
          >
            GET STARTED
          </Link>
        </div>
      </section>

      {/* Intro Section */}
      <section className="py-16 px-6 max-w-4xl mx-auto text-center bg-[#1a1f2e]">
        <h2 className="text-4xl font-bold mb-6 text-white">Product Data Optimization Platform</h2>
        <p className="text-gray-300 text-lg leading-relaxed mb-4">
          We are a performance-driven agency dedicated to serving the digital marketing needs of start-ups and emerging brands.
        </p>
        <p className="text-gray-300 text-lg leading-relaxed">
          Users provide real optimization data for partner merchants on platforms like Amazon, Walmart, and more—increasing product exposure and conversion rates while earning generous commissions.
        </p>
      </section>

      {/* Services Grid */}
      <section className="py-8 px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/vip-levels">
            <ServiceCard icon={<Gift size={32} />} title="VIP" />
          </Link>
          <Link to="/activity">
            <ServiceCard icon={<Calendar size={32} />} title="Activity" />
          </Link>
          <Link to="/withdrawal">
            <ServiceCard icon={<ArrowDownToLine size={32} />} title="Withdrawal" />
          </Link>
          <Link to="/deposit">
            <ServiceCard icon={<Wallet size={32} />} title="Deposit" />
          </Link>
          <Link to="/terms-conditions">
            <ServiceCard icon={<ScrollText size={32} />} title="T & C" />
          </Link>
          <Link to="/certificate">
            <ServiceCard icon={<Award size={32} />} title="Certificate" />
          </Link>
          <Link to="/faqs">
            <ServiceCard icon={<HelpCircle size={32} />} title="FAQs" />
          </Link>
          <Link to="/about">
            <ServiceCard icon={<Info size={32} />} title="About" />
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 px-6 bg-[#252b3d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#1a1f2e] p-8 rounded-lg border border-gray-700/30">
              <div className="w-16 h-16 bg-[#00D9FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-[#1a1f2e] text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white text-center">Sign Up & Choose VIP Level</h3>
              <p className="text-gray-300 text-center">
                Register for an account and select your VIP level based on your investment capacity. Higher VIP levels unlock greater earning potential and more daily tasks.
              </p>
            </div>
            <div className="bg-[#1a1f2e] p-8 rounded-lg border border-gray-700/30">
              <div className="w-16 h-16 bg-[#00D9FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-[#1a1f2e] text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white text-center">Submit Product Data</h3>
              <p className="text-gray-300 text-center">
                Complete optimization tasks by submitting product data for our partner merchants on platforms like Amazon, Walmart, and other e-commerce sites.
              </p>
            </div>
            <div className="bg-[#1a1f2e] p-8 rounded-lg border border-gray-700/30">
              <div className="w-16 h-16 bg-[#00D9FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-[#1a1f2e] text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white text-center">Earn Commissions</h3>
              <p className="text-gray-300 text-center">
                Earn up to 2.5% commission on normal products and 10x profit on premium combination products. Withdraw anytime after completing daily tasks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VIP Benefits Overview */}
      <section className="py-16 px-6 bg-[#1a1f2e]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-white">VIP Worker Benefits</h2>
          <div className="bg-[#252b3d] rounded-lg border border-gray-700/30 p-8">
            <p className="text-gray-300 leading-relaxed mb-6">
              VIP workers can receive higher task benefits, and premium task benefits of each level are different. As the level increases, the benefits will also increase. If a negative number appears in the premium task during the process, the commission will also increase accordingly.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-l-4 border-[#00D9FF] pl-4">
                <h3 className="font-bold text-lg mb-2 text-[#00D9FF]">VIP 1-2</h3>
                <p className="text-gray-300 text-sm">Entry level workers earning 0.5% - 1% commission per task with up to 40 product orders daily</p>
              </div>
              <div className="border-l-4 border-[#00D9FF] pl-4">
                <h3 className="font-bold text-lg mb-2 text-[#00D9FF]">VIP 3-4</h3>
                <p className="text-gray-300 text-sm">Intermediate workers earning 1.5% - 2% commission with up to 120 orders per day</p>
              </div>
              <div className="border-l-4 border-[#00D9FF] pl-4">
                <h3 className="font-bold text-lg mb-2 text-[#00D9FF]">VIP 5</h3>
                <p className="text-gray-300 text-sm">Premium workers earning 2.5% commission with unlimited daily orders and exclusive bonuses</p>
              </div>
              <div className="border-l-4 border-[#00D9FF] pl-4">
                <h3 className="font-bold text-lg mb-2 text-[#00D9FF]">Daily Work Rewards</h3>
                <p className="text-gray-300 text-sm">Complete 2 sets of reset tasks to generate valid workdays and earn stable base salary income</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section className="bg-[#252b3d] py-16 border-y border-gray-700/30">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-white mb-12">Who We Are</h2>
          
          {/* Welcome to Steadfast Digital */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
            <div className="text-white space-y-4">
              <h3 className="text-2xl font-bold mb-4 text-[#00D9FF]">Welcome to Steadfast Digital</h3>
              <p className="text-gray-300 leading-relaxed">
                We are a performance-driven agency dedicated to serving the digital marketing needs of start-ups and emerging brands.
              </p>
              <p className="text-gray-300 leading-relaxed">
                We aim to amplify your digital presence by identifying and engaging your target audience at minimal acquisition costs.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Most of our clientele, spanning e-commerce and service sectors, choose us for our data-driven approach and proven track record of paid media success.
              </p>
            </div>
            <div className="flex justify-center">
              <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M60 40 L140 80 L140 140 L100 180 L40 140 L60 80 Z" fill="#00D9FF" opacity="0.3"/>
                <path d="M80 60 L140 90 L130 150 L80 170 L50 130 Z" fill="#00D9FF" opacity="0.6"/>
                <path d="M100 80 L130 100 L120 140 L90 150 L70 120 Z" fill="#00D9FF"/>
              </svg>
            </div>
          </div>

          {/* Strategic Insights */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="relative overflow-hidden rounded-lg">
              <img 
                src={globalImage}
                alt="Strategic Insights" 
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
            <div className="bg-[#2d3548] p-8 rounded-lg text-white border border-gray-600/40 hover:border-[#00D9FF]/40 transition-colors">
              <h3 className="text-2xl font-bold mb-4">Strategic Insights</h3>
              <p className="mb-4 leading-relaxed">
                In today's dynamic landscape, mastering channels like Google, Meta and TikTok feels like navigating a complex ecosystem.
              </p>
              <p className="leading-relaxed">
                Algorithms evolve, audiences fragment and success demands both channel expertise and a holistic approach. That's where we come in.
              </p>
            </div>
          </div>

          {/* Personalized tactics */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#1a1f2e] p-8 rounded-lg text-white order-2 md:order-1 border border-gray-700/30">
              <h3 className="text-2xl font-bold mb-4 text-[#00D9FF]">Personalized tactics</h3>
              <p className="leading-relaxed text-gray-300">
                Forget one-size-fits-all marketing. We dive into your audience's unique wants and needs, crafting personalized copy and experiences that resonate deeply and it's at the heart of our success.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-lg order-1 md:order-2">
              <img 
                src="https://images.unsplash.com/photo-1630487656049-6db93a53a7e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHRlYW0lMjBtZWV0aW5nJTIwb2ZmaWNlfGVufDF8fHx8MTc3MjkwMjM4NXww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Personalized tactics" 
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Areas of Focus Section */}
      <section id="areas-of-focus" className="bg-[#1a1f2e] py-16 border-b border-gray-700/30">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-white mb-12">Areas of Focus</h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Search Engine Marketing */}
            <div className="bg-[#2d3548] p-8 rounded-lg text-white border border-gray-600/30 hover:border-[#00D9FF]/40 transition-colors">
              <h3 className="text-xl font-bold mb-6 border-b border-gray-600 pb-4">Search Engine<br/>Marketing</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Google Ads & Bing Ads: Designed for precision targeting, data-driven tests, and maximizing ROAS.
              </p>
            </div>

            {/* Paid Social */}
            <div className="bg-[#2d3548] p-8 rounded-lg text-white border border-gray-600/30 hover:border-[#00D9FF]/40 transition-colors">
              <h3 className="text-xl font-bold mb-6 border-b border-gray-600 pb-4">Paid Social</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Facebook, Instagram, Pinterest, TikTok, and LinkedIn Ads. Reach the right audience at the right time in the right place.
              </p>
            </div>

            {/* Paid Content */}
            <div className="bg-[#2d3548] p-8 rounded-lg text-white border border-gray-600/30 hover:border-[#00D9FF]/40 transition-colors">
              <h3 className="text-xl font-bold mb-6 border-b border-gray-600 pb-4">Paid Content</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Taboola & Outbrain: Amplify your content to drive awareness and attention.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Affiliate Marketing */}
            <div className="bg-[#2d3548] p-8 rounded-lg text-white border border-gray-600/30 hover:border-[#00D9FF]/40 transition-colors">
              <h3 className="text-xl font-bold mb-6 border-b border-gray-600 pb-4">Affiliate<br/>Marketing</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Get featured across sites and platforms your customers care about.
              </p>
            </div>

            {/* Digital Strategy & Insights */}
            <div className="bg-[#2d3548] p-8 rounded-lg text-white border border-gray-600/30 hover:border-[#00D9FF]/40 transition-colors">
              <h3 className="text-xl font-bold mb-6 border-b border-gray-600 pb-4 text-[#00D9FF]">Digital Strategy<br/>& Insights</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Data that ties it all together for the optimal performance for your media mix.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Statistics */}
      <section className="py-16 px-6 bg-gradient-to-br from-[#00D9FF] to-[#00a8cc]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#1a1f2e]">Platform Statistics</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2 text-[#1a1f2e]">10K+</div>
              <p className="text-lg text-[#1a1f2e]">Active Workers</p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2 text-[#1a1f2e]">500K+</div>
              <p className="text-lg text-[#1a1f2e]">Products Optimized</p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2 text-[#1a1f2e]">$2M+</div>
              <p className="text-lg text-[#1a1f2e]">Commissions Paid</p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2 text-[#1a1f2e]">98%</div>
              <p className="text-lg text-[#1a1f2e]">Satisfaction Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Clients Section */}
      <section className="bg-[#1a1f2e] py-16 border-b border-gray-700/30 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-white mb-12">Our clients</h2>
          
          {/* Auto-scrolling container */}
          <div className="relative overflow-hidden">
            <style>{`
              @keyframes scroll {
                0% {
                  transform: translateX(0);
                }
                100% {
                  transform: translateX(-50%);
                }
              }
              .animate-scroll {
                animation: scroll 30s linear infinite;
              }
              .animate-scroll:hover {
                animation-play-state: paused;
              }
            `}</style>
            
            <div className="flex gap-6 animate-scroll">
              {/* First set of clients */}
              {clientLogos.map((logo, index) => (
                logo.isMain ? (
                  <div 
                    key={`first-${index}`}
                    className="bg-[#1a1f2e] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center p-8 border border-gray-700/30"
                    style={{ width: '300px', height: '192px' }}
                  >
                    <img 
                      src={logo.src} 
                      alt={logo.alt} 
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                ) : (
                  <div 
                    key={`first-${index}`}
                    className="bg-white rounded-lg overflow-hidden flex-shrink-0"
                    style={{ width: '300px' }}
                  >
                    <img 
                      src={logo.src} 
                      alt={logo.alt} 
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )
              ))}
              
              {/* Duplicate set for seamless infinite scroll */}
              {clientLogos.map((logo, index) => (
                logo.isMain ? (
                  <div 
                    key={`second-${index}`}
                    className="bg-[#1a1f2e] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center p-8 border border-gray-700/30"
                    style={{ width: '300px', height: '192px' }}
                  >
                    <img 
                      src={logo.src} 
                      alt={logo.alt} 
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                ) : (
                  <div 
                    key={`second-${index}`}
                    className="bg-white rounded-lg overflow-hidden flex-shrink-0"
                    style={{ width: '300px' }}
                  >
                    <img 
                      src={logo.src} 
                      alt={logo.alt} 
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )
              ))}
            </div>
          </div>
          
          {/* Scroll indicator */}
          <p className="text-center text-gray-400 text-sm mt-6">Hover to pause • Auto-scrolling</p>
        </div>
      </section>

      {/* Blog Section */}
      <section className="bg-[#252b3d] py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-white mb-12">Blog</h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <BlogCard 
              image="https://images.unsplash.com/photo-1759215524600-7971d6a4dac0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwbWFya2V0aW5nJTIwYW5hbHl0aWNzJTIwc2NyZWVufGVufDF8fHx8MTc3MjgzMzE0Mnww&ixlib=rb-4.1.0&q=80&w=1080"
              title="What is ad fatigue and how to detect it"
              author="Brad Moore"
            />
            <BlogCard 
              image="https://images.unsplash.com/photo-1728818788703-fefdc5a679ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NpYWwlMjBtZWRpYSUyMGZhY2Vib29rJTIwaW5zdGFncmFtfGVufDF8fHx8MTc3MjkyNjQyMXww&ixlib=rb-4.1.0&q=80&w=1080"
              title="How To Hack Your Way Into Digital Marketing (Spoiler: No Experience Needed)"
              author="Brad Moore"
            />
            <BlogCard 
              image="https://images.unsplash.com/photo-1675557570482-df9926f61d86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpZmljaWFsJTIwaW50ZWxsaWdlbmNlJTIwQUklMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc3Mjg4MjY5NXww&ixlib=rb-4.1.0&q=80&w=1080"
              title="Conventional (and unconventional) ways to re-activate a disabled Meta Ad Account"
              author="Brad Moore"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <BlogCard 
              image="https://images.unsplash.com/photo-1675557570482-df9926f61d86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpZmljaWFsJTIwaW50ZWxsaWdlbmNlJTIwQUklMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc3Mjg4MjY5NXww&ixlib=rb-4.1.0&q=80&w=1080"
              title="6 Ways Digital Marketers Are Embracing AI"
              author="Brad Moore"
            />
            <BlogCard 
              image="https://images.unsplash.com/photo-1728818788703-fefdc5a679ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NpYWwlMjBtZWRpYSUyMGZhY2Vib29rJTIwaW5zdGFncmFtfGVufDF8fHx8MTc3MjkyNjQyMXww&ixlib=rb-4.1.0&q=80&w=1080"
              title="Did Performance Max Save Google's Ad Crown in 2023?"
              author="Brad Moore"
            />
            <BlogCard 
              image="https://images.unsplash.com/photo-1628320281190-89b24da58b0f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb29nbGUlMjBhZHMlMjBtYXJrZXRpbmclMjBtb2JpbGV8ZW58MXx8fHwxNzcyOTI2NDIxfDA&ixlib=rb-4.1.0&q=80&w=1080"
              title="Is Google Ads Worth It For Small Business?"
              author="Brad Moore"
            />
          </div>

          <div className="text-center">
            <button className="bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-8 py-3 rounded font-bold text-sm tracking-wider transition-colors">
              VISIT BLOG
            </button>
          </div>
        </div>
      </section>

      {/* Stay Up To Date Section */}
      <section className="bg-[#1a1f2e] py-16 border-t border-gray-700/30">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Stay Up To Date</h2>
          <p className="text-gray-300 mb-8">Stay up to date on the latest marketing trends and platform updates</p>
          
          <div className="flex gap-4 max-w-lg mx-auto">
            <input 
              type="email" 
              placeholder="Email Address" 
              className="flex-1 px-4 py-3 rounded bg-[#252b3d] text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:border-[#00D9FF]"
            />
            <button className="bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-8 py-3 rounded font-bold text-sm tracking-wider transition-colors">
              GET UPDATED
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1f2e] text-white py-8 px-6 text-center border-t border-gray-700/30">
        <p className="text-sm text-gray-400">Copyright © 2026 Steadfast Digital</p>
      </footer>

      {/* Live Chat Box */}
      <LiveChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} username={username} />

      {/* Floating Chat Button */}
      {!isChatOpen && <ChatNotificationBadge username={username} onClick={() => setIsChatOpen(true)} />}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

function ServiceCard({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="bg-[#00D9FF] hover:bg-[#00c5e6] transition-colors text-[#1a1f2e] p-6 rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer min-h-[120px]">
      {icon}
      <span className="font-semibold text-sm text-center">{title}</span>
    </div>
  );
}

function BlogCard({ image, title, author }: { image: string; title: string; author: string }) {
  return (
    <div className="bg-[#1a1f2e] rounded-lg overflow-hidden hover:transform hover:scale-105 transition-transform cursor-pointer border border-gray-700/30">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-6">
        <h3 className="text-white font-bold mb-3 leading-tight">{title}</h3>
        <p className="text-[#00D9FF] text-sm hover:underline cursor-pointer">Read More »</p>
      </div>
    </div>
  );
}
