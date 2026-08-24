import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, defer, finalize, forkJoin, map, merge, of, startWith, Subject, switchMap } from 'rxjs';
import { ProgressHeatmapDay } from '../../core/models/progress.model';
import { ProgressApiService } from '../../core/services/progress-api.service';
import { QuickCreateEventsService } from '../../core/services/quick-create-events.service';
import { RoutineEventsService } from '../../core/services/routine-events.service';
import { averageProgressLevel, groupProgressDaysByMonth, previousProgressRange, progressDaysInRange, ProgressPeriod, progressPeriodRange, progressTrend, shiftProgressAnchor } from '../../core/utils/heatmap.util';

const PERIODS: Array<{ id: ProgressPeriod; label: string }> = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
];
const TODAY = isoDate(new Date());

@Component({
  selector: 'app-progress-page',
  template: `
    <div class="page-stack">
      <header class="page-header">
        <p class="page-eyebrow">Tu evolución</p>
        <h1 class="page-title">Progreso</h1>
        <p class="page-copy">Compara tu nivel de actividad a lo largo del tiempo.</p>
      </header>

      <section class="periods" aria-label="Periodo de progreso">
        @for (option of periods; track option.id) {
          <button type="button" [class.active]="option.id === period()" [attr.aria-pressed]="option.id === period()" (click)="selectPeriod(option.id)">{{ option.label }}</button>
        }
      </section>

      <section class="period-nav" aria-label="Cambiar periodo">
        <button type="button" aria-label="Periodo anterior" (click)="changePeriod(-1)">‹</button>
        <strong>{{ periodLabel() }}</strong>
        <button type="button" aria-label="Periodo siguiente" [disabled]="!canGoNext()" (click)="changePeriod(1)">›</button>
      </section>

      @if (loading()) {
        <p class="state" role="status">Cargando tu progreso…</p>
      } @else if (apiError()) {
        <section class="surface-card state state--error" role="alert">
          <p>No se pudo cargar tu progreso.</p>
          <button type="button" (click)="reload()">Reintentar</button>
        </section>
      } @else {
        <section class="surface-card progress-hero">
          <div class="metric-block">
            <p class="card-label">Nivel promedio</p>
            <p class="metric-period">{{ periodLabel() }}</p>
            @if (currentDays().length) {
              <strong class="average">{{ formatLevel(averageLevel() ?? 0) }}<small>/4</small></strong>
              <p class="section-card-copy">Promedio de los días con registro en este periodo.</p>
            } @else {
              <h2 class="section-card-title">Aún no hay actividad registrada en este periodo.</h2>
            }
          </div>
          @if (trend(); as comparison) {
            <div class="trend" [class.trend--up]="comparison.difference > 0" [class.trend--down]="comparison.difference < 0">
              <strong>{{ comparison.label }}</strong>
              <span>{{ comparison.difference > 0 ? '+' : '' }}{{ formatLevel(comparison.difference) }} puntos frente al periodo anterior</span>
            </div>
          } @else {
            <p class="history-note">Aún no hay suficiente historial para mostrar una tendencia.</p>
          }
        </section>

        @if (currentDays().length) {
          <section class="consistency-grid" aria-label="Consistencia del periodo">
            <article class="surface-card"><span>Días registrados</span><strong>{{ currentDays().length }}</strong></article>
            <article class="surface-card"><span>Días con avance</span><strong>{{ activeDays() }}</strong></article>
            <article class="surface-card"><span>Días en nivel máximo</span><strong>{{ excellentDays() }}</strong></article>
          </section>
        }

        <section class="surface-card heatmap-card">
          <div>
            <h2 class="section-card-title">Evolución diaria</h2>
            <p class="section-card-copy">Cada cuadro representa un día del periodo. Los días sin registro y las fechas futuras se muestran por separado.</p>
          </div>
          <div class="months">
            @for (month of months(); track month.label) {
              <section class="month">
                <h3>{{ month.label }}</h3>
                <div class="weekdays" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
                <div class="month-grid">
                  @for (slot of month.slots; track $index) {
                    @if (slot) {
                      <span [class]="calendarClass(slot)" role="img" [attr.title]="calendarLabel(slot)" [attr.aria-label]="calendarLabel(slot)"></span>
                    } @else { <span aria-hidden="true"></span> }
                  }
                </div>
              </section>
            }
          </div>
          <div class="legend" aria-label="Leyenda de evolución diaria">
            <span><i class="heatmap-cell heatmap-cell--missing"></i>Sin registro</span>
            <span><i class="heatmap-cell heatmap-cell--0"></i>Sin avance</span>
            @for (item of legend().slice(1); track item.level) { <span><i [class]="heatmapClass(item.level)"></i>{{ item.label }}</span> }
            <span><i class="heatmap-cell heatmap-cell--future"></i>Fecha futura</span>
          </div>
        </section>

        @if (recentDays().length) {
          <section class="surface-card history-card">
            <div><h2 class="section-card-title">Historial reciente</h2><p class="section-card-copy">Últimos días registrados dentro del periodo.</p></div>
            <div class="history-list">
              @for (day of recentDays(); track day.date) {
                <div><span>{{ formatDate(day.date) }}</span><strong>{{ statusLabel(day.status) }} · {{ formatLevel(day.value) }}/4</strong></div>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .periods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .periods button, .period-nav button, .state button { border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-card-secondary); color: var(--color-text-secondary); padding: 10px 14px; cursor: pointer; }
    .periods button.active { border-color: var(--color-green); background: rgb(40 215 154 / .12); color: var(--color-green); }
    .period-nav { display: grid; grid-template-columns: 40px minmax(0, 1fr) 40px; align-items: center; gap: 12px; }
    .period-nav strong { text-align: center; text-transform: capitalize; }
    .period-nav button { width: 40px; height: 40px; padding: 0; font-size: 1.5rem; }
    .period-nav button:disabled { cursor: default; opacity: .35; }
    .state { margin: 0; text-align: center; color: var(--color-text-secondary); }
    .state p { margin: 0; }
    .state--error { display: grid; justify-items: center; gap: 12px; color: var(--color-red); }
    .progress-hero { display: grid; justify-items: center; gap: 20px; padding: clamp(22px, 7vw, 32px); text-align: center; background: radial-gradient(circle at top right, rgb(124 109 255 / .14), transparent 46%), var(--color-card); }
    .metric-block { width: 100%; max-width: 32rem; }
    .metric-period { margin: 5px 0 0; color: var(--color-text-secondary); font-size: .86rem; font-weight: 700; text-transform: capitalize; }
    .average { display: flex; align-items: baseline; justify-content: center; margin: 22px 0 14px; color: var(--color-green); font-size: clamp(3.5rem, 18vw, 5rem); line-height: .82; letter-spacing: -.07em; }
    .average small { margin-left: 7px; color: var(--color-text-secondary); font-size: 1.15rem; letter-spacing: 0; }
    .trend { display: grid; gap: 3px; padding: 12px 14px; border-radius: 14px; background: rgb(124 109 255 / .12); color: var(--color-purple); }
    .trend span, .history-note { color: var(--color-text-secondary); font-size: .8rem; }
    .trend--up { background: rgb(40 215 154 / .12); color: var(--color-green); }
    .trend--down { background: rgb(255 77 109 / .12); color: var(--color-red); }
    .trend, .history-note { width: 100%; max-width: 32rem; }
    .history-note { margin: 0; }
    .consistency-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .consistency-grid article { min-width: 0; padding: 14px 8px; text-align: center; }
    .consistency-grid span { display: block; min-height: 2.2em; color: var(--color-text-secondary); font-size: .68rem; line-height: 1.1; }
    .consistency-grid strong { display: block; margin-top: 6px; font-size: 1rem; }
    .heatmap-card, .history-card { display: grid; gap: 20px; padding: 16px; }
    .months { display: grid; grid-template-columns: 1fr; gap: 20px 14px; }
    .month { width: min(100%, 30rem); margin-inline: auto; }
    .month h3 { margin: 0 0 8px; color: var(--color-text-secondary); font-size: .85rem; text-transform: capitalize; }
    .weekdays, .month-grid { display: grid; grid-template-columns: repeat(7, minmax(28px, 1fr)); gap: 4px; }
    .weekdays { margin-bottom: 5px; color: var(--color-muted); text-align: center; font-size: .6rem; }
    .month-grid > * { width: 100%; aspect-ratio: 1; border-radius: 3px; }
    .heatmap-cell--missing { background: transparent; box-shadow: inset 0 0 0 1px var(--color-border); }
    .heatmap-cell--future { background: repeating-linear-gradient(135deg, transparent, transparent 3px, rgb(255 255 255 / .05) 3px, rgb(255 255 255 / .05) 5px); box-shadow: inset 0 0 0 1px rgb(255 255 255 / .06); }
    .legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 16px; padding-top: 18px; border-top: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: .72rem; }
    .legend span { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .legend i { width: 12px; height: 12px; border-radius: 3px; }
    .history-list { display: grid; }
    .history-list div { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
    .history-list div:last-child { border-bottom: 0; }
    .history-list span { color: var(--color-text-secondary); }
    .history-list strong { text-align: right; }
  `,
})
export class ProgressPage {
  private readonly api = inject(ProgressApiService);
  private readonly moneyEvents = inject(QuickCreateEventsService);
  private readonly routineEvents = inject(RoutineEventsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh = new Subject<void>();
  protected readonly periods = PERIODS;
  protected readonly period = signal<ProgressPeriod>('month');
  protected readonly anchor = signal(TODAY);
  protected readonly days = signal<ProgressHeatmapDay[]>([]);
  protected readonly legend = signal(defaultLegend());
  protected readonly loading = signal(true);
  protected readonly apiError = signal(false);
  protected readonly range = computed(() => progressPeriodRange(this.period(), this.anchor()));
  protected readonly previousRange = computed(() => previousProgressRange(this.period(), this.range()));
  protected readonly currentDays = computed(() => progressDaysInRange(this.days(), this.range()).filter(({ date }) => date <= TODAY));
  protected readonly previousDays = computed(() => progressDaysInRange(this.days(), this.previousRange()).filter(({ date }) => date <= TODAY));
  protected readonly averageLevel = computed(() => averageProgressLevel(this.currentDays()));
  protected readonly trend = computed(() => progressTrend(this.currentDays(), this.previousDays()));
  protected readonly activeDays = computed(() => this.currentDays().filter(({ level }) => level > 0).length);
  protected readonly excellentDays = computed(() => this.currentDays().filter(({ level }) => level === 4).length);
  protected readonly months = computed(() => groupProgressDaysByMonth(this.currentDays(), this.range(), TODAY));
  protected readonly recentDays = computed(() => [...this.currentDays()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8));
  protected readonly canGoNext = computed(() => this.range().end < TODAY);
  protected readonly periodLabel = computed(() => formatPeriod(this.period(), this.range()));

  constructor() {
    merge(this.refresh.pipe(startWith(undefined)), this.moneyEvents.moneyChanged$, this.routineEvents.changed$).pipe(
      switchMap(() => defer(() => {
        this.loading.set(true); this.apiError.set(false);
        const years = [...new Set([this.range().start.slice(0, 4), this.range().end.slice(0, 4), this.previousRange().start.slice(0, 4), this.previousRange().end.slice(0, 4)])].map(Number);
        return forkJoin(years.map((year) => this.api.getHeatmap('general', year))).pipe(
          map((responses) => ({ days: responses.flatMap(({ items }) => items), legend: responses[0]?.legend ?? defaultLegend() })),
          catchError(() => { this.apiError.set(true); return of({ days: [], legend: defaultLegend() }); }),
          finalize(() => this.loading.set(false)),
        );
      })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ days, legend }) => { this.days.set(days); this.legend.set(legend); });
  }

