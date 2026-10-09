import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initMetaPixel, trackMetaPageView } from '@/lib/metaPixel';

export function MetaPixelTracker() {
  const location = useLocation();

  useEffect(() => {
    initMetaPixel();
  }, []);

  useEffect(() => {
    trackMetaPageView();
  }, [location.pathname, location.search]);

  return null;
}
