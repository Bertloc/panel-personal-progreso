import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { BottomNav } from './shared/components/bottom-nav/bottom-nav';
import { FloatingActionButton } from './shared/components/floating-action-button/floating-action-button';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BottomNav, FloatingActionButton],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly router = inject(Router);
  protected readonly showChrome = toSignal(this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map((event) => !event.urlAfterRedirects.startsWith('/onboarding')),
    startWith(!this.router.url.startsWith('/onboarding')),
  ), { requireSync: true });
}
