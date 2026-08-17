import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@core/pipes/translate.pipe';

const MIN_ZOOM = 100;
const MAX_ZOOM = 300;
const ZOOM_STEP = 5;
const PAN_STEP = 2;

@Component({
  selector: 'app-image-cropper',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe],
  templateUrl: './image-cropper.component.html',
  styleUrl: './image-cropper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageCropperComponent {
  readonly imageUrl = input.required<string>();
  readonly positionX = model(50);
  readonly positionY = model(50);
  readonly zoom = model(100);
  readonly changed = output<void>();

  private dragPointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartPosX = 50;
  private dragStartPosY = 50;

  protected onPointerDown(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    target.focus();
    this.dragPointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartPosX = this.positionX();
    this.dragStartPosY = this.positionY();
    event.preventDefault();
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) {
      return;
    }
    const viewport = event.currentTarget as HTMLElement;
    const sensitivity = 100 / this.zoom();
    const deltaX = ((event.clientX - this.dragStartX) / viewport.offsetWidth) * -100 * sensitivity;
    const deltaY = ((event.clientY - this.dragStartY) / viewport.offsetHeight) * -100 * sensitivity;
    this.positionX.set(clamp(this.dragStartPosX + deltaX, 0, 100));
    this.positionY.set(clamp(this.dragStartPosY + deltaY, 0, 100));
    this.changed.emit();
  }

  protected onPointerEnd(event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) {
      return;
    }
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    this.dragPointerId = null;
  }

  // Le recadrage doit rester atteignable sans souris : flèches pour déplacer,
  // +/- pour zoomer.
  protected onKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? PAN_STEP * 5 : PAN_STEP;
    switch (event.key) {
      case 'ArrowLeft':
        this.pan(-step, 0);
        break;
      case 'ArrowRight':
        this.pan(step, 0);
        break;
      case 'ArrowUp':
        this.pan(0, -step);
        break;
      case 'ArrowDown':
        this.pan(0, step);
        break;
      case '+':
      case '=':
        this.adjustZoom(ZOOM_STEP);
        break;
      case '-':
        this.adjustZoom(-ZOOM_STEP);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  protected adjustZoom(delta: number): void {
    this.zoom.set(clamp(this.zoom() + delta, MIN_ZOOM, MAX_ZOOM));
    this.changed.emit();
  }

  protected onZoomInput(value: string): void {
    this.zoom.set(clamp(+value, MIN_ZOOM, MAX_ZOOM));
    this.changed.emit();
  }

  protected reset(): void {
    this.positionX.set(50);
    this.positionY.set(50);
    this.zoom.set(MIN_ZOOM);
    this.changed.emit();
  }

  protected get canReset(): boolean {
    return this.positionX() !== 50 || this.positionY() !== 50 || this.zoom() !== MIN_ZOOM;
  }

  protected readonly minZoom = MIN_ZOOM;
  protected readonly maxZoom = MAX_ZOOM;
  protected readonly zoomStep = ZOOM_STEP;

  private pan(deltaX: number, deltaY: number): void {
    this.positionX.set(clamp(this.positionX() + deltaX, 0, 100));
    this.positionY.set(clamp(this.positionY() + deltaY, 0, 100));
    this.changed.emit();
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
