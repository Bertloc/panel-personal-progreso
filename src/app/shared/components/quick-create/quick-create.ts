import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, Observable, take } from 'rxjs';
import { DebtApi } from '../../../core/models/debts.model';
import { IncomeSource } from '../../../core/models/income.model';
import { MoneyCategoryApi } from '../../../core/models/money.model';
import { ProjectPriority, ProjectStatus } from '../../../core/models/projects.model';
import { SavingsGoalApi } from '../../../core/models/savings.model';
import { savingsAmountsAreValid, savingsExcessAmount, savingsRemainingAmount } from '../../../core/utils/money-display.util';
import { toNumber } from '../../../core/utils/number.util';
import { DebtsApiService } from '../../../core/services/debts-api.service';
import { IncomeApiService } from '../../../core/services/income-api.service';
import { MoneyApiService } from '../../../core/services/money-api.service';
import { ProjectsApiService } from '../../../core/services/projects-api.service';
import { QuickCreateEventsService } from '../../../core/services/quick-create-events.service';
import { SavingsApiService } from '../../../core/services/savings-api.service';
import { ActionModal } from '../action-modal/action-modal';
import { AppCurrencyPipe } from '../../pipes/app-currency.pipe';

export type QuickAction = 'expense' | 'income' | 'debt-payment' | 'saving' | 'routine' | 'project';

const ACTION_TITLES: Record<QuickAction, string> = {
  expense: 'Registrar gasto', income: 'Registrar ingreso', 'debt-payment': 'Pago de deuda',
  saving: 'Movimiento de ahorro', routine: 'Rutina de hoy', project: 'Nuevo proyecto',
};

