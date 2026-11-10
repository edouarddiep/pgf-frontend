/**
 * Les médias d'exposition sont stockés sous un nom déduit de leur index
 * (`image-3.jpg`, `video-2.mp4`) : réutiliser un index écrase le fichier
 * précédent et fait pointer deux entrées sur la même image. L'index suivant se
 * déduit donc des URLs déjà prises, jamais de leur simple nombre — une
 * suppression ou une image principale hors liste fausserait le compte.
 */
export function nextMediaIndex(urls: (string | undefined)[], prefix: 'image' | 'video'): number {
  const pattern = new RegExp(`/${prefix}-(\\d+)\\.`, 'i');

  const usedIndices = urls
    .filter((url): url is string => !!url)
    .map(url => pattern.exec(url)?.[1])
    .filter((index): index is string => !!index)
    .map(Number);

  return usedIndices.length > 0 ? Math.max(...usedIndices) + 1 : 1;
}
