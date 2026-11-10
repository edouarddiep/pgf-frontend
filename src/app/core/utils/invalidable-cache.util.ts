import { BehaviorSubject, Observable, shareReplay, switchMap } from 'rxjs';

export interface Invalidable {
  invalidate(): void;
}

/**
 * Cache partagé le temps d'une session, que l'admin peut périmer après une
 * écriture : l'invalidation relance l'appel et pousse la nouvelle valeur aux
 * vues déjà abonnées, sans attendre un rechargement de page.
 */
export class InvalidableCache implements Invalidable {
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  wrap<T>(request: () => Observable<T>): Observable<T> {
    return this.refresh$.pipe(switchMap(request), shareReplay(1));
  }

  invalidate(): void {
    this.refresh$.next();
  }
}
