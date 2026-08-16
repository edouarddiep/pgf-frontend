export type ConsentStatus = 'accepted' | 'denied' | 'custom';

export interface StoredConsent {
  version: number;
  status: ConsentStatus;
  analytics: boolean;
  date: string;
}
