import { fr } from './pgf-fr-labels';
import { en } from './pgf-en-labels';

export const translations = { fr, en } as const;
export type Lang = keyof typeof translations;
