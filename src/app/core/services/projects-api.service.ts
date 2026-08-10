import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { CreateProjectPayload, CreateProjectTaskPayload, Project, ProjectFilters, ProjectsSummary, ProjectTask, UpdateProjectPayload, UpdateProjectTaskPayload } from '../models/projects.model';

@Injectable({ providedIn: 'root' })
export class ProjectsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/projects`;

  getProjects(filters: ProjectFilters = {}) { return this.http.get<ApiResponse<Project[]>>(this.url, { params: toParams(filters) }).pipe(map(unwrapApiResponse)); }
  getProject(id: string) { return this.http.get<ApiResponse<Project>>(`${this.url}/${id}`).pipe(map(unwrapApiResponse)); }
  getProjectById(id: string) { return this.getProject(id); }
  createProject(payload: CreateProjectPayload) { return this.http.post<ApiResponse<Project>>(this.url, payload).pipe(map(unwrapApiResponse)); }
  updateProject(id: string, payload: UpdateProjectPayload) { return this.http.patch<ApiResponse<Project>>(`${this.url}/${id}`, payload).pipe(map(unwrapApiResponse)); }
  completeProject(id: string) { return this.http.post<ApiResponse<Project>>(`${this.url}/${id}/complete`, {}).pipe(map(unwrapApiResponse)); }
  deleteProject(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
  getProjectTasks(projectId: string) { return this.http.get<ApiResponse<ProjectTask[]>>(`${this.url}/${projectId}/tasks`).pipe(map(unwrapApiResponse)); }
  createProjectTask(projectId: string, payload: CreateProjectTaskPayload) { return this.http.post<ApiResponse<ProjectTask>>(`${this.url}/${projectId}/tasks`, payload).pipe(map(unwrapApiResponse)); }
  updateProjectTask(taskId: string, payload: UpdateProjectTaskPayload) { return this.http.patch<ApiResponse<ProjectTask>>(`${this.url}/tasks/${taskId}`, payload).pipe(map(unwrapApiResponse)); }
  deleteProjectTask(taskId: string) { return this.http.delete<void>(`${this.url}/tasks/${taskId}`); }
  getSummary() { return this.http.get<ApiResponse<ProjectsSummary>>(`${this.url}/summary`).pipe(map(unwrapApiResponse)); }
}

function toParams(filters: ProjectFilters): HttpParams {
  return Object.entries(filters).reduce((params, [key, value]) => value === undefined ? params : params.set(key, String(value)), new HttpParams());
}
