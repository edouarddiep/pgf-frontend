export interface ArchiveFile {
  id: number;
  fileType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF';
  fileUrl: string;
  fileName?: string;
}

export interface Archive {
  id: number;
  title: string;
  titleEn?: string;
  year: number;
  description?: string;
  descriptionEn?: string;
  thumbnailUrl?: string;
  mainImagePositionX?: number;
  mainImagePositionY?: number;
  mainImageZoom?: number;
  files: ArchiveFile[];
}
