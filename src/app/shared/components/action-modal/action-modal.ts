import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-action-modal',
  template: `
    <div class="backdrop" (click)="close.emit()">
      <section role="dialog" aria-modal="true" [attr.aria-label]="title()" (click)="$event.stopPropagation()">
        <header>
          <h2>{{ title() }}</h2>
          <button type="button" aria-label="Cerrar modal" (click)="close.emit()">×</button>
        </header>
        <ng-content />
      </section>
    </div>
  `,
  styles: `
    .backdrop {
      position: fixed;
      z-index: 40;
      inset: 0;
      display: grid;
      align-items: end;
      padding: 20px;
      background: rgb(2 4 8 / 72%);
      backdrop-filter: blur(8px);
    }
    section {
      width: min(100%, 440px);
      max-height: min(82dvh, 720px);
      margin: 0 auto calc(76px + env(safe-area-inset-bottom));
      overflow: auto;
      padding: 20px;
      border: 1px solid var(--color-border);
      border-radius: 26px;
      background: var(--color-card);
      box-shadow: 0 24px 80px rgb(0 0 0 / 55%);
      animation: enter 180ms ease-out;
    }
    header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
    h2 { margin: 0; font-size: 1.35rem; }
    button {
      width: 38px;
      height: 38px;
      border: 1px solid var(--color-border);
      border-radius: 50%;
      background: var(--color-card-secondary);
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 1.5rem;
    }
    @keyframes enter { from { opacity: 0; transform: translateY(18px) scale(.98); } }
    @media (min-width: 600px) { .backdrop { align-items: center; } section { margin-bottom: 0; } }
  `,
})
export class ActionModal {
  readonly title = input.required<string>();
  readonly close = output<void>();
}
