import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { Project, ProjectPriority, ProjectsSummary, ProjectStatus, ProjectTask } from '../../core/models/projects.model';
import { ProjectsApiService } from '../../core/services/projects-api.service';
import { QuickCreateEventsService } from '../../core/services/quick-create-events.service';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { ProjectFormModal } from './project-form-modal';

@Component({
  selector: 'app-projects-page',
  imports: [AppCurrencyPipe, ProjectFormModal, RouterLink],
  template: `
    <div class="page-stack">
      <header class="page-header">
        <p class="page-eyebrow">Tus proyectos</p>
        <h1 class="page-title">Proyectos</h1>
        <p class="page-copy">Organiza proyectos, tareas, prioridades y avance real.</p>
        <button class="primary" type="button" (click)="openCreate()">Crear proyecto</button>
      </header>

      @if (loading()) { <section class="surface-card state">Cargando proyectos…</section> }
      @else if (error()) {
        <section class="surface-card state error" role="alert"><strong>No pudimos cargar tus proyectos.</strong><span>No se mostraron datos de ejemplo.</span><button type="button" (click)="load()">Reintentar</button></section>
      } @else {
        @if (summaryError()) { <p class="warning" role="status">El resumen del servidor no respondió; mostramos el cálculo disponible de tus proyectos.</p> }
        <section class="summary-grid">
          <article class="surface-card summary"><span>Activos</span><strong>{{ summary()?.active ?? 0 }}</strong></article>
          <article class="surface-card summary"><span>Cerca de terminar</span><strong>{{ summary()?.nearCompletion ?? 0 }}</strong></article>
          <article class="surface-card summary"><span>Pausados</span><strong>{{ summary()?.paused ?? 0 }}</strong></article>
          <article class="surface-card summary"><span>Completados</span><strong>{{ summary()?.completed ?? 0 }}</strong></article>
        </section>

        @if (summary()?.budget; as budget) {
          <section class="surface-card budget"><div class="split-line"><div><p class="card-label">Presupuesto de proyectos</p><strong>{{ budget.spent | appCurrency }} gastado</strong></div><span>{{ budget.remaining | appCurrency }} disponible</span></div><p class="card-meta">Planeado: {{ budget.planned | appCurrency }}</p><div class="progress-track"><span class="progress-fill progress-fill--purple" [style.width.%]="budget.planned ? (budget.spent / budget.planned) * 100 : 0"></span></div></section>
        }

        @if (featured(); as project) {
          <section class="surface-card featured">
            <div class="split-line"><span [class]="statusClass(project.status)">{{ statusLabel(project.status) }}</span><span [class]="priorityClass(project.priority)">{{ priorityLabel(project.priority) }}</span></div>
            <h2>{{ project.name }}</h2>
            <p class="card-meta">{{ project.nextTask?.title || 'Sin tareas próximas' }}@if (project.targetDate) { · Meta {{ formatDate(project.targetDate) }} }</p>
            <div class="split-line progress-copy"><span>Avance</span><strong>{{ progress(project) }}%</strong></div>
            <div class="progress-track"><span class="progress-fill progress-fill--purple" [style.width.%]="progress(project)"></span></div>
            <a class="primary link" [routerLink]="['/projects', project.id]">Ver detalle</a>
          </section>
        }

        @if (!visibleProjects().length) {
          <section class="surface-card state"><strong>Aún no tienes proyectos.</strong><button type="button" (click)="openCreate()">Crear proyecto</button></section>
        } @else {
          <section class="section-stack">
            <h2 class="section-title">Tus proyectos</h2>
            @for (project of visibleProjects(); track project.id) {
              <article class="surface-card project-card">
                <div class="split-line"><div><strong>{{ project.name }}</strong><p class="card-meta">{{ categoryLabel(project.category) }}</p></div><span [class]="statusClass(project.status)">{{ statusLabel(project.status) }}</span></div>
                <div class="meta-row"><span [class]="priorityClass(project.priority)">{{ priorityLabel(project.priority) }}</span><span>{{ project.completedTasks ?? 0 }}/{{ project.tasksCount ?? 0 }} tareas</span>@if (project.targetDate) { <span>Meta {{ formatDate(project.targetDate) }}</span> }</div>
                <div class="split-line progress-copy"><span>Avance</span><strong>{{ progress(project) }}%</strong></div>
                <div class="progress-track"><span class="progress-fill" [style.width.%]="progress(project)"></span></div>
                @if (project.consumesMoney) { <p class="card-meta">Costo: {{ project.actualCost ?? 0 | appCurrency }} de {{ project.budgetAmount ?? 0 | appCurrency }}</p> }
                <div class="actions"><a class="primary link" [routerLink]="['/projects', project.id]">Abrir</a><button class="secondary" type="button" (click)="openEdit(project)">Editar</button><button class="danger" type="button" (click)="archive(project)">Archivar</button></div>
              </article>
            }
          </section>
        }

        @if (upcomingTasks().length) {
          <section class="surface-card section-stack"><h2 class="section-card-title">☷ &nbsp;Tareas próximas</h2>
            @for (task of upcomingTasks(); track task.id) { <article class="task"><div><strong>{{ task.title }}</strong><p class="card-meta">Proyecto: {{ task.projectName || projectName(task.projectId) }}</p></div><div class="meta-row"><span [class]="priorityClass(task.priority)">{{ priorityLabel(task.priority) }}</span><span>{{ task.dueDate ? formatDate(task.dueDate) : 'Sin fecha' }}</span><span>{{ taskStatusLabel(task.status) }}</span></div></article> }
          </section>
        }
      }
    </div>

    @if (editorOpen()) { <app-project-form-modal [project]="editing()" (close)="closeEditor()" (saved)="closeEditor()" /> }
  `,
  styleUrl: './projects-page.css',
})
export class ProjectsPage {
  private readonly api = inject(ProjectsApiService);
  private readonly events = inject(QuickCreateEventsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly projects = signal<Project[]>([]);
  protected readonly summary = signal<ProjectsSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly summaryError = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly editing = signal<Project | null>(null);
  protected readonly visibleProjects = computed(() => this.projects().filter(({ status }) => status !== 'archived'));
  protected readonly featured = computed(() => {
    const summaryProject = this.summary()?.highestProgressProject;
    return summaryProject && summaryProject.status !== 'archived' ? summaryProject : [...this.visibleProjects()].filter(({ status }) => status === 'active').sort((a, b) => progressOf(b) - progressOf(a))[0] ?? null;
  });
  protected readonly upcomingTasks = computed(() => (this.summary()?.upcomingTasks ?? []).map((task) => ({ ...task, projectName: task.projectName || this.projectName(task.projectId) })));

  constructor() { this.load(); this.events.projectChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load()); }

