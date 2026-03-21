import { Outlet, useLocation } from 'react-router';
import { FloatingLiveChat } from '../components/FloatingLiveChat';

export default function RootLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <>
      <Outlet />
      {!isHomePage && <FloatingLiveChat />}
    </>
  );
}