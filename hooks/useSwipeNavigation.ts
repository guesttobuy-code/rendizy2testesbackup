import { useState, useEffect, useRef } from 'react';

// Stub hook - swipe navigation for mobile
export function useSwipeNavigation(options?: { onSwipeLeft?: () => void; onSwipeRight?: () => void }) {
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndX.current = e.touches[0].clientX;
      setIsSwiping(true);
    };

    const handleTouchEnd = () => {
      if (!isSwiping) return;
      
      const diff = touchStartX.current - touchEndX.current;
      const threshold = 50;

      if (diff > threshold && options?.onSwipeLeft) {
        options.onSwipeLeft();
      } else if (diff < -threshold && options?.onSwipeRight) {
        options.onSwipeRight();
      }

      setIsSwiping(false);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isSwiping, options]);

  return { isSwiping };
}
