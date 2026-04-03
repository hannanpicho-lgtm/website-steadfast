import { X } from 'lucide-react';
import welcomeImage from '../../assets/ecaa8fbc2d2861ad080f3bc75a5be2355fa255a8.webp';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10"
          aria-label="Close welcome modal"
        >
          <X size={24} className="text-gray-700" />
        </button>

        {/* Welcome Image */}
        <img 
          src={welcomeImage} 
          alt="Welcome - Special Reward Announcement" 
          className="w-full h-auto rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
}

