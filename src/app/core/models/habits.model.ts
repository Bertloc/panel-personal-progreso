import { ApiPayload } from './api.model';

export type HabitMoment = 'morning' | 'afternoon' | 'night' | 'anytime';
export interface HabitApi { id: string; name: string; moment?: HabitMoment | string; streak?: string | number; status?: string; completed?: boolean; log?: { status?: string }; todayLog?: { status?: string }; }
export type CreateHabitPayload = ApiPayload;
export type UpdateHabitPayload = ApiPayload;
export type CreateHabitLogPayload = ApiPayload;
export type UpdateHabitLogPayload = ApiPayload;
export interface HabitItem { name: string; done: boolean; streak: number; }
export interface HabitSection { title: string; time: string; icon: string; habits: HabitItem[]; }
export interface HabitsView { progress: number; completed: number; total: number; streak: number; sections: HabitSection[]; }
