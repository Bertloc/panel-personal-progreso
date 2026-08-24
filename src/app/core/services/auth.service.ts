import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthResponse, Session, User } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(SupabaseClientService).client.auth;
  private readonly readyPromise: Promise<void>;
  readonly session = signal<Session | null>(null);
  readonly currentUser = signal<User | null>(null);
  readonly loading = signal(true);
  readonly isAuthenticated = computed(() => !!this.currentUser());

  constructor() {
    this.auth.onAuthStateChange((_event, session) => this.setSession(session));
    this.readyPromise = this.restoreSession().then(() => undefined);
  }

  async register(email: string, password: string, displayName?: string): Promise<AuthResponse> {
    const response = await this.auth.signUp({ email, password, options: { data: displayName ? { display_name: displayName } : undefined } });
    if (response.data.session) this.setSession(response.data.session);
    return response;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.auth.signInWithPassword({ email, password });
    if (response.data.session) this.setSession(response.data.session);
    return response;
  }

  async logout(): Promise<void> {
    const { error } = await this.auth.signOut();
    if (error) throw error;
    this.setSession(null);
  }

  async getSession(): Promise<Session | null> {
    const { data, error } = await this.auth.getSession();
    if (error) throw error;
    this.setSession(data.session);
    return data.session;
  }

  async getAccessToken(): Promise<string | null> {
    await this.whenReady();
    return this.session()?.access_token ?? null;
  }

  async restoreSession(): Promise<Session | null> {
    try { return await this.getSession(); }
    catch { this.setSession(null); return null; }
    finally { this.loading.set(false); }
  }

  whenReady(): Promise<void> { return this.readyPromise; }

  private setSession(session: Session | null): void {
    this.session.set(session);
    this.currentUser.set(session?.user ?? null);
  }
}
