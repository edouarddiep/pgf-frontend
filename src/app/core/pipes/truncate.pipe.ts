import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'truncate', standalone: true })
export class TruncatePipe implements PipeTransform {
  transform(value: string | undefined | null, limit = 120): string {
    if (!value) { return ''; }
    const plain = value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (plain.length <= limit) { return plain; }
    const truncated = plain.slice(0, limit);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '…';
  }
}
