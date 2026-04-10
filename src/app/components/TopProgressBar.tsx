import { useEffect, useState, memo } from 'react';
import { useNavigation } from 'react-router';

/**
 * F2: Top loading progress bar — shows a slim animated bar during route transitions.
 * Uses React Router's useNavigation() to detect loading state.
 */
export const TopProgressBar = memo(function TopProgressBar() {
  const navigation = useNavigation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (navigation.state === 'loading') {
      setShow(true);
    } else {
      // Brief delay to let the bar complete visually
      const t = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(t);
    }
  }, [navigation.state]);

  if (!show) return null;

  return <div className="sf-progress-bar" aria-hidden="true" />;
});
