declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    clarity?: (...args: any[]) => void;
  }
}

// Environment variables for tracking IDs
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-51YNZP3MKZ';
export const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || '';

/**
 * Initializes Google Analytics 4 (GA4) dynamically
 */
export function initGoogleAnalytics(id?: string) {
  const measurementId = id || GA_MEASUREMENT_ID;
  if (!measurementId || typeof window === 'undefined') return;

  if (!window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer?.push(arguments);
    };
    window.gtag('js', new Date());

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  }

  window.gtag('config', measurementId, { send_page_view: false });
}

/**
 * Initializes Microsoft Clarity dynamically (Heatmaps & Session Replays)
 */
export function initMicrosoftClarity(id?: string) {
  const projectId = id || CLARITY_PROJECT_ID;
  if (!projectId || typeof window === 'undefined') return;

  if (!window.clarity) {
    (function (c: any, l: any, a: any, r: any, i: any, t?: any, y?: any) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", projectId);
  }
}

/**
 * Tracks route change PageView event in GA4 & Clarity
 */
export function trackAnalyticsPageView(path: string) {
  if (typeof window === 'undefined') return;

  // Track in GA4
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: document.title,
    });
  }

  // Track in Microsoft Clarity
  if (window.clarity && CLARITY_PROJECT_ID) {
    window.clarity('set', 'page_path', path);
  }
}

/**
 * Tracks custom button clicks and user events
 */
export function trackButtonClick(buttonName: string, category: string = 'User Interaction', details?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  // Track in GA4
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'click', {
      event_category: category,
      event_label: buttonName,
      ...details,
    });
  }

  // Track in Microsoft Clarity
  if (window.clarity && CLARITY_PROJECT_ID) {
    window.clarity('event', `click_${buttonName.toLowerCase().replace(/\s+/g, '_')}`);
  }
}
