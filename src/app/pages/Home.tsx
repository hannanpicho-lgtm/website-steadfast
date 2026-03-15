import { Link } from 'react-router';
import logoImage from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';

export default function Home() {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#1a1f2e]">
      {/* Minimal Header â€” logo only */}
      <header className="relative z-20 flex items-center px-6 py-3 bg-gradient-to-r from-[#1e2838] via-[#2c3e50] to-[#34495e] border-b border-[#5dade2]/20 shadow-lg shadow-[#5dade2]/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-[#5dade2] blur-xl opacity-30"></div>
            <img src={logoImage} alt="Steadfast Digital Logo" className="relative z-10 w-12 h-12 object-contain drop-shadow-lg" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-[#5dade2] via-[#60a5fa] to-[#5dade2] bg-clip-text text-transparent">
              STEADFAST
            </span>
            <span className="text-[10px] tracking-[0.3em] text-gray-400 font-semibold uppercase -mt-1">
              Digital
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section â€” fills remaining viewport */}
      <section className="relative flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-[#2a3f5f] via-[#1a1f2e] to-[#3d2a4a] overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto transform -translate-x-1/2 -translate-y-1/2 object-cover"
            style={{ filter: 'brightness(0.4) contrast(1.1) saturate(0.8) hue-rotate(200deg)' }}
          >
            <source src="https://imagine-public.x.ai/imagine-public/share-videos/a3612b1a-ba58-4437-9515-779c1ee1fe9e.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e]/70 via-[#2a3f5f]/60 to-[#1a1f2e]/75"></div>
          <div className="absolute inset-0 bg-[#00D9FF]/5"></div>
        </div>

        {/* Glow orbs */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-[#00D9FF] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center text-white px-6">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl" style={{ textShadow: '0 0 30px rgba(93, 173, 226, 0.5), 0 4px 20px rgba(0, 0, 0, 0.8)' }}>Steadfast Digital</h1>
          <p className="text-xl md:text-2xl mb-4 font-light drop-shadow-2xl" style={{ textShadow: '0 0 20px rgba(93, 173, 226, 0.3), 0 2px 15px rgba(0, 0, 0, 0.8)' }}>a Performance-driven Digital Marketing Agency</p>
          <p className="text-lg mb-10 text-gray-200 drop-shadow-2xl" style={{ textShadow: '0 0 15px rgba(93, 173, 226, 0.3), 0 2px 10px rgba(0, 0, 0, 0.8)' }}>Data Optimization Platform for E-commerce Growth</p>
          <Link
            to="/login"
            className="inline-block bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-10 py-3 rounded font-bold text-sm tracking-wider transition-all duration-300 shadow-2xl hover:shadow-[0_0_30px_rgba(0,217,255,0.6)] hover:scale-105"
          >
            GET STARTED
          </Link>
        </div>
      </section>
    </div>
  );
}

