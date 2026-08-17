import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { getHeatmapValueFromDay } from './core/utils/heatmap.util';
import { HomePage } from './features/home/home-page';
import { AppCurrencyPipe } from './shared/pipes/app-currency.pipe';
import { HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { mapDashboardSummaryToHomeSummary, mapHeatmapDays } from './core/mappers/api.mapper';
import { toNumber } from './core/utils/number.util';
import { QuickCreate } from './shared/components/quick-create/quick-create';
import { OnboardingPage } from './features/onboarding/onboarding-page';
import { RecurringPaymentsApiService } from './core/services/recurring-payments-api.service';
import { QuickCreateEventsService } from './core/services/quick-create-events.service';
import { HabitsPage } from './features/habits/habits-page';
import { RoutinesApiService } from './core/services/routines-api.service';
import { RoutineSetupPage } from './features/habits/routine-setup-page';
import { ProgressApiService } from './core/services/progress-api.service';
import { ProjectsApiService } from './core/services/projects-api.service';
import { ProjectsPage } from './features/projects/projects-page';
import { AuthService } from './core/services/auth.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { firstValueFrom, of } from 'rxjs';
import { OnboardingStateService } from './core/services/onboarding-state.service';
import { priorityToClass, priorityToColor } from './core/utils/priority-color.util';
import { MoneyPage } from './features/money/money-page';
import { DebtsManager } from './features/money/setup/debts-manager';
import { API_BASE_URL } from './core/config/api.config';
import { debtPriorityLabel, debtStrategyLabel, oneDecimalPercent, roundedPercent } from './core/utils/money-display.util';

let accessToken: string | null = null;
const authStub = {
  currentUser: signal(null), loading: signal(false), isAuthenticated: signal(true),
  getAccessToken: () => Promise.resolve(accessToken), logout: () => Promise.resolve(), whenReady: () => Promise.resolve(),
};
const apiUrl = (path = '') => `${API_BASE_URL}${path}`;

describe('App', () => {
  beforeEach(async () => {
    accessToken = null;
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: authStub }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should open all six quick actions from the floating button', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const mainButton: HTMLButtonElement = fixture.nativeElement.querySelector('.main');
    const actions: HTMLDivElement = fixture.nativeElement.querySelector('.actions');

    expect(getComputedStyle(actions).pointerEvents).toBe('none');
    expect(fixture.nativeElement.querySelector('.backdrop')).toBeNull();

    mainButton.click();
    fixture.detectChanges();

    expect(mainButton.getAttribute('aria-expanded')).toBe('true');
    expect(mainButton.textContent?.trim()).toBe('×');
    expect(fixture.nativeElement.querySelectorAll('.action')).toHaveLength(6);
    expect(getComputedStyle(actions).pointerEvents).toBe('auto');

    fixture.nativeElement.querySelector('.backdrop').click();
    fixture.detectChanges();
    expect(mainButton.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.backdrop')).toBeNull();
    expect(getComputedStyle(actions).pointerEvents).toBe('none');
  });

  it('should send a valid expense through the existing money endpoint', () => {
    const fixture = TestBed.createComponent(QuickCreate);
    fixture.componentRef.setInput('action', 'expense');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(apiUrl('/money/categories')).flush({ data: [{ id: 'food', name: 'Comida', type: 'expense' }] });
    fixture.componentInstance.form.patchValue({ categoryId: 'food', amount: 95, date: '2026-06-29', note: 'Prueba desde UI', paymentMethod: 'cash' });

    fixture.componentInstance.save();

    const request = http.expectOne(apiUrl('/money/expenses'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ categoryId: 'food', amount: 95, expenseDate: '2026-06-29', note: 'Prueba desde UI', source: 'manual', paymentMethod: 'cash' });
    request.flush({ id: 'expense-1', amount: 95 });
  });

  it('should create a real income event', () => {
    const fixture = TestBed.createComponent(QuickCreate);
    fixture.componentRef.setInput('action', 'income');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(apiUrl('/income/sources')).flush([]);
    fixture.componentInstance.form.patchValue({ amount: 4730, date: '2026-07-15', type: 'regular', note: 'Quincena' });

    fixture.componentInstance.save();

    const request = http.expectOne(apiUrl('/income/events'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ sourceId: undefined, amount: 4730, incomeDate: '2026-07-15', type: 'regular', note: 'Quincena' });
    request.flush({ id: 'income-1', amount: 4730, incomeDate: '2026-07-15', type: 'regular' });
  });

  it('should create debt and saving movements through their real endpoints', () => {
    const http = TestBed.inject(HttpTestingController);
    const debtFixture = TestBed.createComponent(QuickCreate);
    debtFixture.componentRef.setInput('action', 'debt-payment');
    debtFixture.detectChanges();
    http.expectOne(apiUrl('/debts')).flush([{ id: 'debt-1', name: 'Banco', status: 'active' }]);
    debtFixture.componentInstance.form.patchValue({ targetId: 'debt-1', amount: 500, date: '2026-07-15', type: 'extra' });
    debtFixture.componentInstance.save();
    const debtRequest = http.expectOne(apiUrl('/debts/debt-1/payments'));
    expect(debtRequest.request.body).toMatchObject({ amount: 500, paymentDate: '2026-07-15', type: 'extra' });
    debtRequest.flush({ id: 'payment-1', debtId: 'debt-1', amount: 500 });

    const savingFixture = TestBed.createComponent(QuickCreate);
    savingFixture.componentRef.setInput('action', 'saving');
    savingFixture.detectChanges();
    http.expectOne(apiUrl('/savings/goals')).flush([{ id: 'goal-1', name: 'Laptop', status: 'active' }]);
    savingFixture.componentInstance.form.patchValue({ targetId: 'goal-1', amount: 300, date: '2026-07-15', type: 'deposit' });
    savingFixture.componentInstance.save();
    const savingRequest = http.expectOne(apiUrl('/savings/goals/goal-1/movements'));
    expect(savingRequest.request.body).toMatchObject({ amount: 300, movementDate: '2026-07-15', type: 'deposit' });
    savingRequest.flush({ id: 'movement-1', goalId: 'goal-1', amount: 300 });
  });

  it('should enforce the debt contract before sending and accept a valid debt', () => {
    const fixture = TestBed.createComponent(DebtsManager);
    fixture.componentRef.setInput('contextual', true);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(apiUrl('/debts')).flush([]);
    const form = fixture.componentInstance['form'];

    form.patchValue({ name: 'Tarjeta', initialAmount: 100, currentAmount: 200, minimumPayment: 0, paymentDay: 32 });
    fixture.componentInstance['save']();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('El monto actual no puede ser mayor que el monto inicial.');
    expect(fixture.nativeElement.textContent).toContain('El pago mínimo debe ser mayor que 0.');
    expect(fixture.nativeElement.textContent).toContain('El día de pago debe estar entre 1 y 31.');
    expect(form.controls.paymentDay.hasError('max')).toBe(true);
    http.expectNone(apiUrl('/debts'));

    form.patchValue({ currentAmount: 50, minimumPayment: 10, paymentDay: 0 });
    fixture.componentInstance['save']();
    expect(form.controls.paymentDay.hasError('min')).toBe(true);
    http.expectNone(apiUrl('/debts'));

    form.patchValue({ name: 'Tarjeta', initialAmount: 10000, currentAmount: 8500, minimumPayment: 500, paymentDay: 15, strategy: 'light', priority: 'high' });
    fixture.componentInstance['save']();
    const request = http.expectOne(apiUrl('/debts'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({ initialAmount: 10000, currentAmount: 8500, minimumPayment: 500, paymentDay: 15, strategy: 'light', priority: 'high' });
    request.flush({ id: 'debt-1', name: 'Tarjeta' });
    http.expectNone(apiUrl('/debts'));
  });

  it('should translate known debt validation responses from the backend', () => {
    const fixture = TestBed.createComponent(DebtsManager);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(apiUrl('/debts')).flush([]);
    fixture.componentInstance['form'].patchValue({ name: 'Tarjeta', initialAmount: 100, currentAmount: 50, minimumPayment: 10, paymentDay: 15 });
    fixture.componentInstance['save']();
    http.expectOne(apiUrl('/debts')).flush({ message: 'currentAmount must not be greater than initialAmount' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('El monto actual no puede ser mayor que el monto inicial.');
  });

  it('should load expense categories once on each QuickCreate opening', () => {
    const http = TestBed.inject(HttpTestingController);
    for (let opening = 0; opening < 5; opening++) {
      const fixture = TestBed.createComponent(QuickCreate);
      fixture.componentRef.setInput('action', 'expense');
      fixture.detectChanges();
      http.expectOne(apiUrl('/money/categories')).flush([{ id: `food-${opening}`, name: 'Comida', type: 'expense', isActive: true }]);
      fixture.detectChanges();
      expect(fixture.componentInstance.loadingOptions()).toBe(false);
      expect(fixture.componentInstance.categories()).toHaveLength(1);
      http.expectNone(apiUrl('/money/categories'));
      fixture.destroy();
    }
  });

  it('should refresh Home when money changes', () => {
    TestBed.createComponent(HomePage);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(apiUrl('/dashboard/summary')).flush({ budgetRemaining: 700 });
    http.expectOne(apiUrl('/routines/summary')).flush({ today: { total: 0, done: 0, pending: 0, completionPercent: 0 }, week: { activeDays: 0, completedDays: 0, completionPercent: 0 }, streak: { current: 0, best: 0 } });

    TestBed.inject(QuickCreateEventsService).notifyMoneyChanged('income');

    http.expectOne(apiUrl('/dashboard/summary')).flush({ budgetRemaining: 700, availableToday: 4730 });
  });

  it('should toggle a routine item and refresh today', () => {
    const fixture = TestBed.createComponent(HabitsPage);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const pending = { routineId: 'routine-1', routineName: 'Entre semana', itemId: 'gym', title: 'Gym', priority: 'medium', isRequired: true, status: 'pending', logId: null };
    const summary = { today: { total: 1, done: 0, pending: 1, completionPercent: 0 }, week: { activeDays: 1, completedDays: 0, completionPercent: 0 }, streak: { current: 0, best: 0 } };
    http.expectOne(apiUrl('/routines/today')).flush({ date: '2026-06-30', dayOfWeek: 2, items: [pending], summary: { total: 1, done: 0, pending: 1, skipped: 0, missed: 0, completionPercent: 0 } });
    http.expectOne(apiUrl('/routines/summary')).flush(summary);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.routine-toggle').click();

    const log = http.expectOne(apiUrl('/routines/logs'));
    expect(log.request.body).toMatchObject({ routineId: 'routine-1', routineItemId: 'gym', logDate: '2026-06-30', status: 'done' });
    log.flush({ id: 'log-1' });
    http.expectOne(apiUrl('/routines/today')).flush({ date: '2026-06-30', dayOfWeek: 2, items: [{ ...pending, status: 'done', logId: 'log-1' }], summary: { total: 1, done: 1, pending: 0, skipped: 0, missed: 0, completionPercent: 100 } });
    http.expectOne(apiUrl('/routines/summary')).flush({ ...summary, today: { total: 1, done: 1, pending: 0, completionPercent: 100 } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.routine-toggle').classList.contains('done')).toBe(true);
  });

  it('should expose routine history days for Progress', () => {
    const api = TestBed.inject(RoutinesApiService);
    const http = TestBed.inject(HttpTestingController);
    let days = 0;
    api.getHistory({ startDate: '2026-06-23', endDate: '2026-06-30' }).subscribe((history) => days = history.length);

    http.expectOne((request) => request.url === apiUrl('/routines/history') && request.params.get('startDate') === '2026-06-23').flush({ startDate: '2026-06-23', endDate: '2026-06-30', days: [{ date: '2026-06-30', total: 3, done: 1, skipped: 0, missed: 0, completionPercent: 33 }] });
    expect(days).toBe(1);
  });

  it('should create a routine and add its first activity from setup', () => {
    const fixture = TestBed.createComponent(RoutineSetupPage);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(apiUrl('/routines')).flush([]);
    fixture.componentInstance['routineForm'].patchValue({ name: 'Rutina entre semana', daysOfWeek: [1, 2, 3, 4, 5] });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form button[type="submit"]').click();
    const routineRequest = http.expectOne(apiUrl('/routines'));
    expect(routineRequest.request.body).toMatchObject({ name: 'Rutina entre semana', daysOfWeek: [1, 2, 3, 4, 5] });
    const routine = { id: 'routine-1', name: 'Rutina entre semana', status: 'active', priority: 'medium', itemsCount: 0 };
    routineRequest.flush(routine);
    http.expectOne(apiUrl('/routines')).flush([routine]);
    fixture.detectChanges();

    const activities = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((button) => button.textContent?.includes('Actividades'))!;
    activities.click();
    http.expectOne(apiUrl('/routines/routine-1/items')).flush([]);
    fixture.componentInstance['itemForm'].patchValue({ title: 'Gym' });
    fixture.detectChanges();
    fixture.nativeElement.querySelectorAll('form')[1].querySelector('button[type="submit"]').click();
    const itemRequest = http.expectOne(apiUrl('/routines/routine-1/items'));
    expect(itemRequest.request.body).toMatchObject({ title: 'Gym', isRequired: true });
    itemRequest.flush({ id: 'gym', routineId: 'routine-1', title: 'Gym', priority: 'medium', isRequired: true });
    http.expectOne(apiUrl('/routines/routine-1/items')).flush([]);
    http.expectOne(apiUrl('/routines')).flush([routine]);
  });

  it('should prepare 84 valid heatmap days', () => {
    const fixture = TestBed.createComponent(HomePage);
    const heatmap = fixture.componentInstance.homeSummary.heatmap;

    expect(heatmap).toHaveLength(84);
    expect(heatmap.every(({ value }) => value >= 0 && value <= 4)).toBe(true);
    expect(heatmap.every(({ value }) => value === 0)).toBe(true);
  });

  it('should require profile and positive income before completing onboarding', () => {
    const fixture = TestBed.createComponent(OnboardingPage);
    fixture.detectChanges();
    const next: HTMLButtonElement = fixture.nativeElement.querySelector('.primary');

    expect(next.disabled).toBe(true);
    fixture.componentInstance.form.patchValue({ displayName: 'Humberto', amount: 4730 });
    fixture.detectChanges();
    expect(next.disabled).toBe(false);
  });

  it('should submit onboarding to the Phase 1 endpoint', () => {
    const fixture = TestBed.createComponent(OnboardingPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentInstance.form.patchValue({
      displayName: 'Humberto', amount: 4730, frequency: 'biweekly',
      nextPaymentDate: '2026-07-15', budgetMode: 'adjusted',
    });
    fixture.detectChanges();

    for (let step = 0; step < 3; step++) {
      fixture.nativeElement.querySelector('.primary').click();
      fixture.detectChanges();
    }
    fixture.nativeElement.querySelector('.primary').click();

    const request = http.expectOne(apiUrl('/onboarding/complete'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body.income).toMatchObject({ amount: 4730, frequency: 'biweekly', nextPaymentDate: '2026-07-15' });
    request.flush({});
  });

  it('should create recurring payments through the Phase 2 endpoint', () => {
    const api = TestBed.inject(RecurringPaymentsApiService);
    const http = TestBed.inject(HttpTestingController);
    api.createRecurringPayment({ name: 'Gym', amount: 450, frequency: 'monthly', dueDay: 19, isFixed: true }).subscribe();

    const request = http.expectOne(apiUrl('/recurring-payments'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({ name: 'Gym', amount: 450, dueDay: 19 });
    request.flush({ id: 'gym', name: 'Gym', amount: 450, frequency: 'monthly', isFixed: true, isActive: true });
  });

  it('should render money tabs and open their contextual actions without setup links', () => {
    const fixture = TestBed.createComponent(MoneyPage);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(apiUrl('/money/categories')).flush([]);
    http.expectOne(apiUrl('/money/expenses')).flush([]);
    http.expectOne(apiUrl('/budgets/current')).flush({ current: null, limits: [], summary: null });
    http.expectOne(apiUrl('/debts')).flush([{ id: 'debt-1', name: 'Tarjeta', initialAmount: 1000, currentAmount: 600, minimumPayment: 100, progressPercent: 19.047619047619047, strategy: 'aggressive', priority: 'high', status: 'active' }]);
    http.expectOne(apiUrl('/savings/goals')).flush([{ id: 'goal-1', name: 'Viaje', currentAmount: 300, targetAmount: 1000, status: 'active' }]);
    http.expectOne(apiUrl('/settings')).flush({});
    http.expectOne(apiUrl('/income/sources')).flush([]);
    http.expectOne(apiUrl('/recurring-payments')).flush([]);

    fixture.componentInstance['activeTab'].set('debt');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tarjeta');
    expect(fixture.nativeElement.textContent).toContain('Agresiva');
    expect(fixture.nativeElement.textContent).toContain('19%');
    expect(fixture.nativeElement.textContent).not.toContain('19.047619047619047%');
    expect(parseFloat(fixture.nativeElement.querySelector('.debt-card .progress-fill').style.width)).toBeCloseTo(19.047619047619047);
    const button = (label: string) => Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((item) => item.textContent?.trim() === label)!;
    button('＋ Agregar').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-debts-manager')).not.toBeNull();
    http.expectOne(apiUrl('/debts')).flush([]);
    fixture.componentInstance['modal'].set(null);

    fixture.componentInstance['activeTab'].set('saving');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Viaje');
    button('＋ Agregar').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-savings-manager')).not.toBeNull();
    http.expectOne(apiUrl('/savings/goals')).flush([]);
    fixture.componentInstance['modal'].set(null);

    fixture.componentInstance['activeTab'].set('budget');
    fixture.detectChanges();
    button('Registrar gasto').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-quick-create')).not.toBeNull();
    http.expectOne(apiUrl('/money/categories')).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-quick-create a[href="/money/setup"]')).toBeNull();
    fixture.componentInstance['modal'].set(null);
    fixture.detectChanges();
    button('Administrar categorías').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-category-manager')).not.toBeNull();
    http.expectOne(apiUrl('/money/categories')).flush([]);
    fixture.componentInstance['modal'].set(null);
    fixture.detectChanges();
    button('Editar presupuesto').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-budget-manager')).not.toBeNull();
    http.expectOne((request) => request.url === apiUrl('/money/categories') && request.params.get('type') === 'expense').flush([]);
    http.expectOne(apiUrl('/budgets/current')).flush({ current: null, limits: [], summary: null });
    expect(fixture.nativeElement.querySelector('a[href="/money/setup"]')).toBeNull();
  });

  it('should format currency without MX prefix', () => {
    const pipe = new AppCurrencyPipe();

    expect(pipe.transform(126)).toBe('$126');
    expect(pipe.transform(2372.85)).toBe('$2,372.85');
    expect(pipe.transform(undefined)).toBe('$0');
  });

  it('should label debt values and round only their displayed percentage', () => {
    expect(debtStrategyLabel('bank_plan')).toBe('Plan bancario');
    expect(debtStrategyLabel('aggressive')).toBe('Agresiva');
    expect(debtPriorityLabel('high')).toBe('Alta');
    expect(roundedPercent(19.047619047619047)).toBe(19);
    expect(roundedPercent(99.6)).toBe(100);
    expect(oneDecimalPercent(19.047)).toBe(19);
    expect(oneDecimalPercent(19.06)).toBe(19.1);
  });

  it('should derive heatmap status from daily signals', () => {
    const day = getHeatmapValueFromDay({
      id: 'demo',
      loggedExpense: true,
      withinDailyLimit: true,
      habitCompletionRate: 80,
      completedFinancialHabit: true,
      savedOrPaidDebt: false,
    });

    expect(day.score).toBe(4);
    expect(day.value).toBe(4);
    expect(day.status).toBe('excellent');
  });

  it('should normalize API numbers and pad heatmap days', () => {
    const heatmap = mapHeatmapDays([{ id: 'one', value: '9' }], 2);

    expect(toNumber('2372.85')).toBe(2372.85);
    expect(toNumber('invalid')).toBe(0);
    expect(heatmap.map(({ value }) => value)).toEqual([4, 0]);
  });

  it('should request and normalize real progress heatmap data', () => {
    const api = TestBed.inject(ProgressApiService);
    const http = TestBed.inject(HttpTestingController);
    let result = { activeDays: 0, filter: '' };
    api.getHeatmap('routine', 2026).subscribe((response) => result = { activeDays: response.summary.activeDays, filter: response.filter });

    http.expectOne((request) => request.url === apiUrl('/progress/heatmap') && request.params.get('filter') === 'habits' && request.params.get('year') === '2026').flush({
      filter: 'habits', year: 2026, items: [{ progressDate: '2026-07-01T00:00:00.000Z', value: 75, level: 3, status: 'good' }],
      summary: { average: 75, activeDays: 1, excellentDays: 0, currentStreak: 1 },
    });

    expect(result).toEqual({ activeDays: 1, filter: 'routine' });
  });

  it('should derive category color and badge from priority', () => {
    expect(priorityToColor('high')).toBe('#ff4d6d');
    expect(priorityToClass('essential')).toBe('status-badge status-badge--purple');
  });

  it('should map the real dashboard contract as configured money', () => {
    const summary = mapDashboardSummaryToHomeSummary({
      availableToday: 1397.15, periodIncome: 4730, periodSpent: 0, budgetRemaining: 700,
      currentMonthExpenses: 0, currentWeekExpenses: 2295, totalDebt: 10015,
      activeDebts: [{ id: 'debt-1', name: 'Deuda bancaria', initialAmount: 10015, currentAmount: 10015, minimumPayment: 2372.85, nextPaymentDate: '2026-07-15' }],
      savingsCurrent: 800,
      activeSavingsGoals: [{ id: 'goal-1', name: 'Laptop', targetAmount: 15000, currentAmount: 500 }],
    });

    expect(summary.weeklyLimit).toBe(700);
    expect(summary.debtLeft).toBe(10015);
    expect(summary.debtLabel).toBe('Deuda bancaria');
    expect(summary.nextDebtPayment).toBe(2372.85);
    expect(summary.saved).toBe(800);
  });

  it('should keep a real empty projects response distinct from an API error', () => {
    const fixture = TestBed.createComponent(ProjectsPage);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(apiUrl('/projects')).flush([]);
    http.expectOne(apiUrl('/projects/summary')).flush({ total: 0, active: 0, planned: 0, paused: 0, completed: 0, cancelled: 0, archived: 0, nearCompletion: 0, upcomingTasks: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aún no tienes proyectos.');
    expect(fixture.nativeElement.textContent).not.toContain('No pudimos cargar tus proyectos.');
  });

  it('should update tasks through the Phase 6 endpoint', () => {
    const api = TestBed.inject(ProjectsApiService);
    const http = TestBed.inject(HttpTestingController);
    api.updateProjectTask('task-1', { status: 'completed' }).subscribe();
    const request = http.expectOne(apiUrl('/projects/tasks/task-1'));
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'completed' });
    request.flush({ id: 'task-1', projectId: 'project-1', title: 'Detalle', priority: 'high', status: 'completed' });
  });

  it('should add the session token only to backend requests', async () => {
    accessToken = 'access-token';
    let backendRequest: HttpRequest<unknown> | undefined;
    let externalRequest: HttpRequest<unknown> | undefined;
    await firstValueFrom(TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('GET', apiUrl('/projects')), (request) => { backendRequest = request; return of(new HttpResponse()); })));
    await firstValueFrom(TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('GET', 'https://example.com'), (request) => { externalRequest = request; return of(new HttpResponse()); })));
    expect(backendRequest?.headers.get('Authorization')).toBe('Bearer access-token');
    expect(externalRequest?.headers.has('Authorization')).toBe(false);
  });

  it('should reload onboarding state when the authenticated user changes', () => {
    const state = TestBed.inject(OnboardingStateService);
    const http = TestBed.inject(HttpTestingController);
    state.load('user-1').subscribe();
    http.expectOne(apiUrl('/onboarding/status')).flush({ completed: true, profile: null, settings: null, incomeSources: [] });
    state.load('user-2').subscribe();
    http.expectOne(apiUrl('/onboarding/status')).flush({ completed: false, profile: null, settings: null, incomeSources: [] });
    expect(state.status()?.completed).toBe(false);
  });
});
