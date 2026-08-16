import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface VideoConfig {
  url: string;
  posterUrl: string;
  startTime: number;
  endTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly videos: Record<string, VideoConfig> = {
    home: {
      url: 'https://bhjpavcxhymxcadesnqy.supabase.co/storage/v1/object/public/oeuvres/yaya/videos/hero-home.mp4',
      posterUrl: 'https://bhjpavcxhymxcadesnqy.supabase.co/storage/v1/object/public/oeuvres/yaya/videos/hero-home-poster.webp',
      startTime: 0,
      endTime: 13
    }
  };

  setupVideo(element: HTMLVideoElement, key: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const config = this.videos[key];
    if (!config) return;

    element.muted = true;
    element.volume = 0;
    element.playsInline = true;

    const start = () => {
      element.currentTime = config.startTime;
      element.play().catch(() => {});
    };

    // La balise est dans le HTML prérendu et charge avant l'hydratation :
    // sans ce contrôle, canplay est déjà passé et l'écouteur ne sert à rien.
    if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      start();
    } else {
      element.addEventListener('canplay', start, { once: true });
    }

    element.addEventListener('timeupdate', () => {
      if (element.currentTime >= config.endTime) {
        element.currentTime = config.startTime;
      }
    });

    element.addEventListener('volumechange', () => {
      if (!element.muted || element.volume > 0) {
        element.muted = true;
        element.volume = 0;
      }
    });
  }
}
