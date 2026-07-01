import { Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { QuickAction, QuickCreate } from '../quick-create/quick-create';

@Component({
  selector: 'app-floating-action-button',
  imports: [QuickCreate],
  template: `
    @if (open()) { <button class="backdrop" type="button" aria-label="Cerrar menú" (click)="closeMenu()"></button> }
    <div class="radial" [class.radial--open]="open()">
      @for (item of actions; track item.action; let index = $index) {
        <button
          class="action"
          type="button"
          [style.--index]="index"
          [style.--accent]="item.color"
          [style.--x]="item.x"
          [style.--y]="item.y"
          [attr.aria-label]="item.label"
          [attr.tabindex]="open() ? 0 : -1"
          (click)="select(item.action)"
        >
          <span class="label">{{ item.label }}</span><span class="icon" aria-hidden="true">{{ item.icon }}</span>
        </button>
      }
      <button class="main" type="button" [attr.aria-expanded]="open()" aria-label="{{ open() ? 'Cerrar acciones' : 'Crear registro' }}" (click)="toggle()">
        <span aria-hidden="true">+</span>
      </button>
    </div>

    @if (selected(); as action) { <app-quick-create [action]="action" (close)="selected.set(null)" (created)="finish($event)" /> }
    @if (message()) { <p class="toast" role="status">{{ message() }}</p> }
  `,
  styles: `
    .backdrop {
      position: fixed;
      z-index: 18;
      inset: 0;
      border: 0;
      background: rgb(5 7 10 / 42%);
      backdrop-filter: blur(3px);
    }
    .radial {
      position: fixed;
      z-index: 20;
      right: max(calc((100vw - 460px) / 2 + 20px), 20px);
      bottom: calc(96px + env(safe-area-inset-bottom));
      width: 58px;
      height: 58px;
    }
    button { font: inherit; }
    .main, .action { position: absolute; right: 0; bottom: 0; border: 0; border-radius: 999px; color: white; cursor: pointer; }
    .main {
      z-index: 2;
      display: grid;
      place-items: center;
      width: 58px;
      height: 58px;
      background: var(--color-purple);
      box-shadow: 0 8px 28px rgb(124 109 255 / 38%);
      font-size: 2rem;
    }
    .main span { transition: transform 180ms ease; }
    .radial--open .main span { transform: rotate(45deg); }
    .action {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0;
      background: transparent;
      opacity: 0;
      pointer-events: none;
      transform: translate(0, 0) scale(.5);
      transition: transform 200ms cubic-bezier(.2,.8,.2,1), opacity 140ms ease;
      transition-delay: calc((5 - var(--index)) * 18ms);
    }
    .radial--open .action {
      opacity: 1;
      pointer-events: auto;
      transform: translate(var(--x), var(--y)) scale(1);
      transition-delay: calc(var(--index) * 24ms);
    }
    .icon { display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid color-mix(in srgb, var(--accent), white 16%); border-radius: 50%; background: color-mix(in srgb, var(--accent), #12151d 72%); box-shadow: 0 8px 24px rgb(0 0 0 / 30%); font-size: 1.15rem; }
    .label { padding: 7px 10px; border: 1px solid var(--color-border); border-radius: 999px; background: rgb(18 21 29 / 94%); color: var(--color-text); font-size: .76rem; font-weight: 700; white-space: nowrap; }
    .toast { position: fixed; z-index: 50; left: 50%; bottom: calc(92px + env(safe-area-inset-bottom)); margin: 0; padding: 11px 16px; transform: translateX(-50%); border: 1px solid rgb(74 222 128 / 35%); border-radius: 999px; background: #102018; color: var(--color-green); box-shadow: 0 10px 30px rgb(0 0 0 / 45%); font-size: .84rem; font-weight: 700; white-space: nowrap; }
    @media (prefers-reduced-motion: reduce) { .main span, .action { transition: none; } }
  `,
})
export class FloatingActionButton {
  private readonly router = inject(Router);
  readonly open = signal(false);
  readonly selected = signal<QuickAction | null>(null);
  readonly message = signal('');
  readonly actions: { action: QuickAction; label: string; icon: string; color: string; x: string; y: string }[] = [
    { action: 'expense', label: 'Gasto', icon: '−', color: 'var(--color-red)', x: '-72px', y: '-58px' },
    { action: 'income', label: 'Ingreso', icon: '+', color: 'var(--color-green)', x: '-122px', y: '-96px' },
    { action: 'debt-payment', label: 'Pago', icon: '✓', color: 'var(--color-orange)', x: '-148px', y: '-144px' },
    { action: 'saving', label: 'Ahorro', icon: '◇', color: 'var(--color-blue)', x: '-145px', y: '-194px' },
    { action: 'routine', label: 'Rutina', icon: '●', color: 'var(--color-pink)', x: '-112px', y: '-238px' },
    { action: 'project', label: 'Proyecto', icon: '▣', color: 'var(--color-purple)', x: '-62px', y: '-270px' },
  ];

  toggle(): void { this.open.update((value) => !value); }
  closeMenu(): void { this.open.set(false); }
  select(action: QuickAction): void { this.closeMenu(); if (action === 'routine') void this.router.navigateByUrl('/routine'); else this.selected.set(action); }
  finish(message: string): void {
    this.selected.set(null);
    this.message.set(message);
    setTimeout(() => this.message.set(''), 2600);
  }

  @HostListener('document:keydown.escape')
  escape(): void {
    if (this.selected()) this.selected.set(null);
    else this.closeMenu();
  }
}
