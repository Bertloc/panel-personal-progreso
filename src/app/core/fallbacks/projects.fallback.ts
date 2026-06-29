import { ProjectsView } from '../models/projects.model';

export const PROJECTS_FALLBACK: ProjectsView = {
  summaryCards: [{ label: 'Activos', value: '3 proyectos', copy: '2 cerca de terminar' }, { label: 'Tiempo', value: '14.5h', copy: 'esta semana' }],
  projectBudgets: [{ name: 'Hosting', spent: 42.5, limit: 50 }, { name: 'Design Assets', spent: 120, limit: 150 }],
  priorityTasks: [
    { name: 'Crear estructura Angular', done: true, priority: 'Baja' }, { name: 'Construir Home UI', done: false, priority: 'Alta' },
    { name: 'Hacer pantalla Dinero', done: false, priority: 'Alta' }, { name: 'Crear heatmap anual', done: false, priority: 'Media' },
    { name: 'Definir mock data real', done: false, priority: 'Media' },
  ],
  projects: [
    { name: 'App Finanzas Personal', status: 'En progreso', progress: 68, tasks: '4/6 tareas', tone: 'purple' },
    { name: 'Web Rentara', status: 'Activo', progress: 45, tasks: '3/7 tareas', tone: 'blue' },
    { name: 'Curso Angular', status: 'Aprendiendo', progress: 30, tasks: '2/5 tareas', tone: 'green' },
  ],
  featured: { name: 'App personal', next: 'Construir Home UI', progress: 68, status: 'Desarrollo' },
};
