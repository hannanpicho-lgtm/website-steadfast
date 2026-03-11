import { Outlet } from 'react-router';
import { FloatingLiveChat } from '../components/FloatingLiveChat';

export default function RootLayout() {
  return (
    <>
      <Outlet />
      <FloatingLiveChat />
    </>
  );
}