import { Injectable, signal } from '@angular/core';

export interface ArtworksListState {
  sortField: 'id' | 'title';
  sortAsc: boolean;
  searchQuery: string;
  selectedCategoryFilter: string;
  anchorId: number | null;
}

@Injectable({ providedIn: 'root' })
export class ArtworksAdminStateService {
  private readonly _state = signal<ArtworksListState>({
    sortField: 'id',
    sortAsc: true,
    searchQuery: '',
    selectedCategoryFilter: '',
    anchorId: null
  });

  readonly state = this._state.asReadonly();

  save(patch: Partial<ArtworksListState>): void {
    this._state.update(s => ({ ...s, ...patch }));
  }

  setAnchor(anchorId: number): void {
    this._state.update(s => ({ ...s, anchorId }));
  }

  clearAnchor(): void {
    this._state.update(s => ({ ...s, anchorId: null }));
  }
}
