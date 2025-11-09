import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface VideoConfig {
  url: string;
  startTime: number;
  endTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly videoCache = new Map<string, HTMLVideoElement>();
  private preloadPromises = new Map<string, Promise<void>>();

  readonly videos: Record<string, VideoConfig> = {
    home: {
      url: 'https://bhjpavcxhymxcadesnqy.supabase.co/storage/v1/object/public/oeuvres/yaya/videos/video1.mp4',
      startTime: 2,
      endTime: 15
    }
  };

  preloadVideo(key: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }

    if (this.preloadPromises.has(key)) {
      return this.preloadPromises.get(key)!;
    }

    const config = this.videos[key];
    if (!config) return Promise.resolve();

    const promise = new Promise<void>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.src = config.url;

      const onCanPlay = () => {
        video.currentTime = config.startTime;
        this.videoCache.set(key, video);
        video.removeEventListener('canplaythrough', onCanPlay);
        resolve();
      };

      video.addEventListener('canplaythrough', onCanPlay);
      video.load();

      setTimeout(() => {
        if (!this.videoCache.has(key)) {
          this.videoCache.set(key, video);
          resolve();
        }
      }, 3000);
    });

    this.preloadPromises.set(key, promise);
    return promise;
  }

  setupVideo(element: HTMLVideoElement, key: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const config = this.videos[key];
    if (!config) return;

    element.muted = true;
    element.volume = 0;
    element.playsInline = true;

    const cachedVideo = this.videoCache.get(key);
    if (cachedVideo && cachedVideo.readyState >= 3) {
      element.currentTime = config.startTime;
      element.play().catch(() => {});
    } else {
      element.addEventListener('canplay', () => {
        element.currentTime = config.startTime;
        element.play().catch(() => {});
      }, { once: true });
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

  clearCache(): void {
    this.videoCache.forEach(video => {
      video.pause();
      video.src = '';
    });
    this.videoCache.clear();
    this.preloadPromises.clear();
  }
}
