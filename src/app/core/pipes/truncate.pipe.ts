import { Pipe, PipeTransform } from '@angular/core';
import { htmlToPlainText } from '@core/utils/html-text.util';

@Pipe({ name: 'truncate', standalone: true })
export class TruncatePipe implements PipeTransform {
  transform(value: string | undefined | null, limit = 120): string {
    const plain = htmlToPlainText(value).replace(/\s+/g, ' ');
    if (plain.length <= limit) { return plain; }
    const truncated = plain.slice(0, limit);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '…';
  }
}
