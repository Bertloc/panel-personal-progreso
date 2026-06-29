import { Component } from '@angular/core';

@Component({
  selector: 'app-floating-action-button',
  template: `<button type="button" aria-label="Agregar">+</button>`,
  styles: `
    button {
      position: fixed;
      z-index: 20;
      right: max(calc((100vw - 460px) / 2 + 20px), 20px);
      bottom: calc(96px + env(safe-area-inset-bottom));
      width: 58px;
      height: 58px;
      border: 0;
      border-radius: 50%;
      background: var(--color-purple);
      box-shadow: 0 8px 28px rgb(124 109 255 / 38%);
      color: white;
      cursor: pointer;
      font-size: 2rem;
      line-height: 1;
    }
  `,
})
export class FloatingActionButton {}
