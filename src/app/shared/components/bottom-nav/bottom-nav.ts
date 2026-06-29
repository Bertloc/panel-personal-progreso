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
      padding: 10px 8px max(10px, env(safe-area-inset-bottom));
      transform: translateX(-50%);
      border: 1px solid var(--color-border);
      border-bottom: 0;
      background: rgb(9 11 16 / 96%);
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
      font-size: 1.1rem;
      filter: grayscale(1);
    }

    a.active {
      color: var(--color-green);
    }

    a.active span {
      filter: none;
    }
  `,
})
export class BottomNav {
  protected readonly items = [
    { label: 'Inicio', icon: '\u2302', route: '/' },
    { label: 'Dinero', icon: '\u25A3', route: '/money' },
    { label: 'Hábitos', icon: '\u2713', route: '/habits' },
    { label: 'Progreso', icon: '\u25C7', route: '/progress' },
    { label: 'Proyectos', icon: '\u25A4', route: '/projects' },
  ];
}
