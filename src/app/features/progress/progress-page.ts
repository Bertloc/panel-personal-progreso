import { Component } from '@angular/core';
import { HeatmapDay } from '../../core/models/home-summary.model';
import { HEATMAP_FILTER_HINTS, createMockHeatmap } from '../../core/utils/heatmap.util';

type ConsistencyMonth = {
  name: string;
  percent: number;
};

@Component({
  selector: 'app-progress-page',
  template: `
    <div class="page-stack">
      <header class="page-header">
        <p class="page-eyebrow">Tu año</p>
        <h1 class="page-title">Progreso</h1>
        <p class="page-copy">Tu constancia financiera y personal de un vistazo.</p>
      </header>

      <section class="chip-row">
        @for (filter of filters; track filter.id) {
          <button class="chip" type="button" [class.chip--active]="filter.id === 'general'">
            {{ filter.label }}
          </button>
        }
      </section>

      <section class="surface-card">
        <div class="card-head">
          <div>
            <h2 class="section-card-title">Actividad 2026</h2>
            <p class="section-card-copy">168 días activos</p>
          </div>
          <span class="status-badge status-badge--orange">14 días</span>
        </div>

        <div class="month-labels">
          @for (month of monthLabels; track $index) {
            <span>{{ month }}</span>
          }
        </div>

        <div class="heatmap-grid">
          @for (day of heatmap; track day.id) {
            <span class="heatmap-cell heatmap-box" [class]="getHeatmapClass(day.value)" [attr.data-status]="day.status"></span>
          }
        </div>

        <div class="split-line split-line--bottom heatmap-footer">
          <p class="section-card-copy">45% consistencia</p>
          <div class="legend">
            <span>Less</span>
            <i class="heatmap-cell heatmap-box heatmap-cell--0"></i>
            <i class="heatmap-cell heatmap-box heatmap-cell--1"></i>
            <i class="heatmap-cell heatmap-box heatmap-cell--2"></i>
            <i class="heatmap-cell heatmap-box heatmap-cell--3"></i>
            <i class="heatmap-cell heatmap-box heatmap-cell--4"></i>
            <span>More</span>
          </div>
        </div>
      </section>

      <section class="mini-grid">
        <article class="surface-card compact-card">
          <p class="card-label">Racha más larga</p>
          <strong class="metric-value">48</strong>
          <p class="card-meta">días seguidos</p>
        </article>

        <article class="surface-card compact-card">
          <p class="card-label">Mejor mes</p>
          <strong class="metric-value">Mayo</strong>
          <p class="card-meta">28 días activos</p>
        </article>
      </section>

      <section class="surface-card">
        <h2 class="section-card-title">Consistencia mensual</h2>

        <div class="list-card">
          @for (month of monthlyConsistency; track month.name) {
            <div class="consistency-row">
              <span>{{ month.name }}</span>
              <div class="progress-track" aria-hidden="true">
                <span class="progress-fill progress-fill--green" [style.width.%]="month.percent"></span>
              </div>
              <strong>{{ month.percent }}%</strong>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    .chip-row {
      display: flex;
      gap: 10px;
      overflow: auto;
      scrollbar-width: none;
    }

    .chip-row::-webkit-scrollbar {
      display: none;
    }

    .chip {
      flex: 0 0 auto;
      border: 1px solid transparent;
      border-radius: 999px;
      background: #171b25;
      color: var(--color-text-secondary);
      padding: 11px 16px;
    }

    .chip--active {
      background: rgb(74 222 128 / 0.18);
      color: var(--color-text);
      border-color: rgb(74 222 128 / 0.2);
    }

    .month-labels {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin: 10px 0 8px;
      color: var(--color-text-secondary);
      font-size: 0.78rem;
    }

    .heatmap-grid {
      display: grid;
      grid-template-columns: repeat(18, minmax(0, 1fr));
      gap: 5px;
      justify-items: center;
    }

    .heatmap-box {
      width: 100%;
      max-width: 14px;
      aspect-ratio: 1;
    }

    .heatmap-footer {
      align-items: center;
      flex-wrap: wrap;
    }

    .legend {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--color-text-secondary);
      font-size: 0.85rem;
    }

    .legend .heatmap-box {
      width: 11px;
      max-width: 11px;
    }

    .compact-card {
      padding: 18px;
    }

    .metric-value {
      display: block;
      margin: 8px 0 4px;
      font-size: 2rem;
      line-height: 1;
      letter-spacing: -0.06em;
      color: var(--color-green);
    }

    .consistency-row {
      display: grid;
      grid-template-columns: 74px 1fr auto;
      align-items: center;
      gap: 12px;
      padding-block: 10px;
    }

    .consistency-row:first-child {
      padding-top: 0;
    }

    .consistency-row:last-child {
      padding-bottom: 0;
    }
  `,
})
export class ProgressPage {
  protected readonly filters = [
    { id: 'general', label: 'General', hint: HEATMAP_FILTER_HINTS.general },
    { id: 'habits', label: 'Hábitos', hint: HEATMAP_FILTER_HINTS.habits },
    { id: 'money', label: 'Dinero', hint: HEATMAP_FILTER_HINTS.money },
    { id: 'savings', label: 'Ahorro', hint: HEATMAP_FILTER_HINTS.savings },
    { id: 'debt', label: 'Deuda', hint: HEATMAP_FILTER_HINTS.debt },
  ];

  protected readonly monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
  protected readonly heatmap = createMockHeatmap(126);
  protected readonly monthlyConsistency: ConsistencyMonth[] = [
    { name: 'Enero', percent: 64 },
    { name: 'Febrero', percent: 71 },
    { name: 'Marzo', percent: 80 },
    { name: 'Abril', percent: 76 },
    { name: 'Mayo', percent: 93 },
    { name: 'Junio', percent: 82 },
  ];

  protected getHeatmapClass(value: HeatmapDay['value']): string {
    return `heatmap-cell heatmap-cell--${value}`;
  }
}
