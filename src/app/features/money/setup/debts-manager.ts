import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { DebtApi, DebtPriority, DebtStrategy } from '../../../core/models/debts.model';
import { DebtsApiService } from '../../../core/services/debts-api.service';
import { QuickCreateEventsService } from '../../../core/services/quick-create-events.service';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-debts-manager',
  imports: [ReactiveFormsModule, AppCurrencyPipe],
  template: `
    <div class="manager">
      <div><h2>Deudas</h2><p class="meta">Define el saldo y la estrategia de cada deuda.</p></div>
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="field-grid">
          <label>Nombre <input formControlName="name" /></label>
          <label>Monto inicial <input formControlName="initialAmount" type="number" min="0.01" step="0.01" /></label>
          <label>Monto actual <input formControlName="currentAmount" type="number" min="0" step="0.01" /></label>
          <label>Pago mínimo <input formControlName="minimumPayment" type="number" min="0" step="0.01" /></label>
          <label>Día de pago <input formControlName="paymentDay" type="number" min="1" max="31" /></label>
          <label>Estrategia <select formControlName="strategy">@for (strategy of strategies; track strategy) { <option [value]="strategy">{{ strategy }}</option> }</select></label>
          <label>Prioridad <select formControlName="priority">@for (priority of priorities; track priority) { <option [value]="priority">{{ priority }}</option> }</select></label>
          <label class="full">Notas <textarea formControlName="notes" rows="2"></textarea></label>
        </div>
        <div class="actions">@if (editingId()) { <button class="secondary" type="button" (click)="reset()">Cancelar</button> }<button type="submit" [disabled]="form.invalid || saving()">{{ editingId() ? 'Actualizar' : 'Agregar deuda' }}</button></div>
      </form>
      @if (error()) { <p class="error">{{ error() }}</p> }
      @if (loading()) { <p class="empty">Cargando deudas…</p> } @else if (!error()) {
        <div class="items">
          @for (debt of debts(); track debt.id) {
            <article class="item"><div class="item-head"><strong>{{ debt.name }}</strong><strong>{{ currentAmount(debt) | appCurrency }}</strong></div><p class="meta">Mínimo: {{ minimumPayment(debt) | appCurrency }} · {{ debt.strategy || 'sin estrategia' }} · {{ debt.progressPercent ?? debt.progress ?? 0 }}%</p><div class="actions"><button class="secondary" type="button" (click)="edit(debt)">Editar</button><button class="danger" type="button" (click)="remove(debt)">Eliminar</button></div></article>
          } @empty { <p class="empty">Aún no tienes deudas registradas.</p> }
        </div>
      }
    </div>
  `,
  styleUrl: './setup-manager.css',
})
export class DebtsManager {
  readonly saved = output<void>();
  private readonly fb = inject(FormBuilder); private readonly api = inject(DebtsApiService); private readonly events = inject(QuickCreateEventsService);
  protected readonly debts = signal<DebtApi[]>([]); protected readonly loading = signal(true); protected readonly saving = signal(false); protected readonly error = signal(''); protected readonly editingId = signal<string | null>(null);
  protected readonly strategies: DebtStrategy[] = ['bank_plan', 'light', 'aggressive', 'custom'];
  protected readonly priorities: DebtPriority[] = ['low', 'medium', 'high', 'urgent'];
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required], initialAmount: [0, [Validators.required, Validators.min(.01)]], currentAmount: [0, [Validators.required, Validators.min(0)]],
    minimumPayment: [0, Validators.min(0)], paymentDay: this.fb.control<number | null>(null),
    strategy: this.fb.nonNullable.control<DebtStrategy>('bank_plan', Validators.required), priority: this.fb.nonNullable.control<DebtPriority>('medium', Validators.required), notes: '',
  });
  constructor() { this.load(); }
  protected currentAmount(debt: DebtApi) { return Number(debt.currentAmount ?? debt.remainingAmount ?? debt.balance ?? 0); }
  protected minimumPayment(debt: DebtApi) { return Number(debt.minimumPayment ?? 0); }
  protected save() {
    if (this.form.invalid || this.saving()) return;
    const value = this.form.getRawValue(); const id = this.editingId();
    const payload = { ...value, minimumPayment: value.minimumPayment || null, paymentDay: value.paymentDay || null, notes: value.notes || null, status: 'active' };
    this.saving.set(true); this.error.set('');
    (id ? this.api.updateDebt(id, payload) : this.api.createDebt(payload)).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.reset(); this.events.notifyMoneyChanged(); this.saved.emit(); this.load(); }, error: () => this.error.set('No se pudo guardar la deuda.') });
  }
  protected edit(debt: DebtApi) { this.editingId.set(debt.id); this.form.patchValue({ name: debt.name ?? '', initialAmount: Number(debt.initialAmount ?? debt.originalAmount ?? debt.totalAmount ?? 0), currentAmount: this.currentAmount(debt), minimumPayment: Number(debt.minimumPayment ?? 0), paymentDay: debt.paymentDay ?? null, strategy: debt.strategy ?? 'bank_plan', priority: debt.priority ?? 'medium', notes: debt.notes ?? '' }); }
  protected reset() { this.editingId.set(null); this.form.reset({ name: '', initialAmount: 0, currentAmount: 0, minimumPayment: 0, paymentDay: null, strategy: 'bank_plan', priority: 'medium', notes: '' }); }
  protected remove(debt: DebtApi) { if (!confirm(`¿Eliminar ${debt.name || 'esta deuda'}?`)) return; this.api.deleteDebt(debt.id).subscribe({ next: () => { this.events.notifyMoneyChanged(); this.load(); }, error: () => this.error.set('No se pudo eliminar la deuda.') }); }
  private load() { this.loading.set(true); this.error.set(''); this.api.getDebts().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (debts) => this.debts.set(debts), error: () => this.error.set('No se pudieron cargar las deudas.') }); }
}
