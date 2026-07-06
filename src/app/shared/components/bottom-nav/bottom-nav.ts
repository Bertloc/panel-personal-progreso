import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav aria-label="Navegación principal">
      @for (item of items; track item.route) {
        <a
          [routerLink]="item.route"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: item.route === '/' }"
        >
          <span aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </a>
      }
    </nav>
  `,
  styles: `
    nav {
      position: fixed;
      z-index: 10;
      bottom: 0;
      left: 50%;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      width: min(100%, 460px);
      padding: 9px 8px max(10px, env(safe-area-inset-bottom));
      transform: translateX(-50%);
      border-top: 1px solid var(--color-border);
      background: rgb(9 11 15 / 97%);
      backdrop-filter: blur(16px);
    }

    a {
      display: grid;
      justify-items: center;
      gap: 4px;
      color: var(--color-muted);
      font-size: 0.68rem;
      text-decoration: none;
    }

    a span {
      display: grid;
      place-items: center;
      width: 36px;
      height: 30px;
      border-radius: 999px;
      font-size: 1.1rem;
      filter: grayscale(1);
    }

    a.active {
      color: var(--color-green);
    }

    a.active span {
      filter: none;
      background: rgb(40 215 154 / 16%);
    }
  `,
})
export class BottomNav {
  protected readonly items = [
    { label: 'Inicio', icon: '\u2302', route: '/' },
    { label: 'Dinero', icon: '\u25A3', route: '/money' },
    { label: 'Rutina', icon: '\u2713', route: '/routine' },
    { label: 'Progreso', icon: '\u25C7', route: '/progress' },
    { label: 'Proyectos', icon: '\u25A4', route: '/projects' },
  ];
}
