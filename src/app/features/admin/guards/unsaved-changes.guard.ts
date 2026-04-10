import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges: () => boolean;
  isFormMode: () => boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (component.isFormMode() && component.hasUnsavedChanges()) {
    return inject(ConfirmDialogService).confirm({
      title: 'Modifications non enregistrées',
      message: 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter cette page ?',
      confirmLabel: 'Confirmer',
      cancelLabel: 'Annuler'
    });
  }
  return true;
};
