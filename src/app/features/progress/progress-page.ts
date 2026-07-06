import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, defer, finalize, merge, of, startWith, Subject, switchMap } from 'rxjs';
import { emptyProgress } from '../../core/fallbacks/progress.fallback';
import { ProgressDayDetail, ProgressFilter, ProgressHeatmapDay } from '../../core/models/progress.model';
import { ProgressApiService } from '../../core/services/progress-api.service';
import { QuickCreateEventsService } from '../../core/services/quick-create-events.service';
import { RoutineEventsService } from '../../core/services/routine-events.service';
import { groupProgressDaysByMonth } from '../../core/utils/heatmap.util';
import { ActionModal } from '../../shared/components/action-modal/action-modal';

const FILTERS: Array<{ id: ProgressFilter; label: string; copy: string }> = [
  { id: 'general', label: 'General', copy: 'Combina dinero, rutina, deuda y ahorro cuando hay datos disponibles.' },
  { id: 'money', label: 'Dinero', copy: 'Mide si vas dentro de tu presupuesto.' },
  { id: 'routine', label: 'Rutina', copy: 'Mide qué tanto cumpliste tus actividades programadas.' },
  { id: 'debt', label: 'Deuda', copy: 'Resalta días con pagos o avances de deuda.' },
  { id: 'saving', label: 'Ahorro', copy: 'Resalta días con aportes o avances en metas.' },
];

