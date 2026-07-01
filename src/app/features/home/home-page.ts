import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { HOME_FALLBACK } from '../../core/fallbacks/home.fallback';
import { mapDashboardSummaryToHomeSummary } from '../../core/mappers/api.mapper';
import { HomeSummary } from '../../core/models/home-summary.model';
import { DashboardApiService } from '../../core/services/dashboard-api.service';
import { OnboardingStateService } from '../../core/services/onboarding-state.service';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, AppCurrencyPipe],
  template: `
    <div class="page-stack">
      <header class="page-header">
        <p class="page-eyebrow">{{ homeSummary.date || today }}</p>
        <h1 class="page-title">Buenos días, {{ homeSummary.userName || profileName }}</h1>
        <p class="page-copy">Tu centro de control personal para hoy.</p>
      </header>

      @if (apiError()) {
        <p class="api-error" role="status">No pudimos cargar tu resumen. Tus datos guardados no se modificaron.</p>
      }

      @if (financialReady) {
        <section class="surface-card hero-card">
          <p class="card-label">Disponible hoy</p>
          <strong class="hero-amount">{{ homeSummary.availableToday | appCurrency }}</strong>
          <p class="hero-note">MXN · se reinicia en {{ homeSummary.resetHours }} h</p>
          <div class="hero-meta">
            <strong>{{ homeSummary.weeklySpent | appCurrency }} gastado</strong>
            <p class="meta-accent">{{ homeSummary.weeklyRemaining | appCurrency }} restantes de {{ homeSummary.weeklyLimit | appCurrency }}</p>
          </div>
          <div class="progress-track progress-track--large" aria-hidden="true">
            <span class="progress-fill progress-fill--green" [style.width.%]="getProgressPercent(homeSummary.weeklySpent, homeSummary.weeklyLimit)"></span>
          </div>
        </section>

        <section class="mini-grid mini-grid--3">
          <article class="surface-card compact-card"><p class="card-label">Este mes</p><strong>{{ homeSummary.monthlySpent | appCurrency }}</strong><p class="card-meta">de {{ homeSummary.monthlyLimit | appCurrency }}</p></article>
          <article class="surface-card compact-card"><p class="card-label">Ahorrado</p><strong class="value-green">{{ homeSummary.saved | appCurrency }}</strong><p class="card-meta">{{ homeSummary.savingsLabel }}</p></article>
          <article class="surface-card compact-card"><p class="card-label">Deuda</p><strong>{{ homeSummary.debtLeft | appCurrency }}</strong><p class="card-meta">{{ homeSummary.debtLabel }}</p></article>
        </section>
      } @else {
        <section class="surface-card setup-card">
          <h2 class="section-card-title">Tu base ya está lista</h2>
          <p class="section-card-copy">Configura tu dinero para calcular tu disponible de hoy.</p>
          <a class="card-link" routerLink="/money/setup">Configurar dinero →</a>
        </section>
      }

      @if (homeSummary.habits.length) {
        <section class="surface-card">
          <div class="card-head"><h2 class="section-card-title">Hábitos de hoy</h2><a class="card-link" routerLink="/habits">Ver todo</a></div>
          <div class="list-card">
            @for (habit of homeSummary.habits; track habit.id) {
              <div class="list-row"><span class="habit-check" [class.habit-check--done]="habit.done"></span><span class="habit-name">{{ habit.name }}</span><span class="habit-state">{{ habit.done ? 'Listo' : 'Pendiente' }}</span></div>
            }
          </div>
        </section>
      }

      @if (homeSummary.activeDays || homeSummary.streak) {
        <section class="surface-card">
          <div class="card-head"><h2 class="section-card-title">Progreso anual</h2><a class="card-link" routerLink="/progress">Ver</a></div>
          <div class="heatmap-preview">
            @for (day of homeSummary.heatmap; track day.id) { <span [class]="getHeatmapClass(day.value)"></span> }
          </div>
          <div class="split-line split-line--bottom"><p class="section-card-copy">{{ homeSummary.activeDays }} días activos</p><p class="accent-copy">{{ homeSummary.streak }} días de racha</p></div>
        </section>
      }
    </div>
  `,
  styles: `
    .hero-card { padding: 22px; background: radial-gradient(circle at top right, rgb(74 222 128 / .2), transparent 42%), linear-gradient(180deg, rgb(18 36 24 / .96), rgb(18 21 29)); border-color: rgb(74 222 128 / .22); }
    .card-label, .hero-note, .card-meta, .habit-state { margin: 0; color: var(--color-text-secondary); }
    .hero-amount { display: block; margin-top: 8px; font-size: clamp(3.1rem, 14vw, 4.5rem); line-height: .92; letter-spacing: -.08em; color: var(--color-green); }
    .hero-meta { display: grid; gap: 4px; margin: 22px 0 14px; }
    .meta-accent, .accent-copy { margin: 0; color: var(--color-green); }
    .compact-card { min-width: 0; padding: 16px; }
    .compact-card strong { display: block; margin: 6px 0 4px; font-size: 1.15rem; }
    .value-green { color: var(--color-green); }
    .setup-card { display: grid; gap: 12px; background: linear-gradient(180deg, rgb(35 29 65 / .7), var(--color-card)); }
    .api-error { margin: 0; padding: 12px 14px; border-radius: 14px; background: rgb(255 77 109 / .12); color: var(--color-red); }
    .list-row:first-child { padding-top: 0; } .list-row:last-child { padding-bottom: 0; border-bottom: 0; }
    .heatmap-preview { display: grid; grid-template-columns: repeat(12, 1fr); gap: 5px; margin-top: 8px; }
    .heatmap-preview .heatmap-cell { min-height: 16px; aspect-ratio: 1; }
    .split-line--bottom { margin-top: 14px; }
  `,
})
export class HomePage {
  private readonly summary = signal<HomeSummary>(HOME_FALLBACK);
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly onboarding = inject(OnboardingStateService);
  protected readonly apiError = signal(false);
  protected readonly today = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).toUpperCase();

  constructor() {
    this.dashboardApi.getSummary().pipe(
      map(mapDashboardSummaryToHomeSummary),
      tap(() => this.apiError.set(false)),
      catchError(() => { this.apiError.set(true); return of(HOME_FALLBACK); }),
    ).subscribe((summary) => this.summary.set(summary));
  }

  get homeSummary() { return this.summary(); }
  protected get profileName() { return this.onboarding.status()?.profile?.displayName ?? ''; }
  protected get financialReady() { return this.homeSummary.weeklyLimit > 0 || this.homeSummary.monthlyLimit > 0; }
  protected getProgressPercent(used: number, limit: number) { return limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0; }
  protected getHeatmapClass(value: HomeSummary['heatmap'][number]['value']) { return `heatmap-cell heatmap-cell--${value}`; }
}
