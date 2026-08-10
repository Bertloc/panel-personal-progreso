import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, Observable } from 'rxjs';
import { Project, ProjectPriority, ProjectStatus, ProjectTask, ProjectTaskStatus } from '../../core/models/projects.model';
import { ProjectsApiService } from '../../core/services/projects-api.service';
import { QuickCreateEventsService } from '../../core/services/quick-create-events.service';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { ProjectFormModal } from './project-form-modal';
import { ProjectTaskFormModal } from './project-task-form-modal';

@Component({
  selector: 'app-project-detail-page',
  imports: [AppCurrencyPipe, ProjectFormModal, ProjectTaskFormModal, RouterLink],
  template: `
    <div class="page-stack">
      <a class="back" routerLink="/projects">← Volver a proyectos</a>
      @if (loading()) { <section class="surface-card state">Cargando proyecto…</section> }
      @else if (error()) { <section class="surface-card state error" role="alert"><strong>No pudimos cargar el proyecto.</strong><button type="button" (click)="load()">Reintentar</button></section> }
      @else if (project(); as current) {
        <header class="page-header"><p class="page-eyebrow">Detalle del proyecto</p><h1 class="page-title">{{ current.name }}</h1><p class="page-copy">{{ current.description || 'Sin descripción.' }}</p></header>

        <section class="surface-card overview">
          <div class="badges"><span [class]="statusClass(current.status)">{{ statusLabel(current.status) }}</span><span [class]="priorityClass(current.priority)">{{ priorityLabel(current.priority) }}</span><span class="status-badge">{{ current.category || 'Sin categoría' }}</span></div>
          <div class="split-line"><span>Avance calculado</span><strong>{{ progress() }}%</strong></div>
          <div class="progress-track progress-track--large"><span class="progress-fill progress-fill--purple" [style.width.%]="progress()"></span></div>
          <p class="meta">{{ completedTasks() }}/{{ tasks().length }} tareas completadas</p>
          <div class="dates">@if (current.startDate) { <span>Inicio: {{ formatDate(current.startDate) }}</span> } @if (current.targetDate) { <span>Meta: {{ formatDate(current.targetDate) }}</span> }</div>
        </section>

        <section class="surface-card section-stack">
          <h2 class="section-card-title">Estado del proyecto</h2>
          <label>Actualizar estado <select [value]="current.status" [disabled]="saving()" (change)="changeProjectStatus($any($event.target).value)">@for (option of projectStatuses; track option.value) { <option [value]="option.value">{{ option.label }}</option> }</select></label>
        </section>

        <section class="section-stack">
          <div class="section-head"><h2 class="section-card-title">Tareas</h2><button type="button" (click)="openTask()">Agregar tarea</button></div>
          @for (task of tasks(); track task.id) {
            <article class="surface-card task" [class.done]="task.status === 'completed'">
              <div class="split-line"><strong>{{ task.title }}</strong><span [class]="priorityClass(task.priority)">{{ priorityLabel(task.priority) }}</span></div>
              @if (task.description) { <p>{{ task.description }}</p> }
              <div class="task-meta"><span>{{ taskStatusLabel(task.status) }}</span><span>{{ task.dueDate ? formatDate(task.dueDate) : 'Sin fecha límite' }}</span>@if (task.estimatedCost !== null && task.estimatedCost !== undefined) { <span>Estimado {{ task.estimatedCost | appCurrency }}</span> }@if (task.actualCost !== null && task.actualCost !== undefined) { <span>Real {{ task.actualCost | appCurrency }}</span> }</div>
              <label>Estado <select [disabled]="saving()" (change)="changeTaskStatus(task, $any($event.target).value)">@for (option of taskStatuses; track option.value) { <option [value]="option.value" [selected]="option.value === task.status">{{ option.label }}</option> }</select></label>
              <div class="actions"><button class="secondary" type="button" (click)="openTask(task)">Editar</button><button class="danger" type="button" (click)="removeTask(task)">Eliminar</button></div>
            </article>
          } @empty { <section class="surface-card state">Este proyecto aún no tiene tareas.</section> }
        </section>

        @if (current.consumesMoney) {
          <section class="surface-card section-stack"><h2 class="section-card-title">Presupuesto y costos</h2><div class="money-grid"><div><span>Presupuesto</span><strong>{{ current.budgetAmount ?? 0 | appCurrency }}</strong></div><div><span>Gastado</span><strong>{{ actualCost() | appCurrency }}</strong></div><div><span>Restante</span><strong>{{ (current.budgetAmount ?? 0) - actualCost() | appCurrency }}</strong></div></div></section>
        }

        <section class="surface-card section-stack"><h2 class="section-card-title">Acciones</h2><div class="actions project-actions"><button type="button" (click)="editProject.set(true)">Editar proyecto</button><button class="danger" type="button" (click)="archive(current)">Archivar proyecto</button></div></section>
      }
    </div>

    @if (editProject() && project(); as current) { <app-project-form-modal [project]="current" (close)="editProject.set(false)" (saved)="editProject.set(false)" /> }
    @if (taskEditor() && project(); as current) { <app-project-task-form-modal [projectId]="current.id" [task]="editingTask()" (close)="closeTask()" (saved)="closeTask()" /> }
  `,
  styleUrl: './project-detail-page.css',
})
export class ProjectDetailPage {
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  private readonly router = inject(Router);
  private readonly api = inject(ProjectsApiService);
  private readonly events = inject(QuickCreateEventsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly project = signal<Project | null>(null);
  protected readonly tasks = signal<ProjectTask[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal(false);
  protected readonly editProject = signal(false);
  protected readonly taskEditor = signal(false);
  protected readonly editingTask = signal<ProjectTask | null>(null);
  private loadVersion = 0;
  protected readonly completedTasks = computed(() => this.tasks().filter(({ status }) => status === 'completed').length);
  protected readonly progress = computed(() => this.tasks().length ? Math.round((this.completedTasks() / this.tasks().length) * 100) : Math.max(0, Math.min(100, Math.round(Number(this.project()?.progressPercent) || 0))));
  protected readonly actualCost = computed(() => this.project()?.actualCost ?? this.tasks().reduce((sum, task) => sum + (Number(task.actualCost) || 0), 0));
  protected readonly projectStatuses: { value: ProjectStatus; label: string }[] = [{ value: 'planned', label: 'Planeado' }, { value: 'active', label: 'Activo' }, { value: 'paused', label: 'En pausa' }, { value: 'completed', label: 'Completado' }, { value: 'cancelled', label: 'Cancelado' }, { value: 'archived', label: 'Archivado' }];
  protected readonly taskStatuses: { value: ProjectTaskStatus; label: string }[] = [{ value: 'pending', label: 'Pendiente' }, { value: 'in_progress', label: 'En progreso' }, { value: 'blocked', label: 'Bloqueada' }, { value: 'completed', label: 'Completada' }, { value: 'cancelled', label: 'Cancelada' }];

  constructor() { this.load(); this.events.projectChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load()); }

  protected load(): void {
    const version = ++this.loadVersion;
    this.loading.set(!this.project()); this.error.set(false);
    forkJoin({ project: this.api.getProject(this.id), tasks: this.api.getProjectTasks(this.id) }).pipe(finalize(() => { if (version === this.loadVersion) this.loading.set(false); }), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ project, tasks }) => { if (version === this.loadVersion) { this.project.set(project); this.tasks.set(tasks); } },
      error: () => { if (version === this.loadVersion && !this.project()) { this.tasks.set([]); this.error.set(true); } },
    });
  }
  protected openTask(task: ProjectTask | null = null): void { this.editingTask.set(task); this.taskEditor.set(true); }
  protected closeTask(): void { this.taskEditor.set(false); this.editingTask.set(null); }
  protected changeProjectStatus(status: ProjectStatus): void { this.run(this.api.updateProject(this.id, { status })); }
  protected changeTaskStatus(task: ProjectTask, status: ProjectTaskStatus): void { this.run(this.api.updateProjectTask(task.id, { status })); }
  protected removeTask(task: ProjectTask): void { if (!confirm(`¿Eliminar ${task.title}?`)) return; this.run(this.api.deleteProjectTask(task.id)); }
  protected archive(project: Project): void { if (!confirm(`¿Archivar ${project.name}?`)) return; this.saving.set(true); this.api.deleteProject(project.id).pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => void this.router.navigateByUrl('/projects').then(() => this.events.notifyProjectChanged()), error: () => this.error.set(true) }); }
  protected statusLabel(status: ProjectStatus): string { return this.projectStatuses.find(({ value }) => value === status)?.label ?? status; }
  protected taskStatusLabel(status: ProjectTaskStatus): string { return this.taskStatuses.find(({ value }) => value === status)?.label ?? status; }
  protected priorityLabel(priority: ProjectPriority): string { return ({ low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' })[priority]; }
  protected priorityClass(priority: ProjectPriority): string { return `status-badge status-badge--${priority === 'urgent' || priority === 'high' ? 'red' : priority === 'medium' ? 'orange' : 'green'}`; }
  protected statusClass(status: ProjectStatus): string { return `status-badge status-badge--${status === 'completed' ? 'green' : status === 'paused' ? 'orange' : status === 'cancelled' || status === 'archived' ? 'red' : 'purple'}`; }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`)); }

  private run(request: Observable<unknown>): void {
    this.saving.set(true); this.error.set(false);
    request.pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.events.notifyProjectChanged(), error: () => this.error.set(true) });
  }
}
