import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { DebtApi, DebtPriority, DebtStrategy } from '../../../core/models/debts.model';
import { DebtsApiService } from '../../../core/services/debts-api.service';
import { QuickCreateEventsService } from '../../../core/services/quick-create-events.service';
import { debtPriorityLabel, debtStrategyLabel, roundedPercent } from '../../../core/utils/money-display.util';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-debts-manager',
  imports: [ReactiveFormsModule, AppCurrencyPipe],
  template: `
    <div class="manager">
      <div><h2>{{ editingId() ? 'Editar deuda' : 'Deudas' }}</h2><p class="meta">Define el saldo y la estrategia de cada deuda.</p></div>
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="field-grid">
          <label>Nombre * <input formControlName="name" />@if (form.controls.name.touched && form.controls.name.invalid) { <span class="field-error">El nombre es obligatorio.</span> }</label>
          <label>Monto inicial * <input formControlName="initialAmount" type="number" min="0.01" max="9999999999.99" step="0.01" />
            @if (form.controls.initialAmount.touched && form.controls.initialAmount.hasError('required')) { <span class="field-error">El monto inicial es obligatorio.</span> }
            @else if (form.controls.initialAmount.touched && form.controls.initialAmount.invalid) { <span class="field-error">Ingresa un monto inicial entre 0.01 y 9,999,999,999.99, con máximo 2 decimales.</span> }
          </label>
          <label>Monto actual * <input formControlName="currentAmount" type="number" min="0" max="9999999999.99" step="0.01" />
            @if (form.controls.currentAmount.touched && form.controls.currentAmount.hasError('required')) { <span class="field-error">El monto actual es obligatorio.</span> }
            @else if (form.controls.currentAmount.touched && form.controls.currentAmount.hasError('min')) { <span class="field-error">El monto actual no puede ser negativo.</span> }
            @else if (form.controls.currentAmount.touched && form.controls.currentAmount.invalid) { <span class="field-error">Ingresa un monto actual entre 0 y 9,999,999,999.99, con máximo 2 decimales.</span> }
          </label>
          <label>Pago mínimo * <input formControlName="minimumPayment" type="number" min="0.01" max="9999999999.99" step="0.01" />
            @if (form.controls.minimumPayment.touched && form.controls.minimumPayment.hasError('required')) { <span class="field-error">El pago mínimo es obligatorio.</span> }
            @else if (form.controls.minimumPayment.touched && form.controls.minimumPayment.hasError('min')) { <span class="field-error">El pago mínimo debe ser mayor que 0.</span> }
            @else if (form.controls.minimumPayment.touched && form.controls.minimumPayment.invalid) { <span class="field-error">Ingresa un pago mínimo entre 0.01 y 9,999,999,999.99, con máximo 2 decimales.</span> }
          </label>
          <label>Día de pago * <select formControlName="paymentDay"><option [ngValue]="null" disabled>Selecciona un día</option>@for (day of paymentDays; track day) { <option [ngValue]="day">{{ day }}</option> }</select>
            @if (form.controls.paymentDay.touched && form.controls.paymentDay.hasError('required')) { <span class="field-error">El día de pago es obligatorio.</span> }
            @else if (form.controls.paymentDay.touched && form.controls.paymentDay.invalid) { <span class="field-error">El día de pago debe estar entre 1 y 31.</span> }
          </label>
          <label>Estrategia <select formControlName="strategy">@for (strategy of strategies; track strategy) { <option [value]="strategy">{{ debtStrategyLabel(strategy) }}</option> }</select></label>
          <label>Prioridad <select formControlName="priority">@for (priority of priorities; track priority) { <option [value]="priority">{{ debtPriorityLabel(priority) }}</option> }</select></label>
          <label class="full">Notas <textarea formControlName="notes" rows="2"></textarea></label>
        </div>
        @if (form.hasError('currentExceedsInitial') && (form.controls.initialAmount.touched || form.controls.currentAmount.touched)) { <p class="field-error">El monto actual no puede ser mayor que el monto inicial.</p> }
        <div class="actions">@if (editingId()) { <button class="secondary" type="button" (click)="reset()">Cancelar</button> }<button type="submit" [disabled]="saving()">{{ editingId() ? 'Actualizar' : 'Agregar deuda' }}</button></div>
      </form>
      @if (error()) { <p class="error">{{ error() }}</p> }
      @if (!contextual() && loading()) { <p class="empty">Cargando deudas…</p> } @else if (!contextual() && !error()) {
        <div class="items">
          @for (debt of debts(); track debt.id) {
            <article class="item"><div class="item-head"><strong>{{ debt.name }}</strong><strong>{{ currentAmount(debt) | appCurrency }}</strong></div><p class="meta">Mínimo: {{ minimumPayment(debt) | appCurrency }} · {{ debtStrategyLabel(debt.strategy) }} · {{ debtPriorityLabel(debt.priority) }} · {{ roundedPercent(debt.progressPercent ?? debt.progress) }}%</p><div class="actions"><button class="secondary" type="button" (click)="edit(debt)">Editar</button><button class="danger" type="button" (click)="remove(debt)">Eliminar</button></div></article>
          } @empty { <p class="empty">Aún no tienes deudas registradas.</p> }
        </div>
      }
    </div>
  `,
  styleUrl: './setup-manager.css',
  styles: `.field-error { color: var(--color-red); font-size: .78rem; }`,
})
export class DebtsManager implements OnInit {
  readonly contextual = input(false);
  readonly initialDebt = input<DebtApi | null>(null);
  readonly saved = output<void>();
  private readonly fb = inject(FormBuilder); private readonly api = inject(DebtsApiService); private readonly events = inject(QuickCreateEventsService);
  protected readonly debts = signal<DebtApi[]>([]); protected readonly loading = signal(true); protected readonly saving = signal(false); protected readonly error = signal(''); protected readonly editingId = signal<string | null>(null);
  protected readonly strategies: DebtStrategy[] = ['bank_plan', 'light', 'aggressive', 'custom'];
  protected readonly priorities: DebtPriority[] = ['low', 'medium', 'high', 'urgent'];
  protected readonly paymentDays = Array.from({ length: 31 }, (_, index) => index + 1);
  protected readonly debtStrategyLabel = debtStrategyLabel;
  protected readonly debtPriorityLabel = debtPriorityLabel;
  protected readonly roundedPercent = roundedPercent;
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required], initialAmount: [0, [Validators.required, Validators.min(.01), Validators.max(MAX_DEBT_AMOUNT), currencyAmount]], currentAmount: [0, [Validators.required, Validators.min(0), Validators.max(MAX_DEBT_AMOUNT), currencyAmount]],
    minimumPayment: [0, [Validators.required, Validators.min(.01), Validators.max(MAX_DEBT_AMOUNT), currencyAmount]], paymentDay: this.fb.control<number | null>(null, [Validators.required, Validators.min(1), Validators.max(31)]),
    strategy: this.fb.nonNullable.control<DebtStrategy>('bank_plan', Validators.required), priority: this.fb.nonNullable.control<DebtPriority>('medium', Validators.required), notes: '',
  }, { validators: currentNotGreaterThanInitial });
  ngOnInit() { const debt = this.initialDebt(); if (debt) this.edit(debt); if (this.contextual()) this.loading.set(false); else this.load(); }
  protected currentAmount(debt: DebtApi) { return Number(debt.currentAmount ?? debt.remainingAmount ?? debt.balance ?? 0); }
  protected minimumPayment(debt: DebtApi) { return Number(debt.minimumPayment ?? 0); }
  protected save() {
    if (this.saving()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue(); const id = this.editingId();
    const payload = { ...value, paymentDay: value.paymentDay as number, notes: value.notes || null, ...(id ? {} : { status: 'active' }) };
    this.saving.set(true); this.error.set('');
    (id ? this.api.updateDebt(id, payload) : this.api.createDebt(payload)).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.reset(); this.events.notifyMoneyChanged(); this.saved.emit(); if (!this.contextual()) this.load(); }, error: (error: unknown) => this.error.set(debtSaveError(error)) });
  }
  protected edit(debt: DebtApi) { this.editingId.set(debt.id); this.form.patchValue({ name: debt.name ?? '', initialAmount: Number(debt.initialAmount ?? debt.originalAmount ?? debt.totalAmount ?? 0), currentAmount: this.currentAmount(debt), minimumPayment: Number(debt.minimumPayment ?? 0), paymentDay: debt.paymentDay ?? null, strategy: debt.strategy ?? 'bank_plan', priority: debt.priority ?? 'medium', notes: debt.notes ?? '' }); }
  protected reset() { this.editingId.set(null); this.form.reset({ name: '', initialAmount: 0, currentAmount: 0, minimumPayment: 0, paymentDay: null, strategy: 'bank_plan', priority: 'medium', notes: '' }); }
  protected remove(debt: DebtApi) { if (!confirm(`¿Eliminar ${debt.name || 'esta deuda'}?`)) return; this.api.deleteDebt(debt.id).subscribe({ next: () => { this.events.notifyMoneyChanged(); this.load(); }, error: () => this.error.set('No se pudo eliminar la deuda.') }); }
  private load() { this.loading.set(true); this.error.set(''); this.api.getDebts().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (debts) => this.debts.set(debts), error: () => this.error.set('No se pudieron cargar las deudas.') }); }
}

