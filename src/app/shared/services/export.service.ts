import { Injectable } from '@angular/core';

export interface ExportColumn<T> {
  header: string;
  value: (item: T) => string | number;
}

@Injectable({ providedIn: 'root' })
export class ExportService {

  exportToExcel<T>(data: T[], columns: ExportColumn<T>[], filename: string): void {
    const header = columns.map(c => `<th>${c.header}</th>`).join('');
    const rows = data.map(item =>
      `<tr>${columns.map(c => `<td>${c.value(item) ?? ''}</td>`).join('')}</tr>`
    ).join('');

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"><style>th{background:#4472C4;color:#fff;font-weight:bold;}td,th{border:1px solid #ccc;padding:4px 8px;}</style></head>
<body><table>${header}${rows}</table></body></html>`;

    this.download(html, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
  }

  private download(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
