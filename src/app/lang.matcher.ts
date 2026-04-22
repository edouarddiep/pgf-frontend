import { UrlMatcher } from '@angular/router';

export const langMatcher: UrlMatcher = (segments) => {
  if (segments.length > 0 && /^(fr|en)-ch$/.test(segments[0].path)) {
    return { consumed: [segments[0]], posParams: { lang: segments[0] } };
  }
  return null;
};
