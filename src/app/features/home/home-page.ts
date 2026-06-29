import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomeSummary } from '../../core/models/home-summary.model';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { HOME_FALLBACK } from '../../core/fallbacks/home.fallback';
import { DashboardApiService } from '../../core/services/dashboard-api.service';
import { mapDashboardSummaryToHomeSummary } from '../../core/mappers/api.mapper';
import { catchError, map, of } from 'rxjs';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, AppCurrencyPipe],
  template: `
    <div class="page-stack">
      <header class="page-header">
        <p class="page-eyebrow">{{ homeSummary.date }}</p>
        <h1 class="page-title">Buenos días, {{ homeSummary.userName }}</h1>
        <p class="page-copy">Tu centro de control personal para hoy.</p>
      </header>

      <section class="surface-card hero-card">
        <p class="card-label">Disponible hoy</p>
        <strong class="hero-amount">{{ homeSummary.availableToday | appCurrency }}</strong>
        <p class="hero-note">MXN · se reinicia en {{ homeSummary.resetHours }} h</p>

        <div class="hero-meta">
          <div>
            <p class="meta-label">Quincena actual</p>
            <strong>{{ homeSummary.weeklySpent | appCurrency }} gastado</strong>
          </div>
          <p class="meta-accent">
            {{ homeSummary.weeklyRemaining | appCurrency }} restantes de
            {{ homeSummary.weeklyLimit | appCurrency }}
          </p>
        </div>

        <div class="progress-track progress-track--large" aria-hidden="true">
          <span
            class="progress-fill progress-fill--green"
            [style.width.%]="getProgressPercent(homeSummary.weeklySpent, homeSummary.weeklyLimit)"
          ></span>
        </div>
      </section>

      <section class="mini-grid mini-grid--3">
        <article class="surface-card compact-card">
          <p class="card-label">Este mes</p>
          <strong>{{ homeSummary.monthlySpent | appCurrency }}</strong>
          <p class="card-meta">de {{ homeSummary.monthlyLimit | appCurrency }}</p>
        </article>

        <article class="surface-card compact-card">
          <p class="card-label">Ahorrado</p>
          <strong class="value-green">{{ homeSummary.saved | appCurrency }}</strong>
          <p class="card-meta">{{ homeSummary.savingsLabel }}</p>
        </article>

        <article class="surface-card compact-card">
          <p class="card-label">Deuda</p>
          <strong>{{ homeSummary.debtLeft | appCurrency }}</strong>
          <p class="card-meta">{{ homeSummary.debtLabel }}</p>
        </article>
      </section>

      <section class="surface-card">
        <div class="card-head">
          <div>
            <h2 class="section-card-title">Deuda bancaria</h2>
            <p class="section-card-copy">Próximo pago: {{ homeSummary.nextDebtDate }}</p>
          </div>
          <span class="status-badge status-badge--orange">Plan agresivo</span>
        </div>

        <div class="split-line">
          <strong class="section-highlight">{{ homeSummary.nextDebtPayment | appCurrency }}</strong>
          <span class="section-card-copy">{{ homeSummary.debtProgress }}%</span>
        </div>

        <p class="section-card-copy">Liquidar en septiembre con foco total.</p>

        <div class="progress-track" aria-hidden="true">
          <span
            class="progress-fill progress-fill--purple"
            [style.width.%]="homeSummary.debtProgress"
          ></span>
        </div>

        <p class="accent-copy">Pago extra sugerido: {{ homeSummary.suggestedExtraPayment | appCurrency }}</p>
      </section>

      <section class="surface-card">
        <div class="card-head">
          <h2 class="section-card-title">Hábitos de hoy</h2>
          <a class="card-link" routerLink="/habits">Ver todo</a>
        </div>

        <div class="list-card">
          @for (habit of homeSummary.habits; track habit.id) {
            <div class="list-row">
              <span class="habit-check" [class.habit-check--done]="habit.done"></span>
              <span class="habit-name">{{ habit.name }}</span>
              <span class="habit-state">{{ habit.done ? 'Listo' : 'Pendiente' }}</span>
            </div>
          }
        </div>
      </section>

      <section class="surface-card">
        <div class="card-head">
          <h2 class="section-card-title">Progreso anual</h2>
          <a class="card-link" routerLink="/progress">Ver</a>
        </div>

        <div class="heatmap-preview">
          @for (day of homeSummary.heatmap; track day.id) {
            <span class="heatmap-cell" [class]="getHeatmapClass(day.value)" [attr.data-status]="day.status"></span>
          }
        </div>

        <div class="split-line split-line--bottom">
          <p class="section-card-copy">{{ homeSummary.activeDays }} días activos</p>
          <p class="accent-copy">{{ homeSummary.streak }} días de racha</p>
        </div>
      </section>
    </div>
  `,
  styles: `
    .hero-card {
      padding: 22px;
      background:
        radial-gradient(circle at top right, rgb(74 222 128 / 0.2), transparent 42%),
        linear-gradient(180deg, rgb(18 36 24 / 0.96), rgb(18 21 29 / 1));
      border-color: rgb(74 222 128 / 0.22);
    }

    .card-label,
    .hero-note,
    .meta-label,
    .card-meta,
    .habit-state {
      margin: 0;
      color: var(--color-text-secondary);
    }

    .hero-amount {
      display: block;
      margin-top: 8px;
      font-size: clamp(3.1rem, 14vw, 4.5rem);
      line-height: 0.92;
      letter-spacing: -0.08em;
      color: var(--color-green);
    }

    .hero-meta {
      display: grid;
      gap: 4px;
      margin: 22px 0 14px;
    }

    .meta-label {
      margin-bottom: 4px;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .meta-accent,
    .accent-copy {
      margin: 0;
      color: var(--color-green);
    }

    .compact-card {
      min-width: 0;
      padding: 16px;
    }

    .compact-card strong {
      display: block;
      margin: 6px 0 4px;
      font-size: 1.15rem;
      line-height: 1.1;
    }

    .value-green {
      color: var(--color-green);
    }

    .section-highlight {
      font-size: 1.8rem;
      line-height: 1.1;
      letter-spacing: -0.04em;
    }

    .split-line--bottom {
      margin-top: 14px;
    }

    .list-row:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .list-row:first-child {
      padding-top: 0;
    }

    .heatmap-preview {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 5px;
      margin-top: 8px;
    }

    .heatmap-preview .heatmap-cell {
      aspect-ratio: 1;
      min-height: 16px;
    }

    @media (max-width: 380px) {
      .compact-card {
        padding: 14px;
      }

      .compact-card strong {
        font-size: 1rem;
      }
    }
  `,
})
export class HomePage {
  private readonly summary = signal<HomeSummary>(HOME_FALLBACK);
  private readonly dashboardApi = inject(DashboardApiService);

  constructor() {
    this.dashboardApi.getSummary().pipe(
      map(mapDashboardSummaryToHomeSummary),
      catchError(() => of(HOME_FALLBACK)),
    ).subscribe((summary) => this.summary.set(summary));
  }

  get homeSummary(): HomeSummary { return this.summary(); }

  protected getProgressPercent(used: number, limit: number): number {
    return Math.min(100, Math.round((used / limit) * 100));
  }

  protected getHeatmapClass(value: HomeSummary['heatmap'][number]['value']): string {
    return `heatmap-cell heatmap-cell--${value}`;
  }
}
