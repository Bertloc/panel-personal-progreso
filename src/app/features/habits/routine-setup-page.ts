import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { Routine, RoutineItem, RoutinePriority, RoutineStatus } from '../../core/models/routine.model';
import { RoutineEventsService } from '../../core/services/routine-events.service';
import { RoutinesApiService } from '../../core/services/routines-api.service';

const EMPTY_ROUTINE = { name: '', description: '', status: 'active' as RoutineStatus, priority: 'medium' as RoutinePriority, daysOfWeek: [] as number[] };
const EMPTY_ITEM = { title: '', description: '', priority: 'medium' as RoutinePriority, isRequired: true, order: null as number | null, daysOfWeek: [] as number[] };

@Component({
  selector: 'app-routine-setup-page',
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-stack">
      <header class="page-header">
        <p class="page-eyebrow">Tu configuración</p>
        <h1 class="page-title">Configurar rutina</h1>
        <p class="page-copy">Define tus días y las actividades que quieres completar.</p>
      </header>

      <section class="surface-card section-stack">
        <div><h2 class="section-card-title">{{ editingRoutineId() ? 'Editar rutina' : 'Nueva rutina' }}</h2><p class="meta">Elige al menos un día para programarla.</p></div>
        <form [formGroup]="routineForm" (ngSubmit)="saveRoutine()">
          <label>Nombre <input formControlName="name" maxlength="80" /></label>
          <label>Descripción (opcional) <textarea formControlName="description" rows="2"></textarea></label>
          <div class="field-grid"><label>Prioridad <select formControlName="priority">@for (option of priorities; track option.value) { <option [value]="option.value">{{ option.label }}</option> }</select></label><label>Estado <select formControlName="status"><option value="active">Activa</option><option value="paused">En pausa</option><option value="archived">Archivada</option></select></label></div>
          <fieldset><legend>Días de la rutina</legend><div class="days">@for (day of days; track day.value) { <button type="button" [class.active]="routineForm.controls.daysOfWeek.value.includes(day.value)" (click)="toggleDay(routineForm.controls.daysOfWeek, day.value)">{{ day.label }}</button> }</div></fieldset>
          <div class="actions">@if (editingRoutineId()) { <button class="secondary" type="button" (click)="resetRoutine()">Cancelar</button> }<button type="submit" [disabled]="routineForm.invalid || saving()">{{ saving() ? 'Guardando…' : editingRoutineId() ? 'Actualizar' : 'Crear rutina' }}</button></div>
        </form>
      </section>

      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (loading()) { <p class="empty">Cargando rutinas…</p> } @else if (!error()) {
        <section class="section-stack">
          <h2 class="section-card-title">Tus rutinas</h2>
          <div class="items">
            @for (routine of routines(); track routine.id) {
              <article class="surface-card routine-card" [class.selected]="selectedRoutine()?.id === routine.id">
                <div class="item-head"><div><strong>{{ routine.name }}</strong><p class="meta">{{ priorityLabel(routine.priority) }} · {{ routine.itemsCount ?? '—' }} actividades</p></div><span class="status-badge">{{ statusLabel(routine.status) }}</span></div>
                <div class="days compact">@for (day of days; track day.value) { @if (routine.daysOfWeek?.includes(day.value)) { <span>{{ day.label }}</span> } }</div>
                <div class="actions"><button class="secondary" type="button" (click)="editRoutine(routine)">Editar</button><button type="button" (click)="manage(routine)">Actividades</button><button class="danger" type="button" (click)="removeRoutine(routine)">Archivar</button></div>
              </article>
            } @empty { <p class="empty">Aún no tienes rutinas configuradas.</p> }
          </div>
        </section>
      }

      @if (selectedRoutine(); as routine) {
        <section class="surface-card section-stack">
          <div><h2 class="section-card-title">Actividades · {{ routine.name }}</h2><p class="meta">Los días vacíos heredan el horario de la rutina.</p></div>
          <form [formGroup]="itemForm" (ngSubmit)="saveItem()">
            <label>Título <input formControlName="title" maxlength="100" /></label>
            <label>Descripción (opcional) <textarea formControlName="description" rows="2"></textarea></label>
            <div class="field-grid"><label>Prioridad <select formControlName="priority">@for (option of priorities; track option.value) { <option [value]="option.value">{{ option.label }}</option> }</select></label><label>Orden (opcional) <input formControlName="order" type="number" min="0" /></label></div>
            <label class="check"><input formControlName="isRequired" type="checkbox" /> Actividad requerida</label>
            <fieldset><legend>Días específicos (opcional)</legend><div class="days">@for (day of days; track day.value) { <button type="button" [class.active]="itemForm.controls.daysOfWeek.value.includes(day.value)" (click)="toggleDay(itemForm.controls.daysOfWeek, day.value)">{{ day.label }}</button> }</div></fieldset>
            <div class="actions">@if (editingItemId()) { <button class="secondary" type="button" (click)="resetItem()">Cancelar</button> }<button type="submit" [disabled]="itemForm.invalid || saving()">{{ editingItemId() ? 'Actualizar actividad' : 'Agregar actividad' }}</button></div>
          </form>

          @if (loadingItems()) { <p class="empty">Cargando actividades…</p> } @else {
            <div class="items">@for (item of items(); track item.id) { <article class="item"><div class="item-head"><div><strong>{{ item.title }}</strong><p class="meta">{{ priorityLabel(item.priority) }} · {{ item.isRequired ? 'requerida' : 'opcional' }}</p></div><span class="status-badge">{{ item.isActive === false ? 'Inactiva' : 'Activa' }}</span></div><div class="actions"><button class="secondary" type="button" (click)="editItem(item)">Editar</button><button class="danger" type="button" (click)="removeItem(item)">Eliminar</button></div></article> } @empty { <p class="empty">Esta rutina aún no tiene actividades.</p> }</div>
          }
        </section>
      }
    </div>
  `,
  styleUrl: './routine-setup-page.css',
})
export class RoutineSetupPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(RoutinesApiService);
  private readonly events = inject(RoutineEventsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly routines = signal<Routine[]>([]);
  protected readonly selectedRoutine = signal<Routine | null>(null);
  protected readonly items = signal<RoutineItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingItems = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly editingRoutineId = signal<string | null>(null);
  protected readonly editingItemId = signal<string | null>(null);
  protected readonly days = [{ value: 0, label: 'D' }, { value: 1, label: 'L' }, { value: 2, label: 'M' }, { value: 3, label: 'X' }, { value: 4, label: 'J' }, { value: 5, label: 'V' }, { value: 6, label: 'S' }];
  protected readonly priorities: { value: RoutinePriority; label: string }[] = [{ value: 'low', label: 'Baja' }, { value: 'medium', label: 'Media' }, { value: 'high', label: 'Alta' }, { value: 'essential', label: 'Esencial' }];
  protected readonly routineForm = this.fb.nonNullable.group({ name: ['', Validators.required], description: '', status: this.fb.nonNullable.control<RoutineStatus>('active'), priority: this.fb.nonNullable.control<RoutinePriority>('medium'), daysOfWeek: this.fb.nonNullable.control<number[]>([], Validators.required) });
  protected readonly itemForm = this.fb.nonNullable.group({ title: ['', Validators.required], description: '', priority: this.fb.nonNullable.control<RoutinePriority>('medium'), isRequired: true, order: this.fb.control<number | null>(null), daysOfWeek: this.fb.nonNullable.control<number[]>([]) });

  constructor() { this.loadRoutines(); }

  protected toggleDay(control: typeof this.routineForm.controls.daysOfWeek, day: number) { control.setValue(control.value.includes(day) ? control.value.filter((value) => value !== day) : [...control.value, day].sort()); control.markAsTouched(); }
  protected priorityLabel(priority?: RoutinePriority | null) { return this.priorities.find(({ value }) => value === priority)?.label ?? 'Sin prioridad'; }
  protected statusLabel(status: RoutineStatus) { return ({ active: 'Activa', paused: 'En pausa', archived: 'Archivada' })[status]; }

  protected saveRoutine() {
    if (this.routineForm.invalid || this.saving()) return;
    const value = this.routineForm.getRawValue(); const id = this.editingRoutineId();
    this.run(id ? this.api.updateRoutine(id, { ...value, description: value.description || null }) : this.api.createRoutine({ ...value, description: value.description || null }), () => { this.resetRoutine(); this.loadRoutines(); });
  }

  protected editRoutine(routine: Routine) {
    this.api.getRoutine(routine.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (detail) => { this.editingRoutineId.set(detail.id); this.routineForm.reset({ name: detail.name, description: detail.description ?? '', status: detail.status, priority: detail.priority ?? 'medium', daysOfWeek: detail.daysOfWeek ?? detail.schedules?.filter(({ isActive }) => isActive !== false).map(({ dayOfWeek }) => dayOfWeek) ?? [] }); this.manage(detail); },
      error: () => this.error.set('No pudimos cargar la rutina.'),
    });
  }
  protected resetRoutine() { this.editingRoutineId.set(null); this.routineForm.reset(EMPTY_ROUTINE); }
  protected removeRoutine(routine: Routine) { if (!confirm(`¿Archivar ${routine.name}?`)) return; this.run(this.api.deleteRoutine(routine.id), () => { if (this.selectedRoutine()?.id === routine.id) { this.selectedRoutine.set(null); this.items.set([]); } this.loadRoutines(); }); }

  protected manage(routine: Routine) { this.selectedRoutine.set(routine); this.resetItem(); this.loadItems(routine.id); }
  protected saveItem() {
    const routine = this.selectedRoutine(); if (!routine || this.itemForm.invalid || this.saving()) return;
    const value = this.itemForm.getRawValue(); const id = this.editingItemId();
    const payload = { ...value, description: value.description || null, order: value.order ?? null };
    this.run(id ? this.api.updateRoutineItem(id, payload) : this.api.createRoutineItem(routine.id, payload), () => { this.resetItem(); this.loadItems(routine.id); this.loadRoutines(); });
  }
  protected editItem(item: RoutineItem) { this.editingItemId.set(item.id); this.itemForm.reset({ title: item.title, description: item.description ?? '', priority: item.priority, isRequired: item.isRequired, order: item.order ?? null, daysOfWeek: item.daysOfWeek ?? item.schedules?.filter(({ isActive }) => isActive !== false).map(({ dayOfWeek }) => dayOfWeek) ?? [] }); }
  protected resetItem() { this.editingItemId.set(null); this.itemForm.reset(EMPTY_ITEM); }
  protected removeItem(item: RoutineItem) { if (!confirm(`¿Eliminar ${item.title}?`)) return; this.run(this.api.deleteRoutineItem(item.id), () => { this.loadItems(item.routineId); this.loadRoutines(); }); }

  private run(request: Observable<unknown>, done: () => void) {
    this.saving.set(true); this.error.set('');
    request.pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.events.notifyChanged(); done(); }, error: () => this.error.set('No se pudo guardar el cambio. Intenta de nuevo.') });
  }
  private loadRoutines() { this.loading.set(true); this.error.set(''); this.api.getRoutines().pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({ next: (routines) => this.routines.set(routines), error: () => this.error.set('No pudimos cargar tus rutinas.') }); }
  private loadItems(routineId: string) { this.loadingItems.set(true); this.api.getRoutineItems(routineId).pipe(finalize(() => this.loadingItems.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({ next: (items) => this.items.set(items), error: () => this.error.set('No pudimos cargar las actividades.') }); }
}
