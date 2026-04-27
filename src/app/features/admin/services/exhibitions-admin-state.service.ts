import { Injectable, signal } from '@angular/core';

export interface ExhibitionsListState {
  sortField: 'id' | 'title';
  sortAsc: boolean;
  searchQuery: string;
  anchorId: number | null;
}

@Injectable({ providedIn: 'root' })
export class ExhibitionsAdminStateService {
  private readonly _state = signal<ExhibitionsListState>({
    sortField: 'id',
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