@Component({
  selector: 'app-quick-create',
  imports: [ReactiveFormsModule, RouterLink, ActionModal, AppCurrencyPipe],
  template: `
    <app-action-modal [title]="title" (close)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="save()">
        @switch (action()) {
          @case ('expense') {
            <label>Categoría
              <select formControlName="categoryId">
                <option value="">Selecciona una categoría</option>
                @for (category of categories(); track category.id) { <option [value]="category.id">{{ category.name }}</option> }
              </select>
            </label>
            @if (!loadingOptions() && !error() && !categories().length) {
              <p class="empty">Primero crea una categoría de gasto.
                @if (contextualCategories()) { <button class="inline-link" type="button" (click)="manageCategories.emit()">Administrar categorías</button> }
                @else { <a routerLink="/money/setup" (click)="close.emit()">Ir a configurar dinero</a> }
              </p>
            }
            <label>Monto <input formControlName="amount" type="number" min="0.01" step="0.01" inputmode="decimal"></label>
            <label>Fecha <input formControlName="date" type="date"></label>
            <label>Nota (opcional) <textarea formControlName="note" rows="2"></textarea></label>
            <label>Método de pago (opcional)
              <select formControlName="paymentMethod"><option value="">Sin especificar</option><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option></select>
            </label>
          }
          @case ('income') {
            <p class="notice">Este registro aparecerá en Ingresos recientes de Dinero. No cambia tu ingreso configurado ni tu presupuesto.</p>
            <label>Fuente (opcional)
              <select formControlName="sourceId"><option value="">Sin fuente</option>@for (source of incomeSources(); track source.id) { <option [value]="source.id">{{ source.name }}</option> }</select>
            </label>
            @if (!loadingOptions() && !error() && !incomeSources().length) { <p class="empty">Puedes registrar el ingreso manualmente o configurar una fuente.</p> }
            <label>Monto <input formControlName="amount" type="number" min="0.01" step="0.01"></label>
            <label>Fecha <input formControlName="date" type="date"></label>
            <label>Tipo <select formControlName="type"><option value="regular">Regular</option><option value="extra">Extra</option><option value="adjustment">Ajuste</option><option value="other">Otro</option></select></label>
            <label>Nota (opcional) <textarea formControlName="note" rows="2"></textarea></label>
          }
          @case ('debt-payment') {
            <label>Deuda <select formControlName="targetId"><option value="">Selecciona una deuda</option>@for (debt of debts(); track debt.id) { <option [value]="debt.id">{{ debt.name || 'Deuda' }}</option> }</select></label>
            @if (!loadingOptions() && !error() && !debts().length) { <p class="empty">Primero registra una deuda. <a routerLink="/money/setup" (click)="close.emit()">Ir a configurar dinero</a></p> }
            <label>Monto pagado <input formControlName="amount" type="number" min="0.01" step="0.01"></label>
            <label>Fecha <input formControlName="date" type="date"></label>
            <label>Tipo <select formControlName="type"><option value="minimum">Pago mínimo</option><option value="extra">Abono extra</option><option value="adjustment">Ajuste</option></select></label>
            <label>Nota (opcional) <textarea formControlName="note" rows="2"></textarea></label>
          }
          @case ('saving') {
            <label>Meta de ahorro <select formControlName="targetId"><option value="">Selecciona una meta</option>@for (goal of goals(); track goal.id) { <option [value]="goal.id">{{ goal.name }}</option> }</select></label>
            @if (!loadingOptions() && !error() && !goals().length) { <p class="empty">Primero crea una meta de ahorro. <a routerLink="/money/setup" (click)="close.emit()">Ir a configurar dinero</a></p> }
            @if (selectedSavingGoal(); as goal) {
              <section class="saving-summary" aria-live="polite">
                <strong>{{ goal.name }}</strong>
                @if (savingGoalAmountsAreValid(goal)) {
                  <div class="saving-summary-grid">
                    <span>Objetivo <strong>{{ savingGoalTarget(goal) | appCurrency }}</strong></span>
                    <span>Ahorrado <strong>{{ savingGoalCurrent(goal) | appCurrency }}</strong></span>
                  </div>
                  @if (savingGoalCurrent(goal) >= savingGoalTarget(goal)) {
                    <p class="success">Esta meta ya fue alcanzada.</p>
                    @if (savingGoalExcess(goal); as excess) { <p>Excedente actual: {{ excess | appCurrency }}</p> }
                  } @else {
                    <p>Faltan: <strong>{{ savingGoalRemaining(goal) | appCurrency }}</strong></p>
                  }
                } @else {
                  <p class="error">Los importes de esta meta son inconsistentes.</p>
                }
              </section>
            }
            <label>Monto <input formControlName="amount" type="number" min="0.01" step="0.01"></label>
            @if (savingOverage(); as overage) {
              <p class="warning" role="status">{{ savingOverageLabel() }} {{ overage | appCurrency }}.</p>
            }
            <label>Fecha <input formControlName="date" type="date"></label>
            <label>Tipo <select formControlName="type"><option value="deposit">Aporte</option><option value="withdrawal">Retiro</option><option value="adjustment">Ajuste</option></select></label>
            <label>Nota (opcional) <textarea formControlName="note" rows="2"></textarea></label>
          }
          @case ('routine') {
            <p class="empty">Marca tus actividades desde <a routerLink="/routine" (click)="close.emit()">Rutina de hoy</a>.</p>
          }
          @case ('project') {
            <label>Nombre <input formControlName="name" type="text" maxlength="100"></label>
            <label>Descripción (opcional) <textarea formControlName="description" rows="3"></textarea></label>
            <label>Prioridad <select formControlName="priority"><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option><option value="urgent">Urgente</option></select></label>
            <label>Estado inicial <select formControlName="status"><option value="planned">Planeado</option><option value="active">Activo</option></select></label>
          }
        }

        @if (loadingOptions()) { <p class="notice">Cargando opciones…</p> }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        @if (action() !== 'routine') { <div class="actions">
          <button type="button" class="secondary" (click)="close.emit()">Cancelar</button>
          <button type="submit" [disabled]="saving() || loadingOptions() || form.invalid">
            {{ saving() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div> }
      </form>
    </app-action-modal>
  `,
  styles: `
    form { display: grid; gap: 14px; }
    label { display: grid; gap: 7px; color: var(--color-text-secondary); font-size: .82rem; font-weight: 650; }
    input, select, textarea {
      width: 100%;
      border: 1px solid var(--color-border);
      border-radius: 13px;
      padding: 12px 13px;
      background: var(--color-background-secondary);
      color: var(--color-text);
      font: inherit;
      color-scheme: dark;
    }
    textarea { resize: vertical; }
    input:focus, select:focus, textarea:focus { border-color: var(--color-purple); outline: 2px solid rgb(124 109 255 / 18%); }
    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px; }
    button { border: 0; border-radius: 13px; padding: 13px; background: var(--color-purple); color: white; cursor: pointer; font-weight: 750; }
    button.secondary { border: 1px solid var(--color-border); background: transparent; color: var(--color-text-secondary); }
    button.inline-link { padding: 0; background: transparent; color: #b8beff; }
    button:disabled { cursor: not-allowed; opacity: .5; }
    p { margin: 0; font-size: .84rem; }
    .notice, .empty { color: var(--color-text-secondary); }
    .empty a { color: #b8beff; }
    .error { color: var(--color-red); }
    .saving-summary { display: grid; gap: 9px; padding: 12px; border: 1px solid var(--color-border); border-radius: 13px; background: rgb(255 255 255 / 3%); }
    .saving-summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; color: var(--color-text-secondary); font-size: .82rem; }
    .saving-summary-grid strong { display: block; margin-top: 3px; color: var(--color-text); }
    .success { color: var(--color-green); font-weight: 700; }
    .warning { padding: 10px 12px; border-radius: 11px; background: rgb(255 180 75 / 12%); color: var(--color-orange); }
  `,
})
export class QuickCreate implements OnInit {
  readonly action = input.required<QuickAction>();
  readonly contextualCategories = input(false);
  readonly close = output<void>();
  readonly created = output<string>();
  readonly manageCategories = output<void>();
  readonly categories = signal<MoneyCategoryApi[]>([]);
  readonly incomeSources = signal<IncomeSource[]>([]);
  readonly debts = signal<DebtApi[]>([]);
  readonly goals = signal<SavingsGoalApi[]>([]);
  readonly saving = signal(false);
  readonly loadingOptions = signal(false);
  readonly error = signal('');

