import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ProjectTask, ProjectTaskPriority, ProjectTaskStatus } from '../../core/models/projects.model';
import { ProjectsApiService } from '../../core/services/projects-api.service';
import { QuickCreateEventsService } from '../../core/services/quick-create-events.service';
import { ActionModal } from '../../shared/components/action-modal/action-modal';

@Component({
  selector: 'app-project-task-form-modal',
  imports: [ActionModal, ReactiveFormsModule],
  template: `
    <app-action-modal [title]="task() ? 'Editar tarea' : 'Agregar tarea'" (close)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="save()">
        <label>Título <input formControlName="title" maxlength="120" /></label>
        <label>Descripción (opcional) <textarea formControlName="description" rows="3"></textarea></label>
        <div class="field-grid">
          <label>Prioridad <select formControlName="priority">@for (option of priorities; track option.value) { <option [value]="option.value">{{ option.label }}</option> }</select></label>
          <label>Estado <select formControlName="status">@for (option of statuses; track option.value) { <option [value]="option.value">{{ option.label }}</option> }</select></label>
          <label>Fecha límite (opcional) <input formControlName="dueDate" type="date" /></label>
          <label>Orden (opcional) <input formControlName="order" type="number" min="0" /></label>
          <label>Costo estimado (opcional) <input formControlName="estimatedCost" type="number" min="0" step="0.01" /></label>
          <label>Costo real (opcional) <input formControlName="actualCost" type="number" min="0" step="0.01" /></label>
        </div>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <div class="actions"><button class="secondary" type="button" (click)="close.emit()">Cancelar</button><button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Guardando…' : 'Guardar' }}</button></div>
      </form>
    </app-action-modal>
  `,
  styleUrl: './project-form.css',
})
export class ProjectTaskFormModal {
  readonly projectId = input.required<string>();
  readonly task = input<ProjectTask | null>(null);
  readonly close = output<void>();
  readonly saved = output<ProjectTask>();
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProjectsApiService);
  private readonly events = inject(QuickCreateEventsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly priorities: { value: ProjectTaskPriority; label: string }[] = [{ value: 'low', label: 'Baja' }, { value: 'medium', label: 'Media' }, { value: 'high', label: 'Alta' }, { value: 'urgent', label: 'Urgente' }];
  protected readonly statuses: { value: ProjectTaskStatus; label: string }[] = [{ value: 'pending', label: 'Pendiente' }, { value: 'in_progress', label: 'En progreso' }, { value: 'blocked', label: 'Bloqueada' }, { value: 'completed', label: 'Completada' }, { value: 'cancelled', label: 'Cancelada' }];
  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required], description: '',
    priority: this.fb.nonNullable.control<ProjectTaskPriority>('medium', Validators.required),
    status: this.fb.nonNullable.control<ProjectTaskStatus>('pending', Validators.required), dueDate: '',
    estimatedCost: this.fb.control<number | null>(null, Validators.min(0)), actualCost: this.fb.control<number | null>(null, Validators.min(0)), order: this.fb.control<number | null>(null, Validators.min(0)),
  });

  constructor() { effect(() => this.reset(this.task())); }

  protected save(): void {
    if (this.form.invalid || this.saving()) return;
    const value = this.form.getRawValue();
    const payload = { ...value, description: value.description || null, dueDate: value.dueDate || null };
    const request = this.task() ? this.api.updateProjectTask(this.task()!.id, payload) : this.api.createProjectTask(this.projectId(), payload);
    this.saving.set(true); this.error.set('');
    request.pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (task) => { this.events.notifyProjectChanged(); this.saved.emit(task); },
      error: () => this.error.set('No se pudo guardar la tarea. Intenta de nuevo.'),
    });
  }

  private reset(task: ProjectTask | null): void {
    this.error.set('');
    this.form.reset(task ? { title: task.title, description: task.description ?? '', priority: task.priority, status: task.status, dueDate: task.dueDate ?? '', estimatedCost: task.estimatedCost ?? null, actualCost: task.actualCost ?? null, order: task.order ?? null } : { title: '', description: '', priority: 'medium', status: 'pending', dueDate: '', estimatedCost: null, actualCost: null, order: null });
  }
}
