import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, Observable, of } from 'rxjs';
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
        <p class="page-copy">Marca lo que haces hoy y guarda tu historial.</p>
      </header>

      <a class="setup-link" routerLink="/routine/setup">Configurar rutina</a>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      } @else if (loading()) {
        <p class="empty">Cargando rutina de hoy…</p>
      } @else if (today(); as routine) {
        @if (routine.items.length) {
          <section class="surface-card routine-hero">
            <div class="routine-ring" [style.--progress]="routine.summary.completionPercent" aria-hidden="true">
              <strong>{{ routine.summary.completionPercent }}%</strong>
            </div>
            <div>
              <h2 class="section-card-title">Cumplimiento de hoy</h2>
              <p class="section-card-copy">{{ routine.summary.done }}/{{ routine.summary.total }} completadas</p>
              <p class="pending-copy">{{ routine.summary.pending }} pendientes</p>
              @if (summary(); as totals) { <p class="streak-copy">Racha: {{ totals.streak.current }} días</p> }
            </div>
          </section>

          <section class="surface-card activities">
            <div class="card-head"><h2 class="section-card-title">Actividades de hoy</h2><span class="card-meta">{{ formattedDate }}</span></div>
            <div class="list-card">
              @for (item of routine.items; track item.itemId) {
                <article class="routine-row">
                  <button class="routine-toggle" type="button" [class.done]="item.status === 'done'" [disabled]="savingId() === item.itemId" [attr.aria-pressed]="item.status === 'done'" [attr.aria-label]="(item.status === 'done' ? 'Desmarcar ' : 'Completar ') + item.title" (click)="toggle(item)">{{ item.status === 'done' ? '✓' : '' }}</button>
                  <div class="routine-copy">
                    <strong [class.completed]="item.status === 'done'">{{ item.title }}</strong>
                    <p>{{ item.routineName }} · {{ priorityLabel(item.priority) }}</p>
                  </div>
                  <div class="row-actions">
                    <span class="status-badge" [class.status-badge--green]="item.status === 'done'" [class.status-badge--orange]="item.status === 'pending'">{{ statusLabel(item.status) }}</span>
                    @if (item.status === 'pending') { <button class="skip" type="button" [disabled]="savingId() === item.itemId" (click)="setStatus(item, 'skipped')">Omitir</button> }
                  </div>
                </article>
              }
            </div>
          </section>

          @if (summary(); as totals) {
            <section class="surface-card weekly-card">
              <h2 class="section-card-title">Cumplimiento semanal</h2>
              <strong>{{ totals.week.completedDays }}/{{ totals.week.activeDays }} días · {{ totals.week.completionPercent }}%</strong>
              <div class="progress-track"><span class="progress-fill progress-fill--green" [style.width.%]="totals.week.completionPercent"></span></div>
            </section>
          }
        } @else {
          <section class="surface-card empty-card"><h2 class="section-card-title">No tienes rutina para hoy.</h2><a class="card-link" routerLink="/routine/setup">Crear rutina</a></section>
        }
      }
    </div>
  `,
  styles: `
    .setup-link { display: inline-flex; width: fit-content; padding: 10px 14px; border-radius: 12px; background: var(--color-purple); color: white; text-decoration: none; font-weight: 750; }
    .routine-hero { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 18px; background: radial-gradient(circle at top right, rgb(74 222 128 / .18), transparent 44%), linear-gradient(180deg, rgb(17 39 24 / .96), rgb(18 21 29)); border-color: rgb(74 222 128 / .18); }
    .routine-ring { --progress: 0; display: grid; place-items: center; width: 104px; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle at center, #13201a 59%, transparent 60%), conic-gradient(var(--color-green) calc(var(--progress) * 1%), #29243b 0); }
    .routine-ring strong { font-size: 1.8rem; letter-spacing: -.06em; }
    .pending-copy, .streak-copy { margin: 8px 0 0; color: var(--color-text-secondary); }
    .streak-copy { color: var(--color-orange); font-weight: 700; }
    .activities { padding-block: 18px; }
    .routine-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid rgb(255 255 255 / .06); }
    .routine-row:last-child { border-bottom: 0; }
    .routine-toggle { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid #384051; border-radius: 50%; background: transparent; color: #04120a; cursor: pointer; font-weight: 900; }
    .routine-toggle.done { border-color: var(--color-green); background: var(--color-green); }
    .routine-toggle:disabled, .skip:disabled { opacity: .5; }
    .routine-copy { min-width: 0; }
    .routine-copy strong.completed { color: var(--color-text-secondary); text-decoration: line-through; }
    .routine-copy p { margin: 4px 0 0; color: var(--color-text-secondary); font-size: .82rem; }
    .row-actions { display: grid; justify-items: end; gap: 6px; }
    .skip { border: 0; background: transparent; color: var(--color-text-secondary); cursor: pointer; font-size: .75rem; }
    .weekly-card, .empty-card { display: grid; gap: 12px; }
    .empty, .error { margin: 0; padding: 14px; border-radius: 14px; color: var(--color-text-secondary); background: rgb(255 255 255 / .04); }
    .error { color: var(--color-red); background: rgb(255 77 109 / .12); }
    @media (max-width: 380px) { .routine-hero { grid-template-columns: 1fr; } .routine-row { grid-template-columns: auto 1fr; } .row-actions { grid-column: 2; grid-template-columns: auto auto; align-items: center; } }
  `,
})
export class HabitsPage {
  private readonly api = inject(RoutinesApiService);
  private readonly events = inject(RoutineEventsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly today = signal<RoutineTodayResponse | null>(null);
  protected readonly summary = signal<RoutineSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly savingId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly formattedDate = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  constructor() {
    this.load();
    this.events.changed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  protected toggle(item: RoutineTodayItem) {
    if (item.status === 'done' && item.logId) this.save(item, this.api.deleteLog(item.logId));
    else this.setStatus(item, item.status === 'done' ? 'pending' : 'done');
  }

  protected setStatus(item: RoutineTodayItem, status: RoutineLogStatus) {
    this.save(item, this.api.upsertLog({ routineId: item.routineId, routineItemId: item.itemId, logDate: this.today()?.date ?? localDate(), status }));
  }

  protected priorityLabel(priority: RoutineTodayItem['priority']) { return ({ low: 'Baja', medium: 'Media', high: 'Alta', essential: 'Esencial' })[priority]; }
  protected statusLabel(status: RoutineLogStatus) { return ({ pending: 'Pendiente', done: 'Hecha', skipped: 'Omitida', missed: 'No realizada' })[status]; }

  private save(item: RoutineTodayItem, request: Observable<unknown>) {
    this.savingId.set(item.itemId); this.error.set('');
    request.pipe(finalize(() => this.savingId.set(null)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.events.notifyChanged(); },
      error: () => this.error.set('No se pudo actualizar la actividad. Intenta de nuevo.'),
    });
  }

  private load() {
    this.loading.set(true); this.error.set('');
    forkJoin({ today: this.api.getToday(), summary: this.api.getSummary().pipe(catchError(() => of(null))) })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: ({ today, summary }) => { this.today.set(today); this.summary.set(summary); }, error: () => { this.today.set(null); this.error.set('No pudimos cargar tu rutina. Intenta de nuevo.'); } });
  }
}

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