  protected load(): void {
    this.loading.set(true); this.error.set(false); this.summaryError.set(false); this.projects.set([]); this.summary.set(null);
    this.api.getProjects().pipe(
      switchMap((projects) => this.api.getSummary().pipe(
        catchError(() => { this.summaryError.set(true); return of(summaryFrom(projects)); }),
        map((summary) => ({ projects, summary })),
      )), finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef),
    ).subscribe({ next: ({ projects, summary }) => { this.projects.set(projects); this.summary.set(summary); }, error: () => { this.projects.set([]); this.summary.set(null); this.error.set(true); } });
  }

  protected openCreate(): void { this.editing.set(null); this.editorOpen.set(true); }
  protected openEdit(project: Project): void { this.editing.set(project); this.editorOpen.set(true); }
  protected closeEditor(): void { this.editorOpen.set(false); this.editing.set(null); }
  protected archive(project: Project): void { if (!confirm(`¿Archivar ${project.name}?`)) return; this.api.deleteProject(project.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.events.notifyProjectChanged(), error: () => this.error.set(true) }); }
  protected progress(project: Project): number { return progressOf(project); }
  protected projectName(id: string): string { return this.projects().find((project) => project.id === id)?.name ?? 'Proyecto'; }
  protected statusLabel(status: ProjectStatus): string { return ({ planned: 'Planeado', active: 'Activo', paused: 'En pausa', completed: 'Completado', cancelled: 'Cancelado', archived: 'Archivado' })[status]; }
  protected taskStatusLabel(status: ProjectTask['status']): string { return ({ pending: 'Pendiente', in_progress: 'En progreso', blocked: 'Bloqueada', completed: 'Completada', cancelled: 'Cancelada' })[status]; }
  protected priorityLabel(priority: ProjectPriority): string { return ({ low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' })[priority]; }
  protected priorityClass(priority: ProjectPriority): string { return `status-badge status-badge--${priority === 'urgent' || priority === 'high' ? 'red' : priority === 'medium' ? 'orange' : 'green'}`; }
  protected statusClass(status: ProjectStatus): string { return `status-badge status-badge--${status === 'completed' ? 'green' : status === 'paused' ? 'orange' : status === 'cancelled' || status === 'archived' ? 'red' : 'purple'}`; }
  protected categoryLabel(category?: string | null): string { return ({ personal: 'Personal', school: 'Escuela', work: 'Trabajo', finance: 'Finanzas', health: 'Salud', learning: 'Aprendizaje', other: 'Otro' } as Record<string, string>)[category ?? ''] ?? category ?? 'Sin categoría'; }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`)); }
}

function progressOf(project: Project): number {
  if (project.progressPercent !== undefined) return Math.max(0, Math.min(100, Math.round(Number(project.progressPercent) || 0)));
  return project.tasksCount ? Math.round(((project.completedTasks ?? 0) / project.tasksCount) * 100) : 0;
}

function summaryFrom(projects: Project[]): ProjectsSummary {
  const count = (status: ProjectStatus) => projects.filter((project) => project.status === status).length;
  const planned = projects.filter(({ consumesMoney }) => consumesMoney).reduce((sum, project) => sum + (Number(project.budgetAmount) || 0), 0);
  const spent = projects.filter(({ consumesMoney }) => consumesMoney).reduce((sum, project) => sum + (Number(project.actualCost) || 0), 0);
  const active = projects.filter(({ status }) => status === 'active');
  return { total: projects.length, active: active.length, planned: count('planned'), paused: count('paused'), completed: count('completed'), cancelled: count('cancelled'), archived: count('archived'), nearCompletion: projects.filter((project) => progressOf(project) >= 80 && progressOf(project) < 100).length, highestProgressProject: [...active].sort((a, b) => progressOf(b) - progressOf(a))[0] ?? null, upcomingTasks: [], budget: planned || spent ? { planned, spent, remaining: planned - spent } : null };
}
