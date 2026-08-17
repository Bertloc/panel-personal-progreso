import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { BudgetPeriodType } from '../../../core/models/budgets.model';
import { BudgetsApiService } from '../../../core/services/budgets-api.service';
import { MoneyApiService } from '../../../core/services/money-api.service';
import { QuickCreateEventsService } from '../../../core/services/quick-create-events.service';

@Component({
  selector: 'app-budget-manager',
  imports: [ReactiveFormsModule],
  template: `
    <div class="manager">
      <div><h2>Presupuesto</h2><p class="meta">Asigna un límite a tus categorías de gasto.</p></div>
      @if (loading()) { <p class="empty">Cargando presupuesto…</p> } @else if (!error() && !limits().length) {
        <p class="empty">Primero crea categorías de gasto para asignar presupuesto.</p>
      } @else if (!error()) {
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="field-grid">
            <label class="full">Nombre <input formControlName="name" placeholder="Presupuesto quincenal" /></label>
            <label>Periodo <select formControlName="periodType">@for (period of periods; track period.value) { <option [value]="period.value">{{ period.label }}</option> }</select></label>
            <label>Inicio <input formControlName="startDate" type="date" /></label>
            <label>Fin <input formControlName="endDate" type="date" /></label>
          </div>
          <div class="items">
            @for (limit of limits(); track limit.categoryId) {
              <label class="limit-row"><span>{{ limit.name }}</span><input type="number" min="0" step="0.01" [value]="limit.amount" (input)="setAmount(limit.categoryId, $any($event.target).value)" /></label>
            }
          </div>
          <button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Guardando…' : 'Guardar presupuesto' }}</button>
        </form>
      }
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (success()) { <p class="success">Presupuesto guardado.</p> }
    </div>
  `,
  styleUrl: './setup-manager.css',
})
export class BudgetManager {
  readonly contextual = input(false);
  readonly saved = output<void>();
  private readonly fb = inject(FormBuilder);
  private readonly budgets = inject(BudgetsApiService);
  private readonly money = inject(MoneyApiService);
  private readonly events = inject(QuickCreateEventsService);
  private currentId: string | null = null;
  protected readonly limits = signal<{ categoryId: string; name: string; amount: number }[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal(false);
  protected readonly periods: { value: BudgetPeriodType; label: string }[] = [
    { value: 'weekly', label: 'Semanal' }, { value: 'biweekly', label: 'Quincenal' },
    { value: 'monthly', label: 'Mensual' }, { value: 'custom', label: 'Personalizado' },
  ];
  protected readonly form = this.fb.nonNullable.group({
    name: ['Presupuesto actual', Validators.required],
    periodType: this.fb.nonNullable.control<BudgetPeriodType>('biweekly', Validators.required),
    startDate: [today(), Validators.required], endDate: [today(), Validators.required],
  });

  constructor() { this.load(); }

  protected setAmount(categoryId: string, value: string) {
    this.limits.update((limits) => limits.map((limit) => limit.categoryId === categoryId ? { ...limit, amount: Math.max(0, Number(value) || 0) } : limit));
  }

  protected save() {
    const limits = this.limits().filter(({ amount }) => amount > 0);
    if (this.form.invalid || this.saving()) return;
    if (!limits.length) { this.error.set('Asigna un monto mayor a cero al menos a una categoría.'); return; }
    const payload = { ...this.form.getRawValue(), limits: limits.map(({ categoryId, amount }) => ({ categoryId, amount })) };
    this.saving.set(true); this.error.set(''); this.success.set(false);
    (this.currentId ? this.budgets.updateCurrentBudget(payload) : this.budgets.saveCurrentBudget(payload))
      .pipe(finalize(() => this.saving.set(false))).subscribe({
        next: () => { this.success.set(true); this.events.notifyMoneyChanged(); this.saved.emit(); if (!this.contextual()) this.load(); },
        error: () => this.error.set('No se pudo guardar el presupuesto.'),
      });
  }

  private load() {
    this.loading.set(true); this.error.set('');
    forkJoin({ categories: this.money.getCategories({ type: 'expense' }), budget: this.budgets.getCurrentBudget() })
      .pipe(finalize(() => this.loading.set(false))).subscribe({
        next: ({ categories, budget }) => {
          this.currentId = budget.current?.id ?? null;
          this.form.patchValue({ name: budget.current?.name ?? 'Presupuesto actual', periodType: budget.current?.periodType ?? 'biweekly', startDate: dateInput(budget.current?.startDate), endDate: dateInput(budget.current?.endDate) });
          this.limits.set(categories.filter(({ isActive }) => isActive !== false).map((category) => ({ categoryId: category.id, name: category.name, amount: Number(budget.limits.find((limit) => limit.categoryId === category.id)?.amount ?? budget.limits.find((limit) => limit.categoryId === category.id)?.limit ?? 0) })));
        },
        error: () => this.error.set('No se pudo cargar el presupuesto.'),
      });
  }
}

function today() { return new Date().toISOString().slice(0, 10); }
function dateInput(value?: string) { return value?.slice(0, 10) ?? today(); }
