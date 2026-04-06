import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges: () => boolean;
  isFormMode: () => boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (component.isFormMode() && component.hasUnsavedChanges()) {
    return confirm('Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter cette page ?');
  }
  return true;
};
