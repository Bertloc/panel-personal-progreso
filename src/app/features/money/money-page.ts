import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';
import { MoneyCategoryStatus } from '../../core/models/money.model';
import { DebtApi } from '../../core/models/debts.model';
import { SavingsGoalApi } from '../../core/models/savings.model';
import { MONEY_FALLBACK } from '../../core/fallbacks/money.fallback';
import { MoneyApiService } from '../../core/services/money-api.service';
import { BudgetsApiService } from '../../core/services/budgets-api.service';
import { DebtsApiService } from '../../core/services/debts-api.service';
import { SavingsApiService } from '../../core/services/savings-api.service';
import { SettingsApiService } from '../../core/services/settings-api.service';
import { QuickCreateEventsService } from '../../core/services/quick-create-events.service';
import { IncomeApiService } from '../../core/services/income-api.service';
import { RecurringPaymentsApiService } from '../../core/services/recurring-payments-api.service';
import { debtStrategyLabel, oneDecimalPercent, roundedPercent } from '../../core/utils/money-display.util';
import { ActionModal } from '../../shared/components/action-modal/action-modal';
import { QuickCreate } from '../../shared/components/quick-create/quick-create';
import { BudgetManager } from './setup/budget-manager';
import { CategoryManager } from './setup/category-manager';
import { DebtsManager } from './setup/debts-manager';
import { RecurringPaymentsManager } from './setup/recurring-payments-manager';
import { SavingsManager } from './setup/savings-manager';
import { mapMoneyView } from '../../core/mappers/api.mapper';
import { catchError, finalize, forkJoin, map, of, tap } from 'rxjs';