  protected selectPeriod(period: ProgressPeriod) { if (period !== this.period()) { this.period.set(period); this.refresh.next(); } }
  protected changePeriod(offset: number) { if (offset > 0 && !this.canGoNext()) return; this.anchor.set(shiftProgressAnchor(this.period(), this.anchor(), offset)); this.refresh.next(); }
  protected reload() { this.refresh.next(); }
  protected heatmapClass(level: number) { return `heatmap-cell heatmap-cell--${level}`; }
  protected calendarClass(day: ReturnType<typeof groupProgressDaysByMonth>[number]['slots'][number]) {
    if (!day) return '';
    if (day.future) return 'heatmap-cell heatmap-cell--future';
    return day.progress ? this.heatmapClass(day.progress.level) : 'heatmap-cell heatmap-cell--missing';
  }
  protected calendarLabel(day: NonNullable<ReturnType<typeof groupProgressDaysByMonth>[number]['slots'][number]>) {
    const date = this.formatDate(day.date);
    if (day.future) return `${date}: fecha futura`;
    return day.progress ? `${date}: ${this.statusLabel(day.progress.status)}, nivel ${this.formatLevel(day.progress.value)} de 4` : `${date}: sin registro`;
  }
  protected formatDate(date: string) { return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(localDate(date)); }
  protected formatLevel(value: number) { return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(value); }
  protected statusLabel(status: ProgressHeatmapDay['status']) { return ({ empty: 'Sin avance', low: 'Bajo', ok: 'Regular', good: 'Bien', excellent: 'Excelente' })[status]; }
}

function defaultLegend() { return ['Sin avance', 'Bajo', 'Regular', 'Bien', 'Excelente'].map((label, level) => ({ level, label })); }
function localDate(value: string) { return new Date(`${value.slice(0, 10)}T00:00:00`); }
function isoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function formatPeriod(period: ProgressPeriod, range: { start: string; end: string }) {
  if (period === 'year') return range.start.slice(0, 4);
  if (period === 'month') return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(localDate(range.start));
  return `${new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(localDate(range.start))} – ${new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(localDate(range.end))}`;
}
