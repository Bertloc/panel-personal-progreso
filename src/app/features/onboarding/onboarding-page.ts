import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { CompleteOnboardingPayload } from '../../core/models/onboarding.model';
import { BudgetMode, IncomeFrequency } from '../../core/models/settings.model';
import { OnboardingApiService } from '../../core/services/onboarding-api.service';
import { OnboardingStateService } from '../../core/services/onboarding-state.service';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-onboarding-page',
  imports: [ReactiveFormsModule, AppCurrencyPipe],
  template: `
    <div class="onboarding">
      <header>
        <p class="page-eyebrow">Configuración inicial</p>
        <h1 class="page-title">Hazla tuya</h1>
        <p class="page-copy">Cuatro pasos breves para empezar con datos reales.</p>
      </header>

      <div class="steps" aria-label="Progreso de configuración">
        @for (label of stepLabels; track label; let index = $index) {
          <span [class.active]="index <= step()">{{ index + 1 }}</span>
        }
      </div>

      @if (apiUnavailable) {
        <p class="notice">No pudimos consultar tu estado. Puedes completar el formulario y volver a intentar.</p>
      }

      <form class="surface-card" [formGroup]="form" (ngSubmit)="submit()">
        @switch (step()) {
          @case (0) {
            <fieldset>
              <legend>Cuéntame de ti</legend>
              <p class="section-card-copy">Así personalizamos tu panel.</p>
              <label>Nombre para mostrar <input formControlName="displayName" autocomplete="name" placeholder="Tu nombre" /></label>
              <label>Moneda
                <select formControlName="currency">
                  <option value="MXN">Peso mexicano (MXN)</option>
                  <option value="USD">Dólar estadounidense (USD)</option>
                </select>
              </label>
            </fieldset>
          }
          @case (1) {
            <fieldset>
              <legend>¿Cómo recibes dinero?</legend>
              <p class="section-card-copy">Registra tu ingreso principal; podrás editarlo después.</p>
              <label>Monto <input formControlName="amount" type="number" min="0.01" step="0.01" inputmode="decimal" /></label>
              <label>Frecuencia
                <select formControlName="frequency">
                  @for (option of frequencyOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
              <label>Próxima fecha de pago <small>(opcional)</small><input formControlName="nextPaymentDate" type="date" /></label>
              <label class="check-row"><input formControlName="isFixed" type="checkbox" /> Es un ingreso fijo</label>
            </fieldset>
          }
          @case (2) {
            <fieldset>
              <legend>¿Qué tipo de control quieres llevar?</legend>
              <p class="section-card-copy">Puedes cambiarlo cuando quieras.</p>
              <div class="choice-grid">
                @for (option of budgetOptions; track option.value) {
                  <label class="choice" [class.selected]="form.controls.budgetMode.value === option.value">
                    <input type="radio" formControlName="budgetMode" [value]="option.value" />
                    <strong>{{ option.label }}</strong><span>{{ option.copy }}</span>
                  </label>
                }
              </div>
            </fieldset>
          }
          @case (3) {
            <fieldset>
              <legend>Todo listo</legend>
              <p class="section-card-copy">Confirma tu configuración inicial.</p>
              <dl>
                <div><dt>Nombre</dt><dd>{{ form.controls.displayName.value }}</dd></div>
                <div><dt>Ingreso</dt><dd>{{ form.controls.amount.value | appCurrency }}</dd></div>
                <div><dt>Frecuencia</dt><dd>{{ frequencyLabel() }}</dd></div>
                <div><dt>Próxima fecha</dt><dd>{{ form.controls.nextPaymentDate.value || 'Sin fecha' }}</dd></div>
                <div><dt>Presupuesto</dt><dd>{{ budgetLabel() }}</dd></div>
              </dl>
            </fieldset>
          }
        }

        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

        <div class="actions">
          @if (step() > 0) { <button class="secondary" type="button" (click)="back()" [disabled]="loading()">Atrás</button> }
          @if (step() < 3) {
            <button class="primary" type="button" (click)="next()" [disabled]="!currentStepValid()">Siguiente</button>
          } @else {
            <button class="primary" type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Guardando…' : 'Finalizar configuración' }}</button>
          }
        </div>
      </form>
    </div>
  `,
  styles: `
    .onboarding { display: grid; gap: 22px; }
    .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .steps span { display: grid; place-items: center; height: 7px; overflow: hidden; border-radius: 99px; background: var(--color-border); color: transparent; }
    .steps span.active { background: var(--color-green); }
    form { display: grid; gap: 24px; }
    fieldset { display: grid; gap: 18px; min-width: 0; margin: 0; padding: 0; border: 0; }
    legend { margin-bottom: 6px; font-size: 1.55rem; font-weight: 800; letter-spacing: -.04em; }
    label { display: grid; gap: 8px; color: var(--color-text-secondary); font-weight: 650; }
    input, select { width: 100%; min-height: 48px; padding: 12px 14px; border: 1px solid var(--color-border); border-radius: 14px; background: #0c0f15; color: var(--color-text); font: inherit; }
    input:focus, select:focus { outline: 2px solid rgb(74 222 128 / .45); border-color: var(--color-green); }
    .check-row { display: flex; align-items: center; color: var(--color-text); }
    .check-row input, .choice input { width: 20px; min-height: 20px; accent-color: var(--color-green); }
    .choice-grid { display: grid; gap: 10px; }
    .choice { grid-template-columns: auto 1fr; padding: 15px; border: 1px solid var(--color-border); border-radius: 16px; background: #0c0f15; }
    .choice strong, .choice span { grid-column: 2; }
    .choice input { grid-row: 1 / 3; align-self: center; }
    .choice span { font-size: .9rem; font-weight: 400; }
    .choice.selected { border-color: var(--color-green); background: rgb(74 222 128 / .08); }
    dl { display: grid; margin: 0; }
    dl div { display: flex; justify-content: space-between; gap: 12px; padding: 13px 0; border-bottom: 1px solid var(--color-border); }
    dt { color: var(--color-text-secondary); }
    dd { margin: 0; text-align: right; font-weight: 700; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; }
    button { min-height: 46px; padding: 12px 18px; border: 0; border-radius: 14px; font-weight: 800; cursor: pointer; }
    button:disabled { cursor: not-allowed; opacity: .45; }
    .primary { margin-left: auto; background: var(--color-green); color: #04120a; }
    .secondary { background: var(--color-card-secondary); color: var(--color-text); }
    .notice, .error { margin: 0; padding: 12px 14px; border-radius: 14px; background: rgb(255 159 67 / .12); color: var(--color-orange); line-height: 1.45; }
    .error { background: rgb(255 77 109 / .12); color: var(--color-red); }
    small { font-weight: 400; }
  `,
})
export class OnboardingPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(OnboardingApiService);
  private readonly state = inject(OnboardingStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly step = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly apiUnavailable = this.route.snapshot.queryParamMap.has('apiUnavailable');
  protected readonly stepLabels = ['Perfil', 'Ingreso', 'Presupuesto', 'Confirmación'];
  protected readonly frequencyOptions: { value: IncomeFrequency; label: string }[] = [
    { value: 'daily', label: 'Diario' }, { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quincenal' }, { value: 'monthly', label: 'Mensual' },
    { value: 'irregular', label: 'Irregular' },
  ];
  protected readonly budgetOptions: { value: BudgetMode; label: string; copy: string }[] = [
    { value: 'adjusted', label: 'Ajustado', copy: 'Para cuidar cada peso.' },
    { value: 'flexible', label: 'Flexible', copy: 'Para tener margen sin presionarte tanto.' },
    { value: 'debt_aggressive', label: 'Pagar deuda', copy: 'Para priorizar liquidar deudas.' },
    { value: 'saving_aggressive', label: 'Ahorrar', copy: 'Para apartar dinero primero.' },
  ];
  readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(80)]],
    currency: ['MXN', Validators.required],
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    frequency: this.fb.nonNullable.control<IncomeFrequency>('biweekly', Validators.required),
    nextPaymentDate: [''], isFixed: [true],
    budgetMode: this.fb.nonNullable.control<BudgetMode>('adjusted', Validators.required),
  });
  protected currentStepValid() {
    switch (this.step()) {
      case 0: return this.form.controls.displayName.valid && this.form.controls.currency.valid;
      case 1: return this.form.controls.amount.valid && this.form.controls.frequency.valid;
      case 2: return this.form.controls.budgetMode.valid;
      default: return this.form.valid;
    }
  }

  protected frequencyLabel() { return this.frequencyOptions.find(({ value }) => value === this.form.controls.frequency.value)?.label ?? ''; }
  protected budgetLabel() { return this.budgetOptions.find(({ value }) => value === this.form.controls.budgetMode.value)?.label ?? ''; }
  protected next() { if (this.currentStepValid()) this.step.update((step) => Math.min(3, step + 1)); }
  protected back() { this.step.update((step) => Math.max(0, step - 1)); }

  protected submit() {
    if (this.form.invalid || this.loading()) return;
    const value = this.form.getRawValue();
    const payload: CompleteOnboardingPayload = {
      profile: { displayName: value.displayName.trim(), currency: value.currency, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      income: { name: 'Ingreso principal', amount: value.amount!, frequency: value.frequency, nextPaymentDate: value.nextPaymentDate || null, isFixed: value.isFixed },
      settings: { budgetMode: value.budgetMode },
    };
    this.loading.set(true); this.error.set('');
    this.api.complete(payload).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => { this.state.markCompleted(payload); void this.router.navigateByUrl('/'); },
      error: () => this.error.set('No se pudo guardar tu configuración. Tus datos siguen aquí; intenta de nuevo.'),
    });
  }
}