  private readonly destroyRef = inject(DestroyRef);
  private readonly moneyApi = inject(MoneyApiService);
  private readonly incomeApi = inject(IncomeApiService);
  private readonly debtsApi = inject(DebtsApiService);
  private readonly savingsApi = inject(SavingsApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly events = inject(QuickCreateEventsService);

  readonly form = new FormGroup({
    categoryId: new FormControl(''), sourceId: new FormControl(''), targetId: new FormControl(''), amount: new FormControl<number | null>(null),
    date: new FormControl(today()), note: new FormControl(''), paymentMethod: new FormControl(''), type: new FormControl(''),
    status: new FormControl(''), name: new FormControl(''), description: new FormControl(''), priority: new FormControl(''),
  });

  ngOnInit(): void { this.configure(this.action()); }

  get title(): string { return ACTION_TITLES[this.action()]; }

  protected selectedSavingGoal(): SavingsGoalApi | undefined { return this.goals().find(({ id }) => id === this.form.controls.targetId.value); }
  protected savingGoalCurrent(goal: SavingsGoalApi): number { return Math.max(0, toNumber(goal.currentAmount ?? goal.current)); }
  protected savingGoalTarget(goal: SavingsGoalApi): number { return Math.max(0, toNumber(goal.targetAmount ?? goal.target)); }
  protected savingGoalAmountsAreValid(goal: SavingsGoalApi): boolean { return savingsAmountsAreValid(goal.currentAmount ?? goal.current, goal.targetAmount ?? goal.target); }
  protected savingGoalRemaining(goal: SavingsGoalApi): number { return savingsRemainingAmount(goal.currentAmount ?? goal.current, goal.targetAmount ?? goal.target); }
  protected savingGoalExcess(goal: SavingsGoalApi): number { return savingsExcessAmount(goal.currentAmount ?? goal.current, goal.targetAmount ?? goal.target); }
  protected savingGoalReached(): boolean { const goal = this.selectedSavingGoal(); return !!goal && this.savingGoalAmountsAreValid(goal) && this.savingGoalCurrent(goal) >= this.savingGoalTarget(goal); }
  protected savingOverageLabel(): string { return this.savingGoalReached() ? 'Este movimiento dejará un excedente de' : this.form.controls.type.value === 'adjustment' ? 'Este ajuste supera la meta por' : 'Este aporte supera la meta por'; }
  protected savingOverage(): number {
    const goal = this.selectedSavingGoal();
    const amount = toNumber(this.form.controls.amount.value);
    if (!goal || !this.savingGoalAmountsAreValid(goal) || this.form.controls.type.value === 'withdrawal' || amount <= 0) return 0;
    return savingsExcessAmount(this.savingGoalCurrent(goal) + amount, this.savingGoalTarget(goal));
  }

  save(): void {
    if (this.form.invalid || this.saving()) return;
    const action = this.action();
    const value = this.form.getRawValue();
    const amount = Number(value.amount);
    let request: Observable<unknown>;
    let message: string;

    switch (action) {
      case 'expense':
        request = this.moneyApi.createExpense({ categoryId: value.categoryId, amount, expenseDate: value.date, note: value.note || undefined, source: 'manual', paymentMethod: value.paymentMethod || undefined });
        message = 'Gasto guardado.';
        break;
      case 'income':
        request = this.incomeApi.createEvent({ sourceId: value.sourceId || undefined, amount, incomeDate: value.date, type: value.type, note: value.note || undefined });
        message = `Ingreso de ${new AppCurrencyPipe().transform(amount)} registrado.`;
        break;
      case 'debt-payment':
        request = this.debtsApi.createPayment(value.targetId!, { amount, paymentDate: value.date, type: value.type, note: value.note || undefined });
        message = 'Pago registrado.';
        break;
      case 'saving':
        request = this.savingsApi.createMovement(value.targetId!, { amount, movementDate: value.date, type: value.type, note: value.note || undefined });
        message = 'Movimiento de ahorro guardado.';
        break;
      case 'project':
        request = this.projectsApi.createProject({ name: value.name!, description: value.description || null, category: 'personal', priority: value.priority as ProjectPriority, status: value.status as ProjectStatus, startDate: null, targetDate: null, consumesMoney: false, budgetAmount: null });
        message = 'Proyecto guardado';
        break;
      default: return;
    }

    this.error.set('');
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        if (action === 'expense' || action === 'income' || action === 'debt-payment' || action === 'saving') this.events.notifyMoneyChanged(action);
        if (action === 'project') this.events.notifyProjectChanged();
        this.form.reset({ date: today() });
        this.created.emit(message);
      },
      error: (error: unknown) => this.error.set(action === 'income' ? incomeSaveError(error) : 'No se pudo guardar. Intenta de nuevo.'),
    });
  }

  private configure(action: QuickAction): void {
    this.error.set('');
    this.form.reset({ date: today() });
    Object.values(this.form.controls).forEach((control) => control.clearValidators());
    const required = (...names: (keyof typeof this.form.controls)[]) => names.forEach((name) => this.form.controls[name].addValidators(Validators.required));
    if (action === 'project') {
      required('name', 'status', 'priority');
      this.form.patchValue({ status: 'planned', priority: 'medium' });
    } else if (action !== 'routine') {
      required('date');
      required('amount');
      this.form.controls.amount.addValidators(Validators.min(0.01));
      if (action === 'expense') required('categoryId');
      if (action === 'debt-payment' || action === 'saving') required('targetId');
      if (action === 'income' || action === 'debt-payment' || action === 'saving') required('type');
      if (action === 'debt-payment') this.form.patchValue({ type: 'minimum' });
      if (action === 'saving') this.form.patchValue({ type: 'deposit' });
      if (action === 'income') this.form.patchValue({ type: 'regular' });
    }
    Object.values(this.form.controls).forEach((control) => control.updateValueAndValidity());
    this.loadOptions(action);
  }

  private loadOptions(action: QuickAction): void {
    const sources: Partial<Record<QuickAction, Observable<unknown[]>>> = {
      expense: this.moneyApi.getCategories(), income: this.incomeApi.getSources(), 'debt-payment': this.debtsApi.getDebts(),
      saving: this.savingsApi.getGoals(),
    };
    const source = sources[action];
    if (!source) return;
    this.loadingOptions.set(true);
    source.pipe(take(1), finalize(() => this.loadingOptions.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        if (action === 'expense') this.categories.set((items as MoneyCategoryApi[]).filter(({ type, isActive }) => (!type || type === 'expense') && isActive !== false));
        if (action === 'income') this.incomeSources.set((items as IncomeSource[]).filter(({ isActive }) => isActive));
        if (action === 'debt-payment') this.debts.set((items as DebtApi[]).filter(({ status }) => !status || status === 'active'));
        if (action === 'saving') this.goals.set((items as SavingsGoalApi[]).filter(({ status }) => !status || status === 'active' || status === 'completed'));
      },
      error: () => this.error.set('No se pudieron cargar las opciones.'),
    });
  }
}

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function incomeSaveError(error: unknown): string {
  const response = (error as { error?: { message?: string | string[] } })?.error?.message;
  const message = Array.isArray(response) ? response[0] : response;
  if (!message) return 'No se pudo registrar el ingreso. Intenta de nuevo.';
  if (message.includes('amount')) return 'El monto del ingreso debe ser mayor que 0.';
  if (message.includes('incomeDate')) return 'Ingresa una fecha válida.';
  if (message.includes('type')) return 'Selecciona un tipo de ingreso válido.';
  if (message.includes('Income source not found')) return 'La fuente seleccionada ya no está disponible.';
  return `No se pudo registrar el ingreso: ${message}`;
}
