import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { MoneyCategoryApi } from '../../../core/models/money.model';
import { RecurringFrequency, RecurringPayment } from '../../../core/models/recurring-payment.model';
import { RecurringPaymentsApiService } from '../../../core/services/recurring-payments-api.service';
import { QuickCreateEventsService } from '../../../core/services/quick-create-events.service';
import { MoneyApiService } from '../../../core/services/money-api.service';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';
import { monthlyDateForDay, monthlyDayFromDate } from '../../../core/utils/monthly-payment-date.util';

@Component({
  selector: 'app-recurring-payments-manager',
  imports: [ReactiveFormsModule, AppCurrencyPipe],
  template: `
    <div class="manager">
      <div><h2>Pagos recurrentes</h2><p class="meta">Registra los cobros que vuelven cada periodo.</p></div>
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="field-grid">
          <label>Nombre <input formControlName="name" /></label>
          <label>Monto <input formControlName="amount" type="number" min="0.01" step="0.01" /></label>
          <label>Frecuencia <select formControlName="frequency">@for (frequency of frequencies; track frequency) { <option [value]="frequency">{{ frequencyLabel(frequency) }}</option> }</select></label>
          @if (form.controls.frequency.value === 'monthly') {
            <label>Fecha de pago * <input formControlName="paymentDate" type="date" />
              @if (form.controls.paymentDate.touched && form.hasError('monthlyPaymentDate')) { <span class="field-error">Selecciona una fecha de pago válida.</span> }
              @if (selectedPaymentDay(); as day) { <span class="field-help">Se considerará el día {{ day }} de cada mes.</span> }
            </label>
          } @else {
            <label>Próxima fecha <input formControlName="nextDueDate" type="date" /></label>
          }
          <label>Categoría <select formControlName="categoryId"><option value="">Sin categoría</option>@for (category of categories(); track category.id) { <option [value]="category.id">{{ category.name }}</option> }</select></label>
          <label class="check"><input formControlName="isFixed" type="checkbox" /> Pago fijo</label>
          <label class="full">Notas <textarea formControlName="notes" rows="2"></textarea></label>
        </div>
        <div class="actions">@if (editingId()) { <button class="secondary" type="button" (click)="reset()">Cancelar</button> }<button type="submit" [disabled]="form.invalid || saving()">{{ editingId() ? 'Actualizar' : 'Agregar pago' }}</button></div>
      </form>
      @if (error()) { <p class="error">{{ error() }}</p> }
      @if (loading()) { <p class="empty">Cargando pagos…</p> } @else if (!error()) {
        <div class="items">
          @for (payment of payments(); track payment.id) {
            <article class="item"><div class="item-head"><strong>{{ payment.name }}</strong><strong>{{ paymentAmount(payment) | appCurrency }}</strong></div><p class="meta">{{ frequencyLabel(payment.frequency) }} · {{ payment.frequency === 'monthly' && payment.dueDay ? 'día ' + payment.dueDay : payment.nextDueDate || 'sin fecha' }}</p><div class="actions"><button class="secondary" type="button" (click)="edit(payment)">Editar</button><button class="danger" type="button" (click)="remove(payment)">Eliminar</button></div></article>
          } @empty { <p class="empty">Aún no tienes pagos recurrentes.</p> }
        </div>
      }
    </div>
  `,
  styleUrl: './setup-manager.css',
  styles: `.field-error { color: var(--color-red); font-size: .78rem; } .field-help { color: var(--color-text-secondary); font-size: .78rem; font-weight: 500; line-height: 1.4; }`,
})
export class RecurringPaymentsManager {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(RecurringPaymentsApiService);
  private readonly money = inject(MoneyApiService);
  private readonly events = inject(QuickCreateEventsService);
  protected readonly payments = signal<RecurringPayment[]>([]);
  protected readonly categories = signal<MoneyCategoryApi[]>([]);
  protected readonly loading = signal(true); protected readonly saving = signal(false); protected readonly error = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly frequencies: RecurringFrequency[] = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly', 'custom'];
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required], amount: [0, [Validators.required, Validators.min(.01)]],
    frequency: this.fb.nonNullable.control<RecurringFrequency>('monthly', Validators.required), paymentDate: '',
    nextDueDate: '', categoryId: '', isFixed: true, notes: '',
  }, { validators: monthlyPaymentDateRequired });

  constructor() { this.load(); }
  protected save() {
    if (this.form.invalid || this.saving()) return;
    const value = this.form.getRawValue(); const id = this.editingId();
    const { paymentDate, ...fields } = value;
    const payload = { ...fields, dueDay: value.frequency === 'monthly' ? monthlyDayFromDate(paymentDate) ?? undefined : undefined, nextDueDate: value.frequency === 'monthly' ? undefined : value.nextDueDate || undefined, categoryId: value.categoryId || undefined, notes: value.notes || undefined };
    this.saving.set(true); this.error.set('');
    (id ? this.api.updateRecurringPayment(id, payload) : this.api.createRecurringPayment(payload)).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.reset(); this.events.notifyMoneyChanged(); this.load(); }, error: () => this.error.set('No se pudo guardar el pago recurrente.') });
  }
  protected paymentAmount(payment: RecurringPayment) { return Number(payment.amount); }
  protected selectedPaymentDay() { return monthlyDayFromDate(this.form.controls.paymentDate.value); }
  protected frequencyLabel(frequency: RecurringFrequency) { return ({ daily: 'Diaria', weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual', yearly: 'Anual', custom: 'Personalizada' })[frequency]; }
  protected edit(payment: RecurringPayment) { this.editingId.set(payment.id); this.form.patchValue({ name: payment.name, amount: this.paymentAmount(payment), frequency: payment.frequency, paymentDate: payment.frequency === 'monthly' ? monthlyDateForDay(payment.dueDay ?? 0) : '', nextDueDate: payment.nextDueDate?.slice(0, 10) ?? '', categoryId: payment.categoryId ?? '', isFixed: payment.isFixed, notes: payment.notes ?? '' }); }
  protected reset() { this.editingId.set(null); this.form.reset({ name: '', amount: 0, frequency: 'monthly', paymentDate: '', nextDueDate: '', categoryId: '', isFixed: true, notes: '' }); }
  protected remove(payment: RecurringPayment) { if (!confirm(`¿Eliminar ${payment.name}?`)) return; this.api.deleteRecurringPayment(payment.id).subscribe({ next: () => { this.events.notifyMoneyChanged(); this.load(); }, error: () => this.error.set('No se pudo eliminar el pago.') }); }
  private load() { this.loading.set(true); this.error.set(''); forkJoin({ payments: this.api.getRecurringPayments(), categories: this.money.getCategories() }).pipe(finalize(() => this.loading.set(false))).subscribe({ next: ({ payments, categories }) => { this.payments.set(payments); this.categories.set(categories.filter(({ isActive }) => isActive !== false)); }, error: () => this.error.set('No se pudieron cargar los pagos recurrentes.') }); }
}

function monthlyPaymentDateRequired(control: AbstractControl): ValidationErrors | null {
  return control.get('frequency')?.value !== 'monthly' || monthlyDayFromDate(String(control.get('paymentDate')?.value ?? '')) ? null : { monthlyPaymentDate: true };
}
