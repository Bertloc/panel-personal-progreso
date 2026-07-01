import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { CreateDebtPayload, CreateDebtPaymentPayload, DebtApi, DebtPaymentApi, DebtProjectionApi, UpdateDebtPaymentPayload, UpdateDebtPayload } from '../models/debts.model';

@Injectable({ providedIn: 'root' })
export class DebtsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/debts`;
  getDebts(filters: Record<string, string | number | boolean | undefined> = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) if (value !== undefined) params = params.set(key, String(value));
    return this.http.get<ApiResponse<DebtApi[]>>(this.url, { params }).pipe(map(unwrapApiResponse));
  }
  createDebt(payload: CreateDebtPayload) { return this.http.post<DebtApi>(this.url, payload); }
  getDebtById(id: string) { return this.http.get<ApiResponse<DebtApi>>(`${this.url}/${id}`).pipe(map(unwrapApiResponse)); }
  updateDebt(id: string, payload: UpdateDebtPayload) { return this.http.patch<DebtApi>(`${this.url}/${id}`, payload); }
  deleteDebt(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
  createPayment(debtId: string, payload: CreateDebtPaymentPayload) { return this.http.post<DebtPaymentApi>(`${this.url}/${debtId}/payments`, payload); }
  getPayments(debtId: string) { return this.http.get<ApiResponse<DebtPaymentApi[]>>(`${this.url}/${debtId}/payments`).pipe(map(unwrapApiResponse)); }
  updatePayment(paymentId: string, payload: UpdateDebtPaymentPayload) { return this.http.patch<DebtPaymentApi>(`${this.url}/payments/${paymentId}`, payload); }
  deletePayment(paymentId: string) { return this.http.delete<void>(`${this.url}/payments/${paymentId}`); }
  getDebtProjection(debtId: string) { return this.http.get<ApiResponse<DebtProjectionApi>>(`${this.url}/${debtId}/projection`).pipe(map(unwrapApiResponse)); }
}
