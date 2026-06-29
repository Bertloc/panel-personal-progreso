import { Component } from '@angular/core';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';

type SummaryCard = {
  label: string;
  value: string;
  copy: string;
};

type ProjectBudget = {
  name: string;
  spent: number;
  limit: number;
};

type PriorityTask = {
  name: string;
  done: boolean;
  priority: 'Alta' | 'Media' | 'Baja';
};

type ProjectCard = {
  name: string;
  status: string;
  progress: number;
  tasks: string;
  tone: 'purple' | 'blue' | 'green';
};

@Component({
  selector: 'app-projects-page',
  imports: [AppCurrencyPipe],
  template: `
    <div class="page-stack">
      <header class="page-header">
        <p class="page-eyebrow">En marcha</p>
        <h1 class="page-title">Proyectos</h1>
        <p class="page-copy">Tus prioridades y próximos pasos.</p>
      </header>

      <section class="mini-grid">
        @for (card of summaryCards; track card.label) {
          <article class="surface-card summary-card">
            <p class="card-label">{{ card.label }}</p>
            <strong>{{ card.value }}</strong>
            <p class="card-meta">{{ card.copy }}</p>
          </article>
        }
      </section>

      <section class="surface-card featured-card">
        <span class="status-badge status-badge--purple">Desarrollo</span>
        <h2 class="featured-title">App personal</h2>
        <p class="section-card-copy">Siguiente: Construir Home UI</p>

        <div class="split-line split-line--bottom">
          <span class="section-card-copy">Progreso</span>
          <strong>68%</strong>
        </div>

        <div class="progress-track" aria-hidden="true">
          <span class="progress-fill progress-fill--purple" style="width: 68%"></span>
        </div>

        <button class="featured-button" type="button">Continuar</button>
      </section>

      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title">Presupuestos de proyecto</h2>
        </div>

        <div class="mini-grid">
          @for (budget of projectBudgets; track budget.name) {
            <article class="surface-card budget-card">
              <p class="card-label">{{ budget.name }}</p>
              <div class="split-line split-line--bottom">
                <strong>{{ budget.spent | appCurrency }}</strong>
                <span class="card-meta">{{ getProgressPercent(budget.spent, budget.limit) }}%</span>
              </div>
              <p class="card-meta">Límite: {{ budget.limit | appCurrency }}</p>
              <div class="progress-track" aria-hidden="true">
                <span
                  class="progress-fill progress-fill--blue"
                  [style.width.%]="getProgressPercent(budget.spent, budget.limit)"
                ></span>
              </div>
            </article>
          }
        </div>
      </section>

      <section class="surface-card">
        <h2 class="section-card-title">Prioridad</h2>

        <div class="list-card">
          @for (task of priorityTasks; track task.name) {
            <div class="list-row">
              <span class="habit-check" [class.habit-check--done]="task.done"></span>
              <span class="habit-name" [class.habit-name--done]="task.done">{{ task.name }}</span>
              <span class="status-badge" [class]="getPriorityClass(task.priority)">{{ task.priority }}</span>
            </div>
          }
        </div>
      </section>

      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title">Proyectos activos</h2>
        </div>

        <div class="project-list">
          @for (project of projects; track project.name) {
            <article class="surface-card project-card">
              <div class="split-line">
                <strong>{{ project.name }}</strong>
                <span class="status-badge" [class]="getProjectStatusClass(project.tone)">{{ project.status }}</span>
              </div>
              <p class="card-meta">{{ project.tasks }}</p>
              <div class="progress-track" aria-hidden="true">
                <span
                  class="progress-fill"
                  [class]="'progress-fill progress-fill--' + project.tone"
                  [style.width.%]="project.progress"
                ></span>
              </div>
            </article>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    .summary-card strong,
    .featured-title {
      display: block;
      margin: 8px 0 4px;
      font-size: 1.9rem;
      line-height: 1.05;
      letter-spacing: -0.05em;
    }

    .featured-card {
      background:
        radial-gradient(circle at top right, rgb(124 109 255 / 0.22), transparent 38%),
        linear-gradient(180deg, #1b1b58, #191b39 68%, #171a23);
      border-color: rgb(124 109 255 / 0.24);
    }

    .featured-button {
      width: 100%;
      margin-top: 16px;
      padding: 14px 18px;
      border: 0;
      border-radius: 16px;
      background: white;
      color: #2d38d0;
      font-weight: 800;
    }

    .section-block {
      display: grid;
      gap: 12px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .section-title {
      margin: 0;
      font-size: 1rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-secondary);
    }

    .budget-card strong {
      font-size: 1.4rem;
    }

    .project-list {
      display: grid;
      gap: 12px;
    }

    .project-card {
      padding: 18px;
    }

    .habit-name--done {
      text-decoration: line-through;
      color: var(--color-text-secondary);
    }
  `,
})
export class ProjectsPage {
  protected readonly summaryCards: SummaryCard[] = [
    { label: 'Activos', value: '3 proyectos', copy: '2 cerca de terminar' },
    { label: 'Tiempo', value: '14.5h', copy: 'esta semana' },
  ];

  protected readonly projectBudgets: ProjectBudget[] = [
    { name: 'Hosting', spent: 42.5, limit: 50 },
    { name: 'Design Assets', spent: 120, limit: 150 },
  ];

  protected readonly priorityTasks: PriorityTask[] = [
    { name: 'Crear estructura Angular', done: true, priority: 'Baja' },
    { name: 'Construir Home UI', done: false, priority: 'Alta' },
    { name: 'Hacer pantalla Dinero', done: false, priority: 'Alta' },
    { name: 'Crear heatmap anual', done: false, priority: 'Media' },
    { name: 'Definir mock data real', done: false, priority: 'Media' },
  ];

  protected readonly projects: ProjectCard[] = [
    { name: 'App Finanzas Personal', status: 'En progreso', progress: 68, tasks: '4/6 tareas', tone: 'purple' },
    { name: 'Web Rentara', status: 'Activo', progress: 45, tasks: '3/7 tareas', tone: 'blue' },
    { name: 'Curso Angular', status: 'Aprendiendo', progress: 30, tasks: '2/5 tareas', tone: 'green' },
  ];

  protected getProgressPercent(used: number, limit: number): number {
    return Math.min(100, Math.round((used / limit) * 100));
  }

  protected getPriorityClass(priority: PriorityTask['priority']): string {
    if (priority === 'Alta') {
      return 'status-badge status-badge--red';
    }

    if (priority === 'Media') {
      return 'status-badge status-badge--orange';
    }

    return 'status-badge status-badge--green';
  }

  protected getProjectStatusClass(tone: ProjectCard['tone']): string {
    return `status-badge status-badge--${tone}`;
  }
}
