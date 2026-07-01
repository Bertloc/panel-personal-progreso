import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, unwrapApiResponse } from '../models/api.model';
import { CreateRecurringPaymentPayload, RecurringPayment, UpdateRecurringPaymentPayload } from '../models/recurring-payment.model';

@Injectable({ providedIn: 'root' })
export class RecurringPaymentsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/recurring-payments`;
  getRecurringPayments() { return this.http.get<ApiResponse<RecurringPayment[]>>(this.url).pipe(map(unwrapApiResponse)); }
  createRecurringPayment(payload: CreateRecurringPaymentPayload) { return this.http.post<RecurringPayment>(this.url, payload); }
  updateRecurringPayment(id: string, payload: UpdateRecurringPaymentPayload) { return this.http.patch<RecurringPayment>(`${this.url}/${id}`, payload); }
  deleteRecurringPayment(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
}
