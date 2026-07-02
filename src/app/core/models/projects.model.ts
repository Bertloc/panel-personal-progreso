export type ProjectStatus = 'planned' | 'active' | 'paused' | 'completed' | 'cancelled' | 'archived';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectCategory = 'personal' | 'school' | 'work' | 'finance' | 'health' | 'learning' | 'other' | string;
export type ProjectTaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
export type ProjectTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
  id: string;
  userId?: string;
  name: string;
  description?: string | null;
  category?: ProjectCategory | null;
  priority: ProjectPriority;
  status: ProjectStatus;
  startDate?: string | null;
  targetDate?: string | null;
  consumesMoney: boolean;
  budgetAmount?: number | null;
  actualCost?: number | null;
  tasksCount?: number;
  completedTasks?: number;
  progressPercent?: number;
  nextTask?: ProjectTask | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectTask {
  id: string;
  userId?: string;
  projectId: string;
  projectName?: string;
  title: string;
  description?: string | null;
  priority: ProjectTaskPriority;
  status: ProjectTaskStatus;
  dueDate?: string | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
  completedAt?: string | null;
  order?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectsSummary {
  total: number;
  active: number;
  planned: number;
  paused: number;
  completed: number;
  cancelled: number;
  archived: number;
  nearCompletion: number;
  highestProgressProject?: Project | null;
  upcomingTasks: ProjectTask[];
  budget?: { planned: number; spent: number; remaining: number } | null;
}

export type ProjectFilters = Record<string, string | number | boolean | undefined>;
export type CreateProjectPayload = Omit<Project, 'id' | 'userId' | 'tasksCount' | 'completedTasks' | 'progressPercent' | 'nextTask' | 'createdAt' | 'updatedAt' | 'actualCost'>;
export type UpdateProjectPayload = Partial<CreateProjectPayload>;
export type CreateProjectTaskPayload = Omit<ProjectTask, 'id' | 'userId' | 'projectId' | 'projectName' | 'completedAt' | 'createdAt' | 'updatedAt'>;
export type UpdateProjectTaskPayload = Partial<CreateProjectTaskPayload>;
