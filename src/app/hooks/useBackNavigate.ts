import { useNavigate } from 'react-router';

/**
 * Returns a back-navigation function that uses browser history when available,
 * falling back to /home for deep-links and bookmarks where there is no prior
 * history entry (e.g. history.length <= 1).
 */
export function useBackNavigate(fallback = '/home'): () => void {
  const navigate = useNavigate();
  return () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };
}
