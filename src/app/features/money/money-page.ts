import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { MoneyCategoryStatus } from '../../core/models/money.model';
import { MONEY_FALLBACK } from '../../core/fallbacks/money.fallback';
import { MoneyApiService } from '../../core/services/money-api.service';
import { BudgetsApiService } from '../../core/services/budgets-api.service';
import { DebtsApiService } from '../../core/services/debts-api.service';
import { SavingsApiService } from '../../core/services/savings-api.service';
import { SettingsApiService } from '../../core/services/settings-api.service';
import { QuickCreateEventsService } from '../../core/services/quick-create-events.service';
import { mapMoneyView } from '../../core/mappers/api.mapper';
import { catchError, forkJoin, map, of } from 'rxjs';

@Component({
  selector: 'app-money-page',
  imports: [AppCurrencyPipe],
  template: `
    <div class="page-stack">
      <header class="page-header">
        <p class="page-eyebrow">Tu dinero</p>
        <h1 class="page-title">Dinero</h1>
        <p class="page-copy">Presupuesto, deuda y metas en un solo lugar.</p>
      </header>

      <section class="pill-row">
        @for (tab of tabs; track tab) {
          <button class="pill" type="button" [class.pill--active]="tab === 'Presupuesto activo'">
            {{ tab }}
          </button>
        }
      </section>

      <section class="surface-card money-hero">
        <p class="card-label">Libre real estimado</p>
        <strong class="hero-amount">{{ freeEstimate | appCurrency }}</strong>
        <p class="hero-note">Después de apartar pagos fijos y necesidades básicas.</p>

        <div class="summary-grid">
          <div>
            <p class="card-meta">Ingreso quincenal</p>
            <strong>{{ paycheck.income | appCurrency }}</strong>
          </div>
          <div>
            <p class="card-meta">Libre estimado</p>
            <strong>{{ freeEstimate | appCurrency }}</strong>
          </div>
        </div>

        <div class="money-group">
          <div class="group-head">
            <strong>Apartados fijos</strong>
            <span>{{ fixedReserved | appCurrency }}</span>
          </div>

          <div class="money-lines">
            <div class="money-line">
              <span>Deuda bancaria</span>
              <strong>{{ paycheck.debt | appCurrency }}</strong>
            </div>
            <div class="money-line">
              <span>Gym</span>
              <strong>{{ paycheck.gym | appCurrency }}</strong>
            </div>
            <div class="money-line">
              <span>Nutriólogo</span>
              <strong>{{ paycheck.nutritionist | appCurrency }}</strong>
            </div>
          </div>
        </div>

        <div class="money-group">
          <div class="group-head">
            <strong>Necesidades variables</strong>
            <span>{{ variableNeeds | appCurrency }}</span>
          </div>

          <div class="money-lines">
            <div class="money-line">
              <span>Comida semanal</span>
              <strong>{{ paycheck.foodWeekly | appCurrency }}</strong>
            </div>
            <div class="money-line">
              <span>Transporte estimado</span>
              <strong>{{ paycheck.transportPerDay | appCurrency }}/día</strong>
            </div>
          </div>
        </div>

        <div class="progress-track progress-track--large" aria-hidden="true">
          <span class="progress-fill progress-fill--green" [style.width.%]="reservedPercent"></span>
        </div>

        <p class="status-line">Ajustado pero viable</p>
      </section>

      <section class="surface-card compact-card">
        <h2 class="section-card-title">Próximos pagos</h2>

        <div class="list-card">
          @for (payment of upcomingPayments; track payment.name) {
            <div class="list-row payment-row">
              <div>
                <strong>{{ payment.name }}</strong>
                <p class="card-meta">{{ payment.dueLabel }}</p>
              </div>
              <strong class="payment-amount">
                {{ payment.amount | appCurrency }}{{ payment.suffix ?? '' }}
              </strong>
            </div>
          }
        </div>
      </section>

      <section class="surface-card compact-card">
        <h2 class="section-card-title">Presupuesto por categoría</h2>

        <div class="list-card">
          @for (category of categories; track category.name) {
            <div class="category-block">
              <div class="split-line">
                <div class="row-inline">
                  <span class="color-dot" [class]="'color-dot color-dot--' + category.tone"></span>
                  <strong>{{ category.name }}</strong>
                  <span class="status-badge" [class]="getBudgetStatusClass(category.status)">
                    {{ category.status }}
                  </span>
                </div>
                <span class="section-card-copy">
                  {{ category.used | appCurrency }} / {{ category.limit | appCurrency }}
                </span>
              </div>

              <div class="split-line split-line--compact">
                <span class="card-meta">Restante</span>
                <span class="card-meta">{{ getRemaining(category.used, category.limit) | appCurrency }}</span>
              </div>

              <div class="progress-track" aria-hidden="true">
                <span
                  class="progress-fill"
                  [class]="'progress-fill progress-fill--' + category.tone"
                  [style.width.%]="getProgressPercent(category.used, category.limit)"
                ></span>
              </div>
            </div>
          }
        </div>
      </section>

      <section class="surface-card compact-card">
        <div class="card-head">
          <h2 class="section-card-title">Deuda bancaria</h2>
          <span class="status-badge status-badge--orange">{{ debtInfo.progress }}%</span>
        </div>

        <div class="mini-grid debt-grid">
          <div>
            <p class="card-label">Deuda restante</p>
            <strong class="section-highlight">{{ debtInfo.left | appCurrency }}</strong>
          </div>
          <div>
            <p class="card-label">Próximo pago</p>
            <strong>{{ debtInfo.nextPayment | appCurrency }}</strong>
            <p class="card-meta">{{ debtInfo.date }}</p>
          </div>
        </div>

        <div class="progress-track" aria-hidden="true">
          <span class="progress-fill progress-fill--purple" [style.width.%]="debtInfo.progress"></span>
        </div>

        <div class="money-lines money-lines--compact">
          <div class="money-line">
            <span>Pago extra sugerido</span>
            <strong>{{ debtInfo.extra | appCurrency }}</strong>
          </div>
          <div class="money-line">
            <span>Plan banco</span>
            <strong>{{ debtInfo.bankPlan }}</strong>
          </div>
          <div class="money-line">
            <span>Plan agresivo</span>
            <strong>{{ debtInfo.aggressivePlan }}</strong>
          </div>
        </div>

        <p class="debt-note">Prioridad actual: bajar deuda sin romper comida/transporte.</p>
      </section>

      <section class="surface-card compact-card">
        <h2 class="section-card-title">Gastos recientes</h2>

        <div class="list-card">
          @for (expense of recentExpenses; track expense.name) {
            <div class="list-row payment-row">
              <div>
                <strong>{{ expense.name }}</strong>
                <p class="card-meta">{{ expense.day }}</p>
              </div>
              <strong>{{ expense.amount | appCurrency }}</strong>
            </div>
          }
        </div>
      </section>

      <section class="surface-card compact-card savings-card">
        <div class="card-head">
          <h2 class="section-card-title">Metas de ahorro</h2>
          <span class="status-badge status-badge--purple">En pausa</span>
        </div>

        <p class="savings-copy">En pausa mientras priorizas deuda.</p>

        <div class="list-card">
          @for (goal of savingsGoals; track goal.name) {
            <div class="category-block">
              <div class="split-line">
                <strong>{{ goal.name }}</strong>
                <span class="section-card-copy">
                  {{ goal.current | appCurrency }} / {{ goal.target | appCurrency }}
                </span>
              </div>

              <div class="progress-track progress-track--subtle" aria-hidden="true">
                <span
                  class="progress-fill"
                  [class]="'progress-fill progress-fill--' + goal.tone"
                  [style.width.%]="getProgressPercent(goal.current, goal.target)"
                ></span>
              </div>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    .money-hero {
      background:
        radial-gradient(circle at top right, rgb(74 222 128 / 0.18), transparent 38%),
        linear-gradient(180deg, rgb(18 36 24 / 0.96), rgb(18 21 29 / 1));
      border-color: rgb(74 222 128 / 0.2);
    }

    .compact-card {
      padding-block: 18px;
    }

    .hero-amount {
      display: block;
      margin: 8px 0 4px;
      font-size: clamp(2.8rem, 13vw, 4rem);
      line-height: 0.94;
      letter-spacing: -0.08em;
      color: var(--color-green);
    }

    .hero-note,
    .status-line,
    .savings-copy {
      margin: 0;
      color: var(--color-text-secondary);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 18px 0;
    }

    .summary-grid strong,
    .money-line strong {
      display: block;
      margin-top: 4px;
    }

    .money-group {
      display: grid;
      gap: 10px;
      padding-block: 12px;
      border-top: 1px solid rgb(255 255 255 / 0.06);
    }

    .group-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .group-head span {
      color: var(--color-text-secondary);
      font-weight: 700;
    }

    .money-lines {
      display: grid;
      gap: 8px;
    }

    .money-lines--compact {
      margin-top: 14px;
    }

    .money-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: var(--color-text-secondary);
    }

    .status-line {
      margin-top: 12px;
      color: var(--color-orange);
      font-weight: 700;
    }

    .payment-row {
      padding-block: 12px;
    }

    .payment-amount {
      color: var(--color-orange);
    }

    .category-block {
      display: grid;
      gap: 8px;
      padding-block: 12px;
      border-bottom: 1px solid rgb(255 255 255 / 0.05);
    }

    .category-block:first-child {
      padding-top: 0;
    }

    .category-block:last-child {
      padding-bottom: 0;
      border-bottom: 0;
    }

    .row-inline {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .split-line--compact {
      gap: 8px;
    }

    .color-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--color-green);
    }

    .color-dot--green {
      background: var(--color-green);
    }

    .color-dot--blue {
      background: var(--color-blue);
    }

    .color-dot--orange {
      background: #ffb454;
    }

    .color-dot--red {
      background: var(--color-red);
    }

    .color-dot--pink {
      background: var(--color-pink);
    }

    .color-dot--purple {
      background: #a78bfa;
    }

    .debt-grid {
      margin-bottom: 14px;
    }

    .section-highlight {
      font-size: 1.8rem;
      line-height: 1.1;
      letter-spacing: -0.04em;
    }

    .debt-note {
      margin: 14px 0 0;
      color: var(--color-text-secondary);
    }

    .savings-card .progress-track--subtle {
      height: 6px;
      background: rgb(255 255 255 / 0.05);
    }

    .savings-copy {
      margin-bottom: 12px;
    }

    @media (max-width: 380px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class MoneyPage {
  private readonly view = signal(MONEY_FALLBACK);
  private readonly moneyApi = inject(MoneyApiService);
  private readonly budgetsApi = inject(BudgetsApiService);
  private readonly debtsApi = inject(DebtsApiService);
  private readonly savingsApi = inject(SavingsApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly quickCreateEvents = inject(QuickCreateEventsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly tabs = ['Presupuesto activo', 'Deuda', 'Ahorro'];
  protected get paycheck() { return this.view().paycheck; }
  protected get upcomingPayments() { return this.view().upcomingPayments; }
  protected get debtInfo() { return this.view().debtInfo; }
  protected get categories() { return this.view().categories; }
  protected get savingsGoals() { return this.view().savingsGoals; }
  protected get recentExpenses() { return this.view().recentExpenses; }

  constructor() {
    this.loadMoneyView();
    this.quickCreateEvents.expenseCreated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadMoneyView());
  }

  private loadMoneyView(): void {
    forkJoin({ categories: this.moneyApi.getCategories(), expenses: this.moneyApi.getExpenses(), budget: this.budgetsApi.getCurrentBudget(), debts: this.debtsApi.getDebts(), goals: this.savingsApi.getGoals(), settings: this.settingsApi.getSettings() }).pipe(
      map(({ categories, expenses, budget, debts, goals, settings }) => mapMoneyView(categories, expenses, budget, debts, goals, settings)),
      catchError(() => of(MONEY_FALLBACK)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((view) => this.view.set(view));
  }

  protected get fixedReserved(): number {
    return this.paycheck.debt + this.paycheck.gym + this.paycheck.nutritionist;
  }

  protected get variableNeeds(): number {
    return this.paycheck.foodWeekly + this.paycheck.transportPerDay * this.paycheck.transportDays;
  }

  protected get freeEstimate(): number {
    return this.paycheck.income - this.fixedReserved - this.variableNeeds;
  }

  protected get reservedPercent(): number {
    return this.getProgressPercent(this.paycheck.income - this.freeEstimate, this.paycheck.income);
  }

  protected getProgressPercent(used: number, limit: number): number {
    if (limit <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((used / limit) * 100));
  }

  protected getRemaining(used: number, limit: number): number {
    return Math.max(0, limit - used);
  }

  protected getBudgetStatusClass(status: MoneyCategoryStatus): string {
    if (status === 'Excedido') {
      return 'status-badge status-badge--red';
    }

    if (status === 'Cuidado' || status === 'Pendiente' || status === 'Próximo') {
      return 'status-badge status-badge--orange';
    }

    if (status === 'Apartado' || status === 'En pausa') {
      return 'status-badge status-badge--purple';
    }

    return 'status-badge status-badge--green';
  }
}