@Component({
  selector: 'app-progress-page',
  imports: [ActionModal],
  template: `
    <div class="page-stack">
      <header class="page-header">
        <p class="page-eyebrow">Tu avance</p>
        <h1 class="page-title">Progreso</h1>
        <p class="page-copy">Cada cuadro representa un día. Más intensidad significa mejor cumplimiento.</p>
      </header>

      <section class="filters" aria-label="Filtrar progreso">
        @for (filter of filters; track filter.id) {
          <button type="button" [class.active]="filter.id === activeFilter()" [attr.aria-pressed]="filter.id === activeFilter()" (click)="selectFilter(filter.id)">{{ filter.label }}</button>
        }
      </section>
      <p class="filter-copy">{{ activeFilterCopy() }}</p>

      <section class="year-row" aria-label="Elegir año">
        <button type="button" aria-label="Año anterior" (click)="changeYear(-1)">‹</button>
        <strong>{{ year() }}</strong>
        <button type="button" aria-label="Año siguiente" (click)="changeYear(1)">›</button>
      </section>

      @if (loading()) {
        <p class="state" role="status">Cargando tu progreso…</p>
      } @else if (apiError()) {
        <section class="surface-card state state--error" role="alert">
          <p>No se pudo cargar tu progreso.</p>
          <button type="button" (click)="reload()">Reintentar</button>
        </section>
      } @else {
        @if (data().items.length) {
          <section class="summary-grid" aria-label="Resumen de progreso">
            <article class="surface-card"><span>Promedio</span><strong>{{ data().summary.average }}%</strong></article>
            <article class="surface-card"><span>Días activos</span><strong>{{ data().summary.activeDays }}</strong></article>
            <article class="surface-card"><span>Días excelentes</span><strong>{{ data().summary.excellentDays }}</strong></article>
            <article class="surface-card"><span>Racha actual</span><strong>{{ data().summary.currentStreak }} días</strong></article>
            <article class="surface-card"><span>Mejor día</span><strong>{{ formatShortDate(data().summary.bestDay) }}</strong></article>
          </section>

          @if (!hasActivity()) { <p class="state">Aún no hay suficiente actividad para calcular progreso.</p> }

          <section class="surface-card heatmap-card">
            <div>
              <h2 class="section-card-title">Actividad {{ year() }}</h2>
              <p class="section-card-copy">Cada cuadro es un día. Los días sin registros aparecen apagados.</p>
            </div>
            <div class="months">
              @for (month of months(); track month.label) {
                <section class="month">
                  <h3>{{ month.label }}</h3>
                  <div class="weekdays" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
                  <div class="month-grid">
                    @for (day of month.slots; track $index) {
                      @if (day) {
                        <span class="heatmap-cell" [class]="heatmapClass(day.level)" role="img" [attr.title]="dayLabel(day)" [attr.aria-label]="dayLabel(day)"></span>
                      } @else { <span aria-hidden="true"></span> }
                    }
                  </div>
                </section>
              }
            </div>
            <div class="legend" aria-label="Intensidad del progreso">
              @for (item of data().legend; track item.level) {
                <span><i [class]="heatmapClass(item.level)"></i>{{ item.label }}</span>
              }
            </div>
          </section>
        } @else {
          <section class="surface-card state empty-state"><strong>Aún no hay datos para este filtro</strong><p>Registra actividad y vuelve para ver cómo crece tu mapa anual.</p></section>
        }
      }
    </div>

    @if (selectedDate()) {
      <app-action-modal [title]="'Detalle del ' + formatLongDate(selectedDate())" (close)="closeDay()">
        @if (detailLoading()) {
          <p class="detail-state">Cargando detalle…</p>
        } @else if (detailError()) {
          <p class="detail-state detail-error">No se pudo cargar el detalle del día.</p>
        } @else if (detail(); as day) {
          @if (detailRows(day).length) {
            <dl class="detail-list">
              @for (row of detailRows(day); track row.label) { <div><dt>{{ row.label }}</dt><dd>{{ row.value }}</dd></div> }
            </dl>
          } @else { <p class="detail-state">Sin registros para este día.</p> }
        }
      </app-action-modal>
    }
  `,
  styles: `
    .filters { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
    .filters::-webkit-scrollbar { display: none; }
    .filters button, .year-row button, .state button { border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-card-secondary); color: var(--color-text-secondary); padding: 10px 14px; cursor: pointer; }
    .filters button.active { border-color: var(--color-green); background: rgb(40 215 154 / .12); color: var(--color-green); }
    .filter-copy { min-height: 44px; margin: -6px 2px 0; color: var(--color-text-secondary); line-height: 1.45; }
    .year-row { display: flex; align-items: center; justify-content: center; gap: 18px; }
    .year-row button { width: 40px; height: 40px; padding: 0; font-size: 1.5rem; }
    .year-row strong { min-width: 4ch; text-align: center; font-size: 1.25rem; }
    .state { margin: 0; text-align: center; color: var(--color-text-secondary); }
    .state p { margin: 0; }
    .state--error { display: grid; justify-items: center; gap: 12px; color: var(--color-red); }
    .summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
    .summary-grid article { min-width: 0; padding: 12px 5px; border-radius: 16px; text-align: center; }
    .summary-grid span { display: block; min-height: 2.2em; color: var(--color-text-secondary); font-size: .65rem; line-height: 1.1; }
    .summary-grid strong { display: block; margin-top: 5px; overflow-wrap: anywhere; font-size: .85rem; }
    .heatmap-card { display: grid; gap: 20px; padding: 16px; }
    .months { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 14px; }
    .month h3 { margin: 0 0 8px; color: var(--color-text-secondary); font-size: .85rem; text-transform: capitalize; }
    .weekdays, .month-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
    .weekdays { margin-bottom: 5px; color: var(--color-muted); text-align: center; font-size: .6rem; }
    .month-grid > * { width: 100%; aspect-ratio: 1; }
    .legend { display: flex; flex-wrap: wrap; gap: 9px 14px; padding-top: 16px; border-top: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: .72rem; }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .legend i { width: 12px; height: 12px; }
    .detail-state { margin: 0; color: var(--color-text-secondary); }
    .detail-error { color: var(--color-red); }
    .detail-list { display: grid; gap: 0; margin: 0; }
    .detail-list div { display: flex; justify-content: space-between; gap: 16px; padding: 13px 0; border-bottom: 1px solid var(--color-border); }
    .detail-list div:last-child { border-bottom: 0; }
    .detail-list dt { color: var(--color-text-secondary); }
    .detail-list dd { margin: 0; text-align: right; font-weight: 700; }
    .empty-state { display: grid; gap: 8px; padding-block: 34px; }
    @media (min-width: 700px) { .months { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 370px) { .months { grid-template-columns: 1fr; } }
  `,
})
export class ProgressPage {
  private readonly api = inject(ProgressApiService);
  private readonly moneyEvents = inject(QuickCreateEventsService);
  private readonly routineEvents = inject(RoutineEventsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh = new Subject<void>();
  protected readonly filters = FILTERS;
  protected readonly activeFilter = signal<ProgressFilter>('general');
  protected readonly year = signal(new Date().getFullYear());
  protected readonly data = signal(emptyProgress(this.year(), this.activeFilter()));
  protected readonly loading = signal(true);
  protected readonly apiError = signal(false);
  protected readonly selectedDate = signal('');
  protected readonly detail = signal<ProgressDayDetail | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly detailError = signal(false);
  protected readonly months = computed(() => groupProgressDaysByMonth(this.data().items));
  protected readonly hasActivity = computed(() => this.data().items.some(({ level }) => level > 0));
  protected readonly activeFilterCopy = computed(() => FILTERS.find(({ id }) => id === this.activeFilter())!.copy);

  constructor() {
    merge(this.refresh.pipe(startWith(undefined)), this.moneyEvents.moneyChanged$, this.routineEvents.changed$).pipe(
      switchMap(() => defer(() => {
        this.loading.set(true); this.apiError.set(false);
        this.data.set(emptyProgress(this.year(), this.activeFilter()));
        return this.api.getHeatmap(this.activeFilter(), this.year()).pipe(
          catchError(() => { this.apiError.set(true); return of(emptyProgress(this.year(), this.activeFilter())); }),
          finalize(() => this.loading.set(false)),
        );
      })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((data) => this.data.set(data));
  }

  protected selectFilter(filter: ProgressFilter) { if (filter !== this.activeFilter()) { this.activeFilter.set(filter); this.refresh.next(); } }
  protected changeYear(offset: number) { this.year.update((year) => year + offset); this.refresh.next(); }
  protected reload() { this.refresh.next(); }
  protected heatmapClass(level: number) { return `heatmap-cell heatmap-cell--${level}`; }
  protected dayLabel(day: ProgressHeatmapDay) { return `${this.formatLongDate(day.date)}: puntaje ${day.value}, ${this.statusLabel(day.status)}`; }
  protected formatShortDate(date?: string | null) { return date ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(localDate(date)) : '—'; }
  protected formatLongDate(date: string) { return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(localDate(date)); }

  protected openDay(day: ProgressHeatmapDay) {
    this.selectedDate.set(day.date); this.detail.set(null); this.detailError.set(false); this.detailLoading.set(true);
    this.api.getDayDetail(day.date).pipe(finalize(() => this.detailLoading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (detail) => this.detail.set(detail),
      error: () => this.detailError.set(true),
    });
  }
  protected closeDay() { this.selectedDate.set(''); this.detail.set(null); }
  protected detailRows(day: ProgressDayDetail) {
    return ([['General', day.general], ['Dinero', day.money], ['Rutina', day.routine], ['Deuda', day.debt], ['Ahorro', day.saving], ['Proyectos', day.projects]] as const)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([label, value]) => ({ label, value: detailValue(value) }));
  }
  private statusLabel(status: ProgressHeatmapDay['status']) { return ({ empty: 'sin datos', low: 'bajo', ok: 'regular', good: 'bien', excellent: 'excelente' })[status]; }
}

function localDate(value: string) { return new Date(`${value.slice(0, 10)}T00:00:00`); }
function detailValue(value: unknown): string {
  if (typeof value === 'number') return `${value}%`;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.length ? `${value.length} registro${value.length === 1 ? '' : 's'}` : 'Sin registros';
  if (value && typeof value === 'object') {
    const data = value as Record<string, unknown>;
    if (typeof data['completed'] === 'number' && typeof data['total'] === 'number') return `${data['completed']}/${data['total']} completadas`;
    if (Array.isArray(data['payments'])) return `${data['payments'].length} pago${data['payments'].length === 1 ? '' : 's'}`;
    if (Array.isArray(data['movements'])) return `${data['movements'].length} movimiento${data['movements'].length === 1 ? '' : 's'}`;
    if (typeof data['value'] === 'number') return `${data['value']}%`;
    return 'Con actividad registrada';
  }
  return 'Sin registros';
}
