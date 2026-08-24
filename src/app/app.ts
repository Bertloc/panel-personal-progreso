import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { BottomNav } from './shared/components/bottom-nav/bottom-nav';
import { FloatingActionButton } from './shared/components/floating-action-button/floating-action-button';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BottomNav, FloatingActionButton],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  private readonly currentUrl = toSignal(this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map((event) => event.urlAfterRedirects),
    startWith(this.router.url),
  ), { requireSync: true });
  protected readonly showChrome = computed(() => !isAuthRoute(this.currentUrl()));
  protected readonly showFab = computed(() => this.currentUrl().split(/[?#]/, 1)[0] !== '/settings');

  constructor() {
    effect(() => { if (!this.auth.loading() && !this.auth.isAuthenticated() && !isAuthRoute(this.router.url)) void this.router.navigateByUrl('/login'); });
  }
}

function isAuthRoute(url: string): boolean {
  return ['/login', '/register', '/onboarding'].some((route) => url.startsWith(route));
}
