import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-20 md:bottom-8 right-5 z-40 p-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 border border-white/20 animate-fade-in"
      aria-label="Scroll to top"
      title="Go to top"
    >
      <ArrowUp size={20} />
    </button>
  );
};

export default ScrollToTopButton;
