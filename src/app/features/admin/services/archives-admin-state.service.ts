import { Injectable, signal } from '@angular/core';

export interface ArchivesListState {
  sortField: 'id' | 'title' | 'year';
  sortAsc: boolean;
  searchQuery: string;
  anchorId: number | null;
}

@Injectable({ providedIn: 'root' })
export class ArchivesAdminStateService {
  private readonly _state = signal<ArchivesListState>({
    sortField: 'id',
    sortAsc: true,
    searchQuery: '',
    anchorId: null
  });

  readonly state = this._state.asReadonly();

  save(patch: Partial<ArchivesListState>): void {
    this._state.update(s => ({ ...s, ...patch }));
  }

  clearAnchor(): void {
    this._state.update(s => ({ ...s, anchorId: null }));
  }
}
