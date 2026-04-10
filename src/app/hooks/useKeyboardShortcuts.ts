import { useEffect } from 'react';
import { useNavigate } from 'react-router';

/**
 * F5: Keyboard shortcuts for power-user navigation.
 * Alt+H → /home, Alt+S → /starting, Alt+R → /records, Alt+P → /profile
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Only trigger on Alt+key, ignore if typing in an input
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;

      switch (e.key.toLowerCase()) {
        case 'h':
          e.preventDefault();
          navigate('/home');
          break;
        case 's':
          e.preventDefault();
          navigate('/starting');
          break;
        case 'r':
          e.preventDefault();
          navigate('/records');
          break;
        case 'p':
          e.preventDefault();
          navigate('/profile');
          break;
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [navigate]);
}
