import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';
import { TranslateService } from '@core/services/translate.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges: () => boolean;
  isFormMode: () => boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (component.isFormMode() && component.hasUnsavedChanges()) {
    const translateService = inject(TranslateService);
    return inject(ConfirmDialogService).confirm({
      title: translateService.translate('shared.unsavedChanges.title'),
      message: translateService.translate('shared.unsavedChanges.message'),
      confirmLabel: translateService.translate('shared.unsavedChanges.confirm'),
      cancelLabel: translateService.translate('shared.unsavedChanges.cancel')
    });
  }
  return true;
};
