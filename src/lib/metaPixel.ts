declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

// Get Facebook Meta Pixel ID from environment variable or default fallback
export const META_PIXEL_ID = import.meta.env.VITE_FACEBOOK_PIXEL_ID || '';

/**
 * Initializes Meta (Facebook) Pixel SDK dynamically if Pixel ID is configured
 */
export function initMetaPixel(pixelId?: string) {
  const id = pixelId || META_PIXEL_ID;
  if (!id || typeof window === 'undefined') return;

  if (!window.fbq) {
    const n: any = function (...args: any[]) {
      if (n.callMethod) {
        n.callMethod.apply(n, args);
      } else {
        n.queue.push(args);
      }
    };
    n.queue = [];
    n.version = '2.0';
    n.loaded = true;
    window.fbq = n;
    window._fbq = n;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  window.fbq('init', id);
  window.fbq('track', 'PageView');
}

/**
 * Tracks route change PageView event for Single Page Application (SPA)
 */
export function trackMetaPageView() {
  if (typeof window !== 'undefined' && window.fbq && META_PIXEL_ID) {
    window.fbq('track', 'PageView');
  }
}

/**
 * Tracks custom Meta standard events (e.g., 'Lead', 'CompleteRegistration', etc.)
 */
export function trackMetaEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.fbq && META_PIXEL_ID) {
    window.fbq('track', eventName, params);
  }
}
