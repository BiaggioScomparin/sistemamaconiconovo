import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  initGoogleAnalytics,
  initMicrosoftClarity,
  trackAnalyticsPageView,
  trackButtonClick,
} from '@/lib/analytics';

export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // Initialize services
    initGoogleAnalytics();
    initMicrosoftClarity();

    // Global listener for button and link clicks to track user interactions automatically
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Find closest clickable element (button, link, or elements with data-track)
      const clickableElement = target.closest('button, a, [role="button"], [data-track]');
      if (clickableElement) {
        const customTag = clickableElement.getAttribute('data-track');
        const elementText = clickableElement.textContent?.trim().slice(0, 50) || '';
        const elementId = clickableElement.id || clickableElement.getAttribute('name') || '';

        const buttonIdentifier = customTag || elementText || elementId || 'unnamed_element';

        if (buttonIdentifier) {
          trackButtonClick(buttonIdentifier, 'Auto Click Tracking', {
            path: window.location.pathname,
            tag: customTag || null,
          });
        }
      }
    };

    window.addEventListener('click', handleGlobalClick, { capture: true });
    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, []);

  useEffect(() => {
    const fullPath = location.pathname + location.search;
    trackAnalyticsPageView(fullPath);
  }, [location.pathname, location.search]);

  return null;
}
