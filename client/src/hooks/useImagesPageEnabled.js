import { useState, useEffect } from 'react';

export function useImagesPageEnabled() {
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem('imagesPageEnabled') !== 'false'
  );
  useEffect(() => {
    const handler = () => setEnabled(localStorage.getItem('imagesPageEnabled') !== 'false');
    window.addEventListener('imagesPageToggled', handler);
    return () => window.removeEventListener('imagesPageToggled', handler);
  }, []);
  return enabled;
}
