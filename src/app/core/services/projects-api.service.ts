import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { CreateProjectBudgetPayload, CreateProjectPayload, CreateProjectTaskPayload, ProjectApi, ProjectBudgetApi, ProjectTaskApi, UpdateProjectBudgetPayload, UpdateProjectPayload, UpdateProjectTaskPayload } from '../models/projects.model';

@Injectable({ providedIn: 'root' })
export class ProjectsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/projects`;
  getProjects() { return this.http.get<ApiResponse<ProjectApi[]>>(this.url).pipe(map(unwrapApiResponse)); }
  createProject(payload: CreateProjectPayload) { return this.http.post<ProjectApi>(this.url, payload); }
  getProjectById(id: string) { return this.http.get<ApiResponse<ProjectApi>>(`${this.url}/${id}`).pipe(map(unwrapApiResponse)); }
  updateProject(id: string, payload: UpdateProjectPayload) { return this.http.patch<ProjectApi>(`${this.url}/${id}`, payload); }
  getProjectTasks(projectId: string) { return this.http.get<ApiResponse<ProjectTaskApi[]>>(`${this.url}/${projectId}/tasks`).pipe(map(unwrapApiResponse)); }
  createProjectTask(projectId: string, payload: CreateProjectTaskPayload) { return this.http.post<ProjectTaskApi>(`${this.url}/${projectId}/tasks`, payload); }
  updateProjectTask(projectId: string, taskId: string, payload: UpdateProjectTaskPayload) { return this.http.patch<ProjectTaskApi>(`${this.url}/${projectId}/tasks/${taskId}`, payload); }
  deleteProjectTask(projectId: string, taskId: string) { return this.http.delete<void>(`${this.url}/${projectId}/tasks/${taskId}`); }
  getProjectBudgets(projectId: string) { return this.http.get<ApiResponse<ProjectBudgetApi[]>>(`${this.url}/${projectId}/budgets`).pipe(map(unwrapApiResponse)); }
  createProjectBudget(projectId: string, payload: CreateProjectBudgetPayload) { return this.http.post<ProjectBudgetApi>(`${this.url}/${projectId}/budgets`, payload); }
  updateProjectBudget(projectId: string, budgetId: string, payload: UpdateProjectBudgetPayload) { return this.http.patch<ProjectBudgetApi>(`${this.url}/${projectId}/budgets/${budgetId}`, payload); }
}
