import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { SavingGoalStatus, SavingsGoalApi } from '../../../core/models/savings.model';
import { QuickCreateEventsService } from '../../../core/services/quick-create-events.service';
import { SavingsApiService } from '../../../core/services/savings-api.service';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-savings-manager',
  imports: [ReactiveFormsModule, AppCurrencyPipe],
  template: `
    <div class="manager">
      <div><h2>Metas de ahorro</h2><p class="meta">Ponle nombre y fecha a lo que quieres alcanzar.</p></div>
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="field-grid">
          <label>Nombre <input formControlName="name" /></label>
          <label>Objetivo <input formControlName="targetAmount" type="number" min="0.01" step="0.01" /></label>
          <label>Monto actual <input formControlName="currentAmount" type="number" min="0" step="0.01" /></label>
          <label>Fecha objetivo <input formControlName="targetDate" type="date" /></label>
          <label>Prioridad <select formControlName="priority"><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></label>
          <label class="full">Notas <textarea formControlName="notes" rows="2"></textarea></label>
        </div>
        <div class="actions">@if (editingId()) { <button class="secondary" type="button" (click)="reset()">Cancelar</button> }<button type="submit" [disabled]="form.invalid || saving()">{{ editingId() ? 'Actualizar' : 'Crear meta' }}</button></div>
      </form>
      @if (error()) { <p class="error">{{ error() }}</p> }
      @if (loading()) { <p class="empty">Cargando metas…</p> } @else if (!error()) {
        <div class="items">
          @for (goal of goals(); track goal.id) {
            <article class="item"><div class="item-head"><strong>{{ goal.name }}</strong><strong>{{ current(goal) | appCurrency }} / {{ target(goal) | appCurrency }}</strong></div><div class="progress-track"><span class="progress-fill progress-fill--green" [style.width.%]="progress(goal)"></span></div><p class="meta">{{ progress(goal) }}% · {{ goal.targetDate || 'sin fecha objetivo' }}</p><div class="actions"><button class="secondary" type="button" (click)="edit(goal)">Editar</button><button class="danger" type="button" (click)="remove(goal)">Eliminar</button></div></article>
          } @empty { <p class="empty">Aún no tienes metas de ahorro.</p> }
        </div>
      }
    </div>
  `,
  styleUrl: './setup-manager.css',
})
export class SavingsManager {
  readonly contextual = input(false);
  readonly saved = output<void>();
  private readonly fb = inject(FormBuilder); private readonly api = inject(SavingsApiService); private readonly events = inject(QuickCreateEventsService);
  protected readonly goals = signal<SavingsGoalApi[]>([]); protected readonly loading = signal(true); protected readonly saving = signal(false); protected readonly error = signal(''); protected readonly editingId = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({ name: ['', Validators.required], targetAmount: [0, [Validators.required, Validators.min(.01)]], currentAmount: [0, Validators.min(0)], targetDate: '', priority: 'medium', notes: '' });
  constructor() { this.load(); }
  protected current(goal: SavingsGoalApi) { return Number(goal.currentAmount ?? goal.current ?? 0); }
  protected target(goal: SavingsGoalApi) { return Number(goal.targetAmount ?? goal.target ?? 0); }
  protected progress(goal: SavingsGoalApi) { const target = this.target(goal); return goal.progressPercent ?? (target ? Math.min(100, Math.round(this.current(goal) / target * 100)) : 0); }
  protected save() {
    if (this.form.invalid || this.saving()) return;
    const value = this.form.getRawValue(); const id = this.editingId();
    const payload = { ...value, targetDate: value.targetDate || null, notes: value.notes || null, status: 'active' satisfies SavingGoalStatus };
    this.saving.set(true); this.error.set('');
    (id ? this.api.updateGoal(id, payload) : this.api.createGoal(payload)).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.reset(); this.events.notifyMoneyChanged(); this.saved.emit(); if (!this.contextual()) this.load(); }, error: () => this.error.set('No se pudo guardar la meta.') });
  }
  protected edit(goal: SavingsGoalApi) { this.editingId.set(goal.id); this.form.patchValue({ name: goal.name, targetAmount: this.target(goal), currentAmount: this.current(goal), targetDate: goal.targetDate?.slice(0, 10) ?? '', priority: goal.priority ?? 'medium', notes: goal.notes ?? '' }); }
  protected reset() { this.editingId.set(null); this.form.reset({ name: '', targetAmount: 0, currentAmount: 0, targetDate: '', priority: 'medium', notes: '' }); }
  protected remove(goal: SavingsGoalApi) { if (!confirm(`¿Eliminar ${goal.name}?`)) return; this.api.deleteGoal(goal.id).subscribe({ next: () => { this.events.notifyMoneyChanged(); this.load(); }, error: () => this.error.set('No se pudo eliminar la meta.') }); }
  private load() { this.loading.set(true); this.error.set(''); this.api.getGoals().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (goals) => this.goals.set(goals), error: () => this.error.set('No se pudieron cargar las metas.') }); }
}
