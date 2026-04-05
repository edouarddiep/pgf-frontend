import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'highlight', standalone: true })
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string | number, query: string): SafeHtml {
    const str = text?.toString() ?? '';
    if (!str) return '';
    if (!query || query.trim().length < 1) return str;

    const accentMap: Record<string, string> = {
      a: '[aàâäáãå]', e: '[eéèêë]', i: '[iîïíì]',
      o: '[oôöóòõ]', u: '[uùûüú]', c: '[cç]', n: '[nñ]'
    };

    const buildPattern = (token: string): string =>
      token.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .split('')
        .map(c => accentMap[c] ?? c)
        .join('');

    const tokens = query.trim().split(/\s+/).filter(t => t.length >= 1);
    const pattern = tokens.map(buildPattern).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    const highlighted = str.replace(regex, '<mark>$1</mark>');
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}
