import { Injectable, signal } from '@angular/core';

export interface CategoriesListState {
  sortField: 'id' | 'name';
  sortAsc: boolean;
  searchQuery: string;
  anchorId: number | null;
}

@Injectable({ providedIn: 'root' })
export class CategoriesAdminStateService {
  private readonly _state = signal<CategoriesListState>({
    sortField: 'id',
    sortAsc: true,
    searchQuery: '',
    anchorId: null
  });

  readonly state = this._state.asReadonly();

  save(patch: Partial<CategoriesListState>): void {
    this._state.update(s => ({ ...s, ...patch }));
  }

  clearAnchor(): void {
    this._state.update(s => ({ ...s, anchorId: null }));
  }
}