function currentNotGreaterThanInitial(control: AbstractControl): ValidationErrors | null {
  const initial = control.get('initialAmount')?.value;
  const current = control.get('currentAmount')?.value;
  return initial !== null && current !== null && Number(current) > Number(initial) ? { currentExceedsInitial: true } : null;
}

const MAX_DEBT_AMOUNT = 9_999_999_999.99;

function currencyAmount(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === '') return null;
  const value = Number(control.value);
  return Number.isFinite(value) && /^-?\d+(\.\d{1,2})?$/.test(String(control.value)) ? null : { currencyAmount: true };
}

function debtSaveError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) return 'No se pudo guardar la deuda. Intenta de nuevo.';
  const response = error.error as { message?: string | string[] } | string | null;
  const message = typeof response === 'string' ? response : response?.message;
  const detail = (Array.isArray(message) ? message.join(' ') : message ?? '').toLowerCase();
  if ((detail.includes('currentamount') && detail.includes('initialamount')) || detail.includes('monto actual no puede')) return 'El monto actual no puede ser mayor que el monto inicial.';
  if (detail.includes('currentamount') || detail.includes('monto actual')) return 'El monto actual no puede ser negativo.';
  if (detail.includes('minimumpayment') || detail.includes('pago mínimo')) return 'El pago mínimo debe ser mayor que 0.';
  if (detail.includes('paymentday') || detail.includes('día de pago')) return 'El día de pago debe estar entre 1 y 31.';
  if (detail.includes('initialamount') || detail.includes('monto inicial')) return 'El monto inicial debe ser mayor que 0.';
  if (detail.includes('name') || detail.includes('nombre')) return 'El nombre es obligatorio.';
  if (detail.includes('strategy') || detail.includes('estrategia')) return 'Selecciona una estrategia válida.';
  if (detail.includes('priority') || detail.includes('prioridad')) return 'Selecciona una prioridad válida.';
  return 'Los datos de la deuda no son válidos. Revisa los campos e intenta de nuevo.';
}
