import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { NavService } from '@core/services/nav.service';
import { SeoService } from '@core/services/seo.service';
import { TranslateService } from '@core/services/translate.service';

@Component({
  selector: 'app-not-found',
  imports: [RouterModule, MatButtonModule, TranslatePipe],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent implements OnInit {
  protected readonly navService = inject(NavService);
  private readonly seoService = inject(SeoService);
  private readonly translateService = inject(TranslateService);

  ngOnInit(): void {
    this.seoService.setPageResolver(() => ({
      title: this.translateService.translate('notFound.title'),
      description: this.translateService.translate('notFound.description'),
      noindex: true
    }));
  }
}
