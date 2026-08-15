export interface ArchiveFile {
  id: number;
  fileType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF';
  fileUrl: string;
  fileSrcset?: string;
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
  thumbnailSrcset?: string;
  mainImagePositionX?: number;
  mainImagePositionY?: number;
  mainImageZoom?: number;
  files: ArchiveFile[];
}
