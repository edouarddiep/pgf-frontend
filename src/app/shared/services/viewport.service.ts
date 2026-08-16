import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';

// Au-delà de cette hauteur de viewport (27/32 pouces), les descriptions longues
// tiennent à l'écran sans repli : mesuré à 1068px de contenu pour 1325px de haut.
const COMPACT_HEIGHT_QUERY = '(max-height: 1100px)';

@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly breakpointObserver = inject(BreakpointObserver);

  // false au prerender : le texte complet reste dans le HTML statique pour le SEO.
  readonly isCompactHeight = toSignal(
    this.breakpointObserver.observe(COMPACT_HEIGHT_QUERY).pipe(map(result => result.matches)),
    { initialValue: false }
  );
}
