import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { CreateDebtPayload, CreateDebtPaymentPayload, DebtApi, DebtPaymentApi, DebtProjectionApi, UpdateDebtPayload } from '../models/debts.model';

@Injectable({ providedIn: 'root' })
export class DebtsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/debts`;
  getDebts() { return this.http.get<ApiResponse<DebtApi[]>>(this.url).pipe(map(unwrapApiResponse)); }
  createDebt(payload: CreateDebtPayload) { return this.http.post<DebtApi>(this.url, payload); }
  getDebtById(id: string) { return this.http.get<ApiResponse<DebtApi>>(`${this.url}/${id}`).pipe(map(unwrapApiResponse)); }
  updateDebt(id: string, payload: UpdateDebtPayload) { return this.http.patch<DebtApi>(`${this.url}/${id}`, payload); }
  deleteDebt(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
  createDebtPayment(debtId: string, payload: CreateDebtPaymentPayload) { return this.http.post<DebtPaymentApi>(`${this.url}/${debtId}/payments`, payload); }
  getDebtPayments(debtId: string) { return this.http.get<ApiResponse<DebtPaymentApi[]>>(`${this.url}/${debtId}/payments`).pipe(map(unwrapApiResponse)); }
  getDebtProjection(debtId: string) { return this.http.get<ApiResponse<DebtProjectionApi>>(`${this.url}/${debtId}/projection`).pipe(map(unwrapApiResponse)); }
}
