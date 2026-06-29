import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { CreateCategoryPayload, CreateExpensePayload, ExpenseApi, ExpenseFilters, MoneyCategoryApi, UpdateCategoryPayload, UpdateExpensePayload } from '../models/money.model';

@Injectable({ providedIn: 'root' })
export class MoneyApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/money`;
  getCategories() { return this.http.get<ApiResponse<MoneyCategoryApi[]>>(`${this.url}/categories`).pipe(map(unwrapApiResponse)); }
  createCategory(payload: CreateCategoryPayload) { return this.http.post<MoneyCategoryApi>(`${this.url}/categories`, payload); }
  updateCategory(id: string, payload: UpdateCategoryPayload) { return this.http.patch<MoneyCategoryApi>(`${this.url}/categories/${id}`, payload); }
  getExpenses(filters: ExpenseFilters = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) if (value !== undefined) params = params.set(key, String(value));
    return this.http.get<ApiResponse<ExpenseApi[]>>(`${this.url}/expenses`, { params }).pipe(map(unwrapApiResponse));
  }
  getExpenseById(id: string) { return this.http.get<ApiResponse<ExpenseApi>>(`${this.url}/expenses/${id}`).pipe(map(unwrapApiResponse)); }
  createExpense(payload: CreateExpensePayload) { return this.http.post<ExpenseApi>(`${this.url}/expenses`, payload); }
  updateExpense(id: string, payload: UpdateExpensePayload) { return this.http.patch<ExpenseApi>(`${this.url}/expenses/${id}`, payload); }
  deleteExpense(id: string) { return this.http.delete<void>(`${this.url}/expenses/${id}`); }
}
