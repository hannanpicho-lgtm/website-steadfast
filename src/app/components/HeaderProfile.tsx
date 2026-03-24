import { UserCircle } from 'lucide-react';
import { Link } from 'react-router';

export function HeaderProfile() {
  return (
    <div className="flex items-center">
      {/* Profile Icon */}
      <Link to="/profile">
        <UserCircle size={32} className="text-white cursor-pointer hover:text-[#00D9FF] transition-colors" />
      </Link>
    </div>
  );
}