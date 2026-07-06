import { Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { QuickAction, QuickCreate } from '../quick-create/quick-create';

@Component({
  selector: 'app-floating-action-button',
  imports: [QuickCreate],
  template: `
    @if (open()) { <button class="backdrop" type="button" aria-label="Cerrar menú" (click)="closeMenu()"></button> }
    <div class="radial" [class.radial--open]="open()">
      <div class="actions" aria-label="Acciones de creación rápida">
        @for (item of actions; track item.action; let index = $index) {
          <button class="action" type="button" [style.--index]="index" [style.--accent]="item.color" [attr.aria-label]="item.label" [attr.tabindex]="open() ? 0 : -1" (click)="select(item.action)">
            <span class="label">{{ item.label }}</span><span class="icon" aria-hidden="true">{{ item.icon }}</span>
          </button>
        }
      </div>
      <button class="main" type="button" [attr.aria-expanded]="open()" aria-label="{{ open() ? 'Cerrar acciones' : 'Crear registro' }}" (click)="toggle()">
        <span aria-hidden="true">{{ open() ? '×' : '+' }}</span>
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
      background: rgb(3 5 7 / 68%);
      backdrop-filter: blur(9px);
      animation: fade-in 160ms ease-out;
    }
    .radial {
      position: fixed;
      z-index: 20;
      right: max(calc((100vw - 460px) / 2 + 20px), 20px);
      bottom: calc(88px + env(safe-area-inset-bottom));
      width: 56px;
      height: 56px;
    }
    button { font: inherit; }
    .main, .action { position: absolute; right: 0; bottom: 0; border: 0; border-radius: 999px; color: white; cursor: pointer; }
    .main {
      z-index: 2;
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      background: var(--color-purple);
      box-shadow: 0 8px 28px rgb(124 109 255 / 38%);
      font-size: 2rem;
    }
    .main span { line-height: 1; transition: transform 180ms ease; }
    .radial--open .main span { transform: rotate(180deg); }
    .actions { position: absolute; right: 0; bottom: 68px; display: grid; justify-items: end; gap: 10px; width: max-content; }
    .action {
      position: relative;
      display: grid;
      grid-template-columns: auto 44px;
      align-items: center;
      gap: 8px;
      padding: 0;
      background: transparent;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translateY(14px) scale(.96);
      transition: transform 190ms cubic-bezier(.2,.8,.2,1), opacity 140ms ease, visibility 0s linear 190ms;
      transition-delay: calc((5 - var(--index)) * 12ms);
    }
    .radial--open .action {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translateY(0) scale(1);
      transition-delay: calc(var(--index) * 24ms);
    }
    .icon { display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid color-mix(in srgb, var(--accent), white 18%); border-radius: 50%; background: var(--accent); box-shadow: 0 8px 24px rgb(0 0 0 / 34%); color: white; font-size: 1.15rem; }
    .label { padding: 8px 11px; border-radius: 12px; background: #25272c; color: var(--color-text); box-shadow: 0 6px 20px rgb(0 0 0 / 22%); font-size: .78rem; font-weight: 750; white-space: nowrap; }
    .toast { position: fixed; z-index: 50; left: 50%; bottom: calc(92px + env(safe-area-inset-bottom)); margin: 0; padding: 11px 16px; transform: translateX(-50%); border: 1px solid rgb(74 222 128 / 35%); border-radius: 999px; background: #102018; color: var(--color-green); box-shadow: 0 10px 30px rgb(0 0 0 / 45%); font-size: .84rem; font-weight: 700; white-space: nowrap; }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .backdrop { animation: none; } .main span, .action { transition: none; } }
  `,
})
export class FloatingActionButton {
  private readonly router = inject(Router);
  readonly open = signal(false);
  readonly selected = signal<QuickAction | null>(null);
  readonly message = signal('');
  readonly actions: { action: QuickAction; label: string; icon: string; color: string }[] = [
    { action: 'expense', label: 'Gasto', icon: '−', color: 'var(--color-red)' },
    { action: 'income', label: 'Ingreso', icon: '+', color: 'var(--color-green)' },
    { action: 'debt-payment', label: 'Pago', icon: '✓', color: 'var(--color-orange)' },
    { action: 'saving', label: 'Ahorro', icon: '▣', color: 'var(--color-purple)' },
    { action: 'routine', label: 'Rutina', icon: '○', color: '#2d3037' },
    { action: 'project', label: 'Proyecto', icon: '▥', color: 'var(--color-purple)' },
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
