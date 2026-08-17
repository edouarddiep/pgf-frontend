import { Injectable, signal } from '@angular/core';

// 'date' : statut puis date, l'ordre par défaut de la liste.
export type ExhibitionSortField = 'date' | 'id' | 'title';

export interface ExhibitionsListState {
  sortField: ExhibitionSortField;
  sortAsc: boolean;
  searchQuery: string;
  anchorId: number | null;
}

@Injectable({ providedIn: 'root' })
export class ExhibitionsAdminStateService {
  private readonly _state = signal<ExhibitionsListState>({
    sortField: 'date',
    sortAsc: true,
    searchQuery: '',
    anchorId: null
  });

  readonly state = this._state.asReadonly();

  save(patch: Partial<ExhibitionsListState>): void {
    this._state.update(s => ({ ...s, ...patch }));
  }

  clearAnchor(): void {
    this._state.update(s => ({ ...s, anchorId: null }));
  }
}
