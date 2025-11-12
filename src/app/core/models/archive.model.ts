export interface ArchiveFile {
  id: number;
  fileType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF';
  fileUrl: string;
  fileName?: string;
  displayOrder: number;
}

export interface Archive {
  id: number;
  title: string;
  year: number;
  description?: string;
  thumbnailUrl?: string;
  displayOrder: number;
  files: ArchiveFile[];
}
