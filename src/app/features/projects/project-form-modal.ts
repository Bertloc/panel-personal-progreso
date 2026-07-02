import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Project, ProjectPriority, ProjectStatus } from '../../core/models/projects.model';
import { ProjectsApiService } from '../../core/services/projects-api.service';
import { QuickCreateEventsService } from '../../core/services/quick-create-events.service';
import { ActionModal } from '../../shared/components/action-modal/action-modal';

@Component({
  selector: 'app-project-form-modal',
  imports: [ActionModal, ReactiveFormsModule],
  template: `
    <app-action-modal [title]="project() ? 'Editar proyecto' : 'Crear proyecto'" (close)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="save()">
        <label>Nombre <input formControlName="name" maxlength="100" /></label>
        <label>Descripción (opcional) <textarea formControlName="description" rows="3"></textarea></label>
        <div class="field-grid">
          <label>Categoría <select formControlName="category">@for (option of categories; track option.value) { <option [value]="option.value">{{ option.label }}</option> }</select></label>
          <label>Prioridad <select formControlName="priority">@for (option of priorities; track option.value) { <option [value]="option.value">{{ option.label }}</option> }</select></label>
          <label>Estado <select formControlName="status">@for (option of statuses; track option.value) { <option [value]="option.value">{{ option.label }}</option> }</select></label>
          <label>Inicio (opcional) <input formControlName="startDate" type="date" /></label>
          <label>Meta (opcional) <input formControlName="targetDate" type="date" /></label>
        </div>
        <label class="check"><input formControlName="consumesMoney" type="checkbox" /> Este proyecto consume dinero</label>
        @if (form.controls.consumesMoney.value) { <label>Presupuesto <input formControlName="budgetAmount" type="number" min="0" step="0.01" /></label> }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <div class="actions"><button class="secondary" type="button" (click)="close.emit()">Cancelar</button><button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Guardando…' : 'Guardar' }}</button></div>
      </form>
    </app-action-modal>
  `,
  styleUrl: './project-form.css',
})
export class ProjectFormModal {
  readonly project = input<Project | null>(null);
  readonly close = output<void>();
  readonly saved = output<Project>();
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProjectsApiService);
  private readonly events = inject(QuickCreateEventsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly categories = [{ value: 'personal', label: 'Personal' }, { value: 'school', label: 'Escuela' }, { value: 'work', label: 'Trabajo' }, { value: 'finance', label: 'Finanzas' }, { value: 'health', label: 'Salud' }, { value: 'learning', label: 'Aprendizaje' }, { value: 'other', label: 'Otro' }];
  protected readonly priorities: { value: ProjectPriority; label: string }[] = [{ value: 'low', label: 'Baja' }, { value: 'medium', label: 'Media' }, { value: 'high', label: 'Alta' }, { value: 'urgent', label: 'Urgente' }];
  protected readonly statuses: { value: ProjectStatus; label: string }[] = [{ value: 'planned', label: 'Planeado' }, { value: 'active', label: 'Activo' }, { value: 'paused', label: 'En pausa' }, { value: 'completed', label: 'Completado' }, { value: 'cancelled', label: 'Cancelado' }, { value: 'archived', label: 'Archivado' }];
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required], description: '', category: 'personal',
    priority: this.fb.nonNullable.control<ProjectPriority>('medium', Validators.required),
    status: this.fb.nonNullable.control<ProjectStatus>('planned', Validators.required),
    startDate: '', targetDate: '', consumesMoney: false,
    budgetAmount: this.fb.control<number | null>(null, Validators.min(0)),
  });

  constructor() { effect(() => this.reset(this.project())); }

  protected save(): void {
    if (this.form.invalid || this.saving()) return;
    const value = this.form.getRawValue();
    const payload = { ...value, description: value.description || null, category: value.category || null, startDate: value.startDate || null, targetDate: value.targetDate || null, budgetAmount: value.consumesMoney ? value.budgetAmount : null };
    const request = this.project() ? this.api.updateProject(this.project()!.id, payload) : this.api.createProject(payload);
    this.saving.set(true); this.error.set('');
    request.pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (project) => { this.events.notifyProjectChanged(); this.saved.emit(project); },
      error: () => this.error.set('No se pudo guardar el proyecto. Intenta de nuevo.'),
    });
  }

  private reset(project: Project | null): void {
    this.error.set('');
    this.form.reset(project ? { name: project.name, description: project.description ?? '', category: project.category ?? 'other', priority: project.priority, status: project.status, startDate: project.startDate ?? '', targetDate: project.targetDate ?? '', consumesMoney: project.consumesMoney, budgetAmount: project.budgetAmount ?? null } : { name: '', description: '', category: 'personal', priority: 'medium', status: 'planned', startDate: '', targetDate: '', consumesMoney: false, budgetAmount: null });
  }
}
