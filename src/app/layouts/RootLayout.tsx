import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { warmApiCompatibilityState } from '../services/apiCompatibility';

export default function RootLayout() {
  useEffect(() => {
    void warmApiCompatibilityState();
  }, []);

  return (
    <>
      <Outlet />
    </>
  );
}