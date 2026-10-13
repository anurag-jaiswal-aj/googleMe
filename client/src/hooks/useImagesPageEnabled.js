import { useConfig } from './useConfig';
import { getPageVisibility } from '../data/pageVisibility';

export function useImagesPageEnabled() {
  const cfg = useConfig();
  return getPageVisibility(cfg).images;
}
