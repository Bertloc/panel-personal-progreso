import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/supabase.config';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: { persistSession: this.browser, autoRefreshToken: this.browser, detectSessionInUrl: this.browser },
  });
}
