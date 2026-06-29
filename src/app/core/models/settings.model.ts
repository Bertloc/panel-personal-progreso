import { ApiPayload } from './api.model';

export interface SettingsApi {
  id?: string;
  userName?: string;
  paydayIncome?: string | number;
  income?: string | number;
  [key: string]: unknown;
}
export type UpdateSettingsPayload = ApiPayload;
