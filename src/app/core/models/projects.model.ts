import { ApiPayload } from './api.model';

export interface ProjectApi { id: string; name: string; status?: string; progress?: string | number; description?: string; }
export interface ProjectTaskApi { id: string; projectId?: string; name?: string; title?: string; completed?: boolean; status?: string; priority?: string; }
export interface ProjectBudgetApi { id: string; projectId?: string; name?: string; category?: string; spent?: string | number; used?: string | number; limit?: string | number; amount?: string | number; }
export type CreateProjectPayload = ApiPayload;
export type UpdateProjectPayload = ApiPayload;
export type CreateProjectTaskPayload = ApiPayload;
export type UpdateProjectTaskPayload = ApiPayload;
export type CreateProjectBudgetPayload = ApiPayload;
export type UpdateProjectBudgetPayload = ApiPayload;
export interface SummaryCard { label: string; value: string; copy: string; }
export interface ProjectBudget { name: string; spent: number; limit: number; }
export interface PriorityTask { name: string; done: boolean; priority: 'Alta' | 'Media' | 'Baja'; }
export interface ProjectCard { name: string; status: string; progress: number; tasks: string; tone: 'purple' | 'blue' | 'green'; }
export interface ProjectsView { summaryCards: SummaryCard[]; projectBudgets: ProjectBudget[]; priorityTasks: PriorityTask[]; projects: ProjectCard[]; featured?: { name: string; next: string; progress: number; status: string }; }
