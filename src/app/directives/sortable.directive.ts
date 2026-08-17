import { Directive, computed, input, output } from '@angular/core';

/**
 * En-tête de colonne triable des tableaux d'administration : gère l'état ARIA,
 * l'activation au clavier et la classe portant l'indicateur de tri (CSS).
 */
@Directive({
  selector: '[appSortable]',
  host: {
    'class': 'sortable-header',
    'tabindex': '0',
    '[attr.aria-sort]': 'ariaSort()',
    '[class.sort-active]': 'isActive()',
    '[class.sort-desc]': 'isActive() && !sortAsc()',
    '(click)': 'trigger()',
    '(keydown.enter)': 'trigger($event)',
    '(keydown.space)': 'trigger($event)'
  }
})
export class SortableDirective {
  readonly appSortable = input.required<string>();
  readonly sortField = input.required<string>();
  readonly sortAsc = input(true);
  readonly sortChange = output<string>();

  protected readonly isActive = computed(() => this.sortField() === this.appSortable());

  protected readonly ariaSort = computed(() => {
    if (!this.isActive()) {
      return 'none';
    }
    return this.sortAsc() ? 'ascending' : 'descending';
  });

  protected trigger(event?: Event): void {
    event?.preventDefault();
    this.sortChange.emit(this.appSortable());
  }
}
