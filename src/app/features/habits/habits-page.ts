import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { RoutineLogStatus, RoutineSummary, RoutineTodayItem, RoutineTodayResponse } from '../../core/models/routine.model';
import { RoutineEventsService } from '../../core/services/routine-events.service';
import { RoutinesApiService } from '../../core/services/routines-api.service';

@Component({
  selector: 'app-habits-page',
  imports: [RouterLink],
  template: `
    <div class="page-stack">
      <header class="page-header">
        <p class="page-eyebrow">Tu día</p>
        <h1 class="page-title">Rutina</h1>
        <p class="page-copy">Completa lo que tienes programado para hoy.</p>
      </header>

      <a class="setup-link" routerLink="/routine/setup">Administrar rutina</a>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      } @else if (loading()) {
        <p class="empty">Cargando rutina de hoy…</p>
      } @else if (today(); as routine) {
        @if (routine.items.length) {
          <section class="surface-card routine-hero">
            <div class="split-line">
              <div>
                <p class="card-label">Progreso de hoy</p>
                <h2 class="today-title">Hoy tienes {{ routine.summary.total }} {{ routine.summary.total === 1 ? 'actividad' : 'actividades' }}</h2>
              </div>
              @if (summary(); as totals) { <span class="streak-badge">♨ Racha {{ totals.streak.current }} días</span> }
            </div>
            <div class="progress-summary">
              <strong class="routine-percent">{{ roundedPercent(routine.summary.completionPercent) }}%</strong>
              <p class="section-card-copy">{{ routine.summary.done }} de {{ routine.summary.total }} completadas</p>
            </div>
            <div class="progress-track"><span class="progress-fill progress-fill--green" [style.width.%]="progressWidth(routine.summary.completionPercent)"></span></div>
          </section>

          <section class="surface-card activities">
            <div class="card-head"><h2 class="section-card-title">Actividades de hoy</h2><span class="card-meta">{{ formattedDate }}</span></div>
            <div class="list-card">
              @for (item of routine.items; track item.itemId) {
                <article class="routine-row">
                  <div class="routine-copy">
                    <strong [class.completed]="item.status === 'done'">{{ item.title }}</strong>
                    <p>{{ priorityLabel(item.priority) }} · {{ item.isRequired ? 'Requerida' : 'Opcional' }} · {{ item.routineName }}</p>
                  </div>
                  <div class="row-actions">
                    <span class="status-badge" [class.status-badge--green]="item.status === 'done'" [class.status-badge--orange]="item.status === 'skipped'" [class.status-badge--red]="item.status === 'missed'">{{ statusLabel(item.status) }}</span>
                    @if (item.status === 'pending') {
                      <button class="complete-action" type="button" [disabled]="savingId() !== null" (click)="setStatus(item, 'done')">Completar</button>
                      <button class="skip" type="button" [disabled]="savingId() !== null" (click)="setStatus(item, 'skipped')">Omitir</button>
                    } @else if ((item.status === 'done' || item.status === 'skipped') && item.logId) {
                      <button class="undo" type="button" [disabled]="savingId() !== null" (click)="undo(item)">Deshacer</button>
                    }
                  </div>
                </article>
              }
            </div>
          </section>
        } @else if (hasConfiguredRoutine() === false) {
          <section class="surface-card empty-card">
            <h2 class="section-card-title">Aún no has creado una rutina.</h2>
            <p class="section-card-copy">Crea una rutina y agrega las actividades que quieres seguir.</p>
            <a class="card-link" routerLink="/routine/setup">Crear rutina</a>
          </section>
        } @else {
          <section class="surface-card empty-card">
            <h2 class="section-card-title">No tienes actividades programadas para hoy.</h2>
            <p class="section-card-copy">Puedes revisar los días y actividades de tus rutinas.</p>
            <a class="card-link" routerLink="/routine/setup">Administrar rutina</a>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .setup-link { justify-self: end; margin-top: -8px; color: var(--color-text-secondary); text-decoration: none; font-size: .82rem; }
    .routine-hero { display: grid; gap: 14px; background: radial-gradient(circle at top right, rgb(40 215 154 / .14), transparent 44%), var(--color-card); border-color: rgb(40 215 154 / .26); }
    .today-title { margin: 5px 0 0; font-size: 1.2rem; }
    .progress-summary { display: flex; align-items: end; gap: 14px; }
    .progress-summary p { margin-bottom: 5px; }
    .routine-percent { color: var(--color-green); font-size: 3.35rem; line-height: .95; letter-spacing: -.07em; }
    .streak-badge { padding: 6px 10px; border-radius: 999px; background: rgb(255 159 67 / .15); color: var(--color-orange); font-size: .72rem; font-weight: 750; }
    .activities { padding: 0; border: 0; background: transparent; box-shadow: none; }
    .activities .card-head { padding-inline: 2px; }
    .list-card { gap: 12px; }
    .routine-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 18px 16px; border: 1px solid var(--color-border); border-radius: 22px; background: var(--color-card); }
    .routine-copy { min-width: 0; }
    .routine-copy strong.completed { color: var(--color-text-secondary); text-decoration: line-through; }
    .routine-copy p { margin: 5px 0 0; color: var(--color-text-secondary); font-size: .78rem; }
    .row-actions { display: flex; align-items: center; justify-content: end; gap: 8px; }
    .complete-action { border: 0; border-radius: 999px; padding: 8px 12px; background: var(--color-green); color: #04120a; cursor: pointer; font-weight: 800; }
    .skip, .undo { border: 0; background: transparent; color: var(--color-text-secondary); cursor: pointer; font-size: .75rem; }
    .complete-action:disabled, .skip:disabled, .undo:disabled { cursor: wait; opacity: .5; }
    .empty-card { display: grid; justify-items: start; gap: 10px; }
    .empty, .error { margin: 0; padding: 14px; border-radius: 14px; color: var(--color-text-secondary); background: rgb(255 255 255 / .04); }
    .error { color: var(--color-red); background: rgb(255 77 109 / .12); }
    @media (max-width: 520px) {
      .routine-row { grid-template-columns: 1fr; }
      .row-actions { justify-content: start; flex-wrap: wrap; }
      .split-line { align-items: start; }
    }
  `,
})
export class HabitsPage {
  private readonly api = inject(RoutinesApiService);
  private readonly events = inject(RoutineEventsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly today = signal<RoutineTodayResponse | null>(null);
  protected readonly summary = signal<RoutineSummary | null>(null);
  protected readonly hasConfiguredRoutine = signal<boolean | null>(null);
  protected readonly loading = signal(true);
  protected readonly savingId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly formattedDate = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  constructor() { this.load(); }

  protected undo(item: RoutineTodayItem) {
    if (item.logId) this.save(item, this.api.deleteLog(item.logId));
  }

  protected setStatus(item: RoutineTodayItem, status: RoutineLogStatus) {
    this.save(item, this.api.upsertLog({ routineId: item.routineId, routineItemId: item.itemId, logDate: this.today()?.date ?? localDate(), status }));
  }

  protected roundedPercent(value: number) { return Math.round(value); }
  protected progressWidth(value: number) { return Math.min(100, Math.max(0, value)); }
  protected priorityLabel(priority: RoutineTodayItem['priority']) { return ({ low: 'Baja', medium: 'Media', high: 'Alta', essential: 'Esencial' })[priority]; }
  protected statusLabel(status: RoutineLogStatus) { return ({ pending: 'Pendiente', done: 'Completada', skipped: 'Omitida', missed: 'No realizada' })[status]; }

  private save(item: RoutineTodayItem, request: Observable<unknown>) {
    this.savingId.set(item.itemId); this.error.set('');
    request.pipe(finalize(() => this.savingId.set(null)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.load(); this.events.notifyChanged(); },
      error: () => this.error.set('No se pudo actualizar la actividad. Intenta de nuevo.'),
    });
  }

  private load() {
    this.loading.set(true); this.error.set(''); this.hasConfiguredRoutine.set(null);
    forkJoin({ today: this.api.getToday(), summary: this.api.getSummary().pipe(catchError(() => of(null))) }).pipe(
      switchMap((result) => result.today.items.length
        ? of({ ...result, hasConfiguredRoutine: true })
        : this.api.getRoutines().pipe(
            map((routines) => ({ ...result, hasConfiguredRoutine: routines.some(({ status }) => status !== 'archived') })),
            catchError(() => of({ ...result, hasConfiguredRoutine: null })),
          )),
      finalize(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ today, summary, hasConfiguredRoutine }) => { this.today.set(today); this.summary.set(summary); this.hasConfiguredRoutine.set(hasConfiguredRoutine); },
      error: () => { this.today.set(null); this.error.set('No pudimos cargar tu rutina. Intenta de nuevo.'); },
    });
  }
}

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
