import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router';
import type { ReactNode } from 'react';

const pageVariants = {
  initial: {
    opacity: 0,
  },
  enter: {
    opacity: 1,
    transition: {
      duration: 0.15,
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1,
      ease: 'easeIn' as const,
    },
  },
};

/**
 * Wraps page content with animated enter/exit transitions.
 * Usage: Wrap <Outlet /> in layouts with this component.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={pathname}
          variants={pageVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          className="min-h-screen"
          style={{ willChange: 'opacity', backgroundColor: '#0a0a0a' }}
        >
          {children}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