@Component({
  selector: 'app-money-page',
  imports: [ActionModal, AppCurrencyPipe, BudgetManager, CategoryManager, DebtsManager, QuickCreate, RecurringPaymentsManager, RouterLink, SavingsManager],
  template: `
    <div class="page-stack">
      <header class="page-header">
        <p class="page-eyebrow">Tu dinero</p>
        <h1 class="page-title">Dinero</h1>
        <p class="page-copy">Presupuesto, deuda y metas en un solo lugar.</p>
      </header>

      @if (apiError()) {
        <p class="api-error" role="status">No pudimos cargar tus datos de dinero. Intenta de nuevo más tarde.</p>
      }

      @if (loading()) {
        <section class="surface-card loading-state" role="status">Cargando tus datos de dinero…</section>
      } @else {
      <div class="money-data" [class.money-data--hidden]="apiError()">
      <section class="pill-row">
        @for (tab of tabs; track tab.id) {
          <button class="pill" type="button" [class.pill--active]="tab.id === activeTab()" [attr.aria-pressed]="tab.id === activeTab()" (click)="activeTab.set(tab.id)">
            {{ tab.label }}
          </button>
        }
      </section>

      @if (activeTab() === 'budget') {
      @if (paycheck.income > 0) {
      <section class="surface-card money-hero">
        <p class="card-label">Libre real estimado</p>
        <strong class="hero-amount">{{ freeEstimate | appCurrency }}</strong>
        <p class="hero-note">Después de apartar pagos fijos y necesidades básicas.</p>

        <div class="summary-grid">
          <div>
            <p class="card-meta">Ingreso configurado</p>
            <strong>{{ paycheck.income | appCurrency }}</strong>
          </div>
          <div>
            <p class="card-meta">Presupuesto asignado</p>
            <strong>{{ budgetedTotal | appCurrency }}</strong>
          </div>
        </div>

        <div class="progress-track progress-track--large" aria-hidden="true">
          <span class="progress-fill progress-fill--green" [style.width.%]="reservedPercent"></span>
        </div>

      </section>
      } @else {
        <section class="surface-card empty-state">
          <strong>Aún no has configurado tus ingresos.</strong>
          <a class="card-link" routerLink="/onboarding">Configurar ahora</a>
        </section>
      }

      <section class="surface-card compact-card">
        <div class="card-head"><h2 class="section-card-title">Próximos pagos</h2><button class="card-link button-link" type="button" (click)="modal.set('payment')">Agregar</button></div>

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
          } @empty {
            <p class="section-card-copy">Aún no has definido próximos pagos.</p>
            <button class="card-link button-link" type="button" (click)="modal.set('payment')">Agregar pago recurrente</button>
          }
        </div>
      </section>

      <section class="surface-card compact-card">
        <div class="card-head">
          <h2 class="section-card-title">Presupuesto por categoría</h2>
          <div class="context-actions">
            <button class="card-link button-link" type="button" (click)="modal.set('category')">Administrar categorías</button>
            <button class="card-link button-link" type="button" (click)="modal.set('budget')">Editar presupuesto</button>
          </div>
        </div>

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
          } @empty {
            <p class="section-card-copy">Aún no has definido presupuesto por categoría.</p>
            <button class="card-link button-link" type="button" (click)="modal.set('category')">Agregar categoría</button>
            <button class="card-link button-link" type="button" (click)="modal.set('budget')">Crear presupuesto</button>
          }
        </div>
      </section>

      @if (debtInfo.left > 0) {
      <section class="surface-card compact-card">
        <div class="card-head">
          <h2 class="section-card-title">{{ debtInfo.name || 'Deuda' }}</h2>
          <span class="status-badge status-badge--orange">{{ roundedPercent(debtInfo.progress) }}%</span>
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

      </section>
      } @else {
        <section class="surface-card empty-state">
          <h2 class="section-card-title">Deudas</h2>
          <p class="section-card-copy">Aún no tienes deudas registradas.</p>
          <button class="card-link button-link" type="button" (click)="openDebt()">Agregar deuda</button>
        </section>
      }

      <section class="surface-card compact-card">
        <div class="card-head"><h2 class="section-card-title">Gastos recientes</h2><button class="card-link button-link" type="button" (click)="modal.set('expense')">Registrar gasto</button></div>

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
        </div>

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
          } @empty {
            <p class="section-card-copy">Aún no tienes metas de ahorro.</p>
            <button class="card-link button-link" type="button" (click)="modal.set('saving')">Crear meta de ahorro</button>
          }
        </div>
      </section>
      } @else if (activeTab() === 'debt') {
        @if (debts().length) {
          <section class="surface-card debt-hero">
            <p class="card-label">Deuda total</p>
            <strong class="hero-amount hero-amount--white">{{ debtTotal() | appCurrency }}</strong>
            <p class="hero-note">Ya pagaste {{ debtPaid() | appCurrency }} de {{ debtOriginal() | appCurrency }} originales.</p>
            <div class="progress-track"><span class="progress-fill progress-fill--purple" [style.width.%]="debtProgress()"></span></div>
            <div class="summary-grid debt-summary"><div><p class="card-meta">Pago mínimo mensual</p><strong>{{ debtMinimum() | appCurrency }}</strong></div><div><p class="card-meta">Progreso liquidación</p><strong class="value-green">{{ roundedPercent(debtProgress()) }}%</strong></div></div>
          </section>
          <section class="section-block">
            <div class="section-heading"><h2>Tus deudas</h2><button class="card-link button-link" type="button" (click)="openDebt()">＋ Agregar</button></div>
            @for (debt of debts(); track debt.id) {
              <article class="surface-card debt-card">
                <div class="split-line"><div class="debt-name"><i [class]="'debt-dot debt-dot--' + debt.priority"></i><div><strong>{{ debt.name || 'Deuda' }}</strong><p class="card-meta">{{ debtStrategyLabel(debt.strategy) }}</p></div></div><div class="debt-card-actions">@if (debtApr(debt); as apr) { <span [class]="debtAprClass(apr)">{{ oneDecimalPercent(apr) }}% APR</span> }<button class="card-link button-link" type="button" (click)="openDebt(debt)">Editar</button></div></div>
                <div class="split-line debt-values"><div><p class="card-meta">Saldo</p><strong>{{ debtBalance(debt) | appCurrency }}</strong></div><div class="align-end"><p class="card-meta">Pago mín. <b>{{ debtMinimumOf(debt) | appCurrency }}</b></p><p class="card-meta">{{ debtDue(debt) }}</p></div></div>
                <div class="split-line payoff"><span>Liquidado</span><strong>{{ roundedPercent(debtProgressOf(debt)) }}%</strong></div>
                <div class="progress-track"><span [class]="debtProgressClass(debt.priority)" [style.width.%]="debtProgressOf(debt)"></span></div>
              </article>
            }
          </section>
        } @else {
          <section class="surface-card empty-state"><h2 class="section-card-title">Sin deudas registradas</h2><p class="section-card-copy">Cuando agregues una deuda verás aquí su avance de liquidación.</p><button class="card-link button-link" type="button" (click)="openDebt()">Agregar deuda</button></section>
        }
      } @else {
        @if (goals().length) {
          <section class="surface-card savings-hero">
            <p class="card-label">Ahorro acumulado</p>
            <strong class="hero-amount">{{ savingsCurrent() | appCurrency }}</strong>
            <p class="hero-note">Meta combinada de {{ savingsTarget() | appCurrency }} en todas tus metas.</p>
            <div class="progress-track"><span class="progress-fill progress-fill--green" [style.width.%]="savingsProgress()"></span></div>
            <div class="summary-grid debt-summary"><div><p class="card-meta">Aporte mensual</p><strong>{{ savingsMonthly() ? (savingsMonthly() | appCurrency) : '—' }}</strong></div><div><p class="card-meta">Avance total</p><strong class="value-green">{{ roundedPercent(savingsProgress()) }}%</strong></div></div>
          </section>
          <section class="section-block">
            <div class="section-heading"><h2>Metas de ahorro</h2><button class="card-link button-link" type="button" (click)="modal.set('saving')">＋ Agregar</button></div>
            @for (goal of goals(); track goal.id) {
              <article class="surface-card goal-card">
                <div class="split-line"><div><strong>{{ goal.name }}</strong>@if (goal.targetDate) { <p class="card-meta">Meta {{ formatDate(goal.targetDate) }}</p> }</div><span class="status-badge status-badge--purple">{{ roundedPercent(goalProgress(goal)) }}%</span></div>
                <div class="split-line goal-values"><span>{{ goalCurrent(goal) | appCurrency }} / {{ goalTarget(goal) | appCurrency }}</span>@if (goal.monthlyContribution) { <span>{{ goalMonthly(goal) | appCurrency }}/mes</span> }</div>
                <div class="progress-track"><span class="progress-fill progress-fill--purple" [style.width.%]="goalProgress(goal)"></span></div>
                <p class="card-meta">Falta <strong>{{ goalRemaining(goal) | appCurrency }}</strong></p>
              </article>
            }
          </section>
        } @else {
          <section class="surface-card empty-state"><h2 class="section-card-title">Empieza una meta de ahorro</h2><p class="section-card-copy">Tus metas y su avance aparecerán aquí.</p><button class="card-link button-link" type="button" (click)="modal.set('saving')">Crear meta</button></section>
        }
      }
      </div>
      }
    </div>

    @switch (modal()) {
      @case ('payment') { <app-action-modal title="Agregar próximo pago" (close)="modal.set(null)"><app-recurring-payments-manager /></app-action-modal> }
      @case ('debt') { <app-action-modal [title]="selectedDebt() ? 'Editar deuda' : 'Agregar deuda'" (close)="closeDebt()"><app-debts-manager [contextual]="true" [initialDebt]="selectedDebt()" (saved)="closeDebt()" /></app-action-modal> }
      @case ('saving') { <app-action-modal title="Crear meta de ahorro" (close)="modal.set(null)"><app-savings-manager [contextual]="true" (saved)="modal.set(null)" /></app-action-modal> }
      @case ('expense') { <app-quick-create action="expense" [contextualCategories]="true" (close)="modal.set(null)" (created)="modal.set(null)" (manageCategories)="modal.set('category')" /> }
      @case ('category') { <app-action-modal title="Administrar categorías" (close)="modal.set(null)"><app-category-manager [contextual]="true" (saved)="modal.set(null)" /></app-action-modal> }
      @case ('budget') { <app-action-modal title="Editar presupuesto" (close)="modal.set(null)"><app-budget-manager [contextual]="true" (saved)="modal.set(null)" /></app-action-modal> }
    }
  `,
  styles: `
    .money-hero {
      background:
        radial-gradient(circle at top right, rgb(74 222 128 / 0.18), transparent 38%),
        linear-gradient(180deg, rgb(18 36 24 / 0.96), rgb(18 21 29 / 1));
      border-color: rgb(74 222 128 / 0.2);
    }

    .money-data { display: contents; }
    .money-data--hidden { display: none; }
    .loading-state { color: var(--color-text-secondary); text-align: center; }
    .button-link { border: 0; background: transparent; cursor: pointer; }
    .context-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px 14px; }
    .pill-row { margin-top: 4px; }

    .api-error,
    .empty-state {
      margin: 0;
      padding: 14px;
      border-radius: 14px;
    }

    .api-error {
      background: rgb(255 77 109 / 0.12);
      color: var(--color-red);
    }

    .empty-state {
      display: grid;
      gap: 10px;
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
    .hero-amount--white { color: var(--color-text); }
    .value-green { color: var(--color-green); }

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
    .debt-hero, .savings-hero { display: grid; gap: 14px; border-color: rgb(110 112 247 / .28); background: radial-gradient(circle at top right, rgb(110 112 247 / .12), transparent 45%), var(--color-card); }
    .savings-hero { border-color: rgb(40 215 154 / .24); background: radial-gradient(circle at top right, rgb(40 215 154 / .12), transparent 45%), var(--color-card); }
    .debt-summary { margin: 0; }
    .debt-summary > :last-child { text-align: right; }
    .section-block { display: grid; gap: 12px; }
    .section-heading { display: flex; align-items: center; justify-content: space-between; }
    .section-heading h2 { margin: 0; font-size: 1.15rem; }
    .section-heading .button-link { color: var(--color-green); }
    .debt-card, .goal-card { display: grid; gap: 14px; padding: 18px; }
    .debt-name { display: flex; align-items: center; gap: 10px; }
    .debt-card-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px 12px; }
    .debt-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--color-orange); }
    .debt-dot--urgent, .debt-dot--high { background: var(--color-red); }
    .debt-dot--low { background: var(--color-purple); }
    .debt-values strong { display: block; margin-top: 3px; font-size: 1.7rem; }
    .align-end { text-align: right; }
    .align-end b { color: var(--color-orange); }
    .payoff, .goal-values { color: var(--color-text-secondary); font-size: .82rem; }
    .payoff strong { color: var(--color-text); }
    .goal-card > .card-meta strong { color: var(--color-text); }

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
  private readonly incomeApi = inject(IncomeApiService);
  private readonly recurringApi = inject(RecurringPaymentsApiService);
  private readonly quickCreateEvents = inject(QuickCreateEventsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly apiError = signal(false);
  protected readonly loading = signal(true);
  protected readonly modal = signal<'payment' | 'debt' | 'saving' | 'expense' | 'category' | 'budget' | null>(null);
  protected readonly selectedDebt = signal<DebtApi | null>(null);
  protected readonly activeTab = signal<'budget' | 'debt' | 'saving'>('budget');
  protected readonly tabs = [{ id: 'budget' as const, label: 'Presupuesto' }, { id: 'debt' as const, label: 'Deuda' }, { id: 'saving' as const, label: 'Ahorro' }];
  protected readonly debts = signal<DebtApi[]>([]);
  protected readonly goals = signal<SavingsGoalApi[]>([]);
  protected readonly debtStrategyLabel = debtStrategyLabel;
  protected readonly oneDecimalPercent = oneDecimalPercent;
  protected readonly roundedPercent = roundedPercent;
  protected get paycheck() { return this.view().paycheck; }
  protected get upcomingPayments() { return this.view().upcomingPayments; }
  protected get debtInfo() { return this.view().debtInfo; }
  protected get categories() { return this.view().categories; }
  protected get savingsGoals() { return this.view().savingsGoals; }
  protected get recentExpenses() { return this.view().recentExpenses; }

  protected openDebt(debt: DebtApi | null = null) { this.selectedDebt.set(debt); this.modal.set('debt'); }
  protected closeDebt() { this.modal.set(null); this.selectedDebt.set(null); }

  constructor() {
    this.loadMoneyView();
    this.quickCreateEvents.moneyChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadMoneyView());
  }

  private loadMoneyView(): void {
    this.loading.set(true); this.view.set(MONEY_FALLBACK);
    forkJoin({ categories: this.moneyApi.getCategories(), expenses: this.moneyApi.getExpenses(), budget: this.budgetsApi.getCurrentBudget(), debts: this.debtsApi.getDebts(), goals: this.savingsApi.getGoals(), settings: this.settingsApi.getSettings(), incomeSources: this.incomeApi.getSources(), recurringPayments: this.recurringApi.getRecurringPayments() }).pipe(
      map(({ categories, expenses, budget, debts, goals, settings, incomeSources, recurringPayments }) => ({ view: mapMoneyView(categories, expenses, budget, debts, goals, settings, incomeSources, recurringPayments), debts, goals })),
      tap(() => this.apiError.set(false)),
      catchError(() => { this.apiError.set(true); return of({ view: MONEY_FALLBACK, debts: [], goals: [] }); }),
      finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ view, debts, goals }) => { this.view.set(view); this.debts.set(debts.filter(({ status }) => status !== 'cancelled')); this.goals.set(goals.filter(({ status }) => status !== 'cancelled')); });
  }

  protected get budgetedTotal(): number { return this.categories.reduce((total, category) => total + category.limit, 0); }

  protected get freeEstimate(): number {
    return this.paycheck.income - this.budgetedTotal;
  }

  protected get reservedPercent(): number {
    return this.getProgressPercent(this.budgetedTotal, this.paycheck.income);
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

  protected readonly debtTotal = computed(() => this.debts().reduce((sum, debt) => sum + this.debtBalance(debt), 0));
  protected readonly debtOriginal = computed(() => this.debts().reduce((sum, debt) => sum + Number(debt.initialAmount ?? debt.originalAmount ?? debt.totalAmount ?? 0), 0));
  protected readonly debtPaid = computed(() => Math.max(0, this.debtOriginal() - this.debtTotal()));
  protected readonly debtMinimum = computed(() => this.debts().reduce((sum, debt) => sum + Number(debt.minimumPayment ?? debt.nextPaymentAmount ?? 0), 0));
  protected readonly debtProgress = computed(() => this.getProgressPercent(this.debtPaid(), this.debtOriginal()));
  protected readonly savingsCurrent = computed(() => this.goals().reduce((sum, goal) => sum + this.goalCurrent(goal), 0));
  protected readonly savingsTarget = computed(() => this.goals().reduce((sum, goal) => sum + this.goalTarget(goal), 0));
  protected readonly savingsMonthly = computed(() => this.goals().reduce((sum, goal) => sum + Number(goal.monthlyContribution ?? 0), 0));
  protected readonly savingsProgress = computed(() => this.getProgressPercent(this.savingsCurrent(), this.savingsTarget()));
  protected debtBalance(debt: DebtApi) { return Number(debt.currentAmount ?? debt.remainingAmount ?? debt.balance ?? 0); }
  protected debtMinimumOf(debt: DebtApi) { return Number(debt.minimumPayment ?? debt.nextPaymentAmount ?? 0); }
  protected debtProgressOf(debt: DebtApi) { const original = Number(debt.initialAmount ?? debt.originalAmount ?? debt.totalAmount ?? 0); return debt.progressPercent ?? this.getProgressPercent(original - this.debtBalance(debt), original); }
  protected debtApr(debt: DebtApi) { return Number(debt.apr ?? debt.interestRate ?? 0); }
  protected debtAprClass(apr: number) { return `status-badge status-badge--${apr >= 30 ? 'red' : apr > 0 ? 'orange' : 'green'}`; }
  protected debtProgressClass(priority?: DebtApi['priority']) { return `progress-fill progress-fill--${priority === 'urgent' || priority === 'high' ? 'red' : priority === 'low' ? 'purple' : 'orange'}`; }
  protected debtDue(debt: DebtApi) { return debt.nextPaymentDate ? `Vence ${this.formatDate(debt.nextPaymentDate)}` : debt.paymentDay ? `Vence el día ${debt.paymentDay}` : 'Sin fecha de pago'; }
  protected goalCurrent(goal: SavingsGoalApi) { return Number(goal.currentAmount ?? goal.current ?? 0); }
  protected goalTarget(goal: SavingsGoalApi) { return Number(goal.targetAmount ?? goal.target ?? 0); }
  protected goalMonthly(goal: SavingsGoalApi) { return Number(goal.monthlyContribution ?? 0); }
  protected goalProgress(goal: SavingsGoalApi) { return goal.progressPercent ?? this.getProgressPercent(this.goalCurrent(goal), this.goalTarget(goal)); }
  protected goalRemaining(goal: SavingsGoalApi) { return Math.max(0, Number(goal.remainingAmount ?? this.goalTarget(goal) - this.goalCurrent(goal))); }
  protected formatDate(value: string) { return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`)); }
}
