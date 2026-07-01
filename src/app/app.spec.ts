import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { getHeatmapValueFromDay } from './core/utils/heatmap.util';
import { HomePage } from './features/home/home-page';
import { AppCurrencyPipe } from './shared/pipes/app-currency.pipe';
import { provideHttpClient } from '@angular/common/http';
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

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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

    mainButton.click();
    fixture.detectChanges();

    expect(mainButton.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.action')).toHaveLength(6);
  });

  it('should send a valid expense through the existing money endpoint', () => {
    const fixture = TestBed.createComponent(QuickCreate);
    fixture.componentRef.setInput('action', 'expense');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:3000/api/money/categories').flush({ data: [{ id: 'food', name: 'Comida', type: 'expense' }] });
    fixture.componentInstance.form.patchValue({ categoryId: 'food', amount: 95, date: '2026-06-29', note: 'Prueba desde UI', paymentMethod: 'cash' });

    fixture.componentInstance.save();

    const request = http.expectOne('http://localhost:3000/api/money/expenses');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ categoryId: 'food', amount: 95, expenseDate: '2026-06-29', note: 'Prueba desde UI', source: 'manual', paymentMethod: 'cash' });
    request.flush({ id: 'expense-1', amount: 95 });
  });

  it('should create a real income event', () => {
    const fixture = TestBed.createComponent(QuickCreate);
    fixture.componentRef.setInput('action', 'income');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:3000/api/income/sources').flush([]);
    fixture.componentInstance.form.patchValue({ amount: 4730, date: '2026-07-15', type: 'regular', note: 'Quincena' });

    fixture.componentInstance.save();

    const request = http.expectOne('http://localhost:3000/api/income/events');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ sourceId: undefined, amount: 4730, incomeDate: '2026-07-15', type: 'regular', note: 'Quincena' });
    request.flush({ id: 'income-1', amount: 4730, incomeDate: '2026-07-15', type: 'regular' });
  });

  it('should create debt and saving movements through their real endpoints', () => {
    const http = TestBed.inject(HttpTestingController);
    const debtFixture = TestBed.createComponent(QuickCreate);
    debtFixture.componentRef.setInput('action', 'debt-payment');
    debtFixture.detectChanges();
    http.expectOne('http://localhost:3000/api/debts').flush([{ id: 'debt-1', name: 'Banco', status: 'active' }]);
    debtFixture.componentInstance.form.patchValue({ targetId: 'debt-1', amount: 500, date: '2026-07-15', type: 'extra' });
    debtFixture.componentInstance.save();
    const debtRequest = http.expectOne('http://localhost:3000/api/debts/debt-1/payments');
    expect(debtRequest.request.body).toMatchObject({ amount: 500, paymentDate: '2026-07-15', type: 'extra' });
    debtRequest.flush({ id: 'payment-1', debtId: 'debt-1', amount: 500 });

    const savingFixture = TestBed.createComponent(QuickCreate);
    savingFixture.componentRef.setInput('action', 'saving');
    savingFixture.detectChanges();
    http.expectOne('http://localhost:3000/api/savings/goals').flush([{ id: 'goal-1', name: 'Laptop', status: 'active' }]);
    savingFixture.componentInstance.form.patchValue({ targetId: 'goal-1', amount: 300, date: '2026-07-15', type: 'deposit' });
    savingFixture.componentInstance.save();
    const savingRequest = http.expectOne('http://localhost:3000/api/savings/goals/goal-1/movements');
    expect(savingRequest.request.body).toMatchObject({ amount: 300, movementDate: '2026-07-15', type: 'deposit' });
    savingRequest.flush({ id: 'movement-1', goalId: 'goal-1', amount: 300 });
  });

  it('should refresh Home when money changes', () => {
    TestBed.createComponent(HomePage);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:3000/api/dashboard/summary').flush({ budgetRemaining: 700 });
    http.expectOne('http://localhost:3000/api/routines/summary').flush({ today: { total: 0, done: 0, pending: 0, completionPercent: 0 }, week: { activeDays: 0, completedDays: 0, completionPercent: 0 }, streak: { current: 0, best: 0 } });

    TestBed.inject(QuickCreateEventsService).notifyMoneyChanged('income');

    http.expectOne('http://localhost:3000/api/dashboard/summary').flush({ budgetRemaining: 700, availableToday: 4730 });
  });

  it('should toggle a routine item and refresh today', () => {
    const fixture = TestBed.createComponent(HabitsPage);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const pending = { routineId: 'routine-1', routineName: 'Entre semana', itemId: 'gym', title: 'Gym', priority: 'medium', isRequired: true, status: 'pending', logId: null };
    const summary = { today: { total: 1, done: 0, pending: 1, completionPercent: 0 }, week: { activeDays: 1, completedDays: 0, completionPercent: 0 }, streak: { current: 0, best: 0 } };
    http.expectOne('http://localhost:3000/api/routines/today').flush({ date: '2026-06-30', dayOfWeek: 2, items: [pending], summary: { total: 1, done: 0, pending: 1, skipped: 0, missed: 0, completionPercent: 0 } });
    http.expectOne('http://localhost:3000/api/routines/summary').flush(summary);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.routine-toggle').click();

    const log = http.expectOne('http://localhost:3000/api/routines/logs');
    expect(log.request.body).toMatchObject({ routineId: 'routine-1', routineItemId: 'gym', logDate: '2026-06-30', status: 'done' });
    log.flush({ id: 'log-1' });
    http.expectOne('http://localhost:3000/api/routines/today').flush({ date: '2026-06-30', dayOfWeek: 2, items: [{ ...pending, status: 'done', logId: 'log-1' }], summary: { total: 1, done: 1, pending: 0, skipped: 0, missed: 0, completionPercent: 100 } });
    http.expectOne('http://localhost:3000/api/routines/summary').flush({ ...summary, today: { total: 1, done: 1, pending: 0, completionPercent: 100 } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.routine-toggle').classList.contains('done')).toBe(true);
  });

  it('should expose routine history days for Progress', () => {
    const api = TestBed.inject(RoutinesApiService);
    const http = TestBed.inject(HttpTestingController);
    let days = 0;
    api.getHistory({ startDate: '2026-06-23', endDate: '2026-06-30' }).subscribe((history) => days = history.length);

    http.expectOne((request) => request.url === 'http://localhost:3000/api/routines/history' && request.params.get('startDate') === '2026-06-23').flush({ startDate: '2026-06-23', endDate: '2026-06-30', days: [{ date: '2026-06-30', total: 3, done: 1, skipped: 0, missed: 0, completionPercent: 33 }] });
    expect(days).toBe(1);
  });

  it('should create a routine and add its first activity from setup', () => {
    const fixture = TestBed.createComponent(RoutineSetupPage);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:3000/api/routines').flush([]);
    fixture.componentInstance['routineForm'].patchValue({ name: 'Rutina entre semana', daysOfWeek: [1, 2, 3, 4, 5] });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form button[type="submit"]').click();
    const routineRequest = http.expectOne('http://localhost:3000/api/routines');
    expect(routineRequest.request.body).toMatchObject({ name: 'Rutina entre semana', daysOfWeek: [1, 2, 3, 4, 5] });
    const routine = { id: 'routine-1', name: 'Rutina entre semana', status: 'active', priority: 'medium', itemsCount: 0 };
    routineRequest.flush(routine);
    http.expectOne('http://localhost:3000/api/routines').flush([routine]);
    fixture.detectChanges();

    const activities = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((button) => button.textContent?.includes('Actividades'))!;
    activities.click();
    http.expectOne('http://localhost:3000/api/routines/routine-1/items').flush([]);
    fixture.componentInstance['itemForm'].patchValue({ title: 'Gym' });
    fixture.detectChanges();
    fixture.nativeElement.querySelectorAll('form')[1].querySelector('button[type="submit"]').click();
    const itemRequest = http.expectOne('http://localhost:3000/api/routines/routine-1/items');
    expect(itemRequest.request.body).toMatchObject({ title: 'Gym', isRequired: true });
    itemRequest.flush({ id: 'gym', routineId: 'routine-1', title: 'Gym', priority: 'medium', isRequired: true });
    http.expectOne('http://localhost:3000/api/routines/routine-1/items').flush([]);
    http.expectOne('http://localhost:3000/api/routines').flush([routine]);
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

    const request = http.expectOne('http://localhost:3000/api/onboarding/complete');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.income).toMatchObject({ amount: 4730, frequency: 'biweekly', nextPaymentDate: '2026-07-15' });
    request.flush({});
  });

  it('should create recurring payments through the Phase 2 endpoint', () => {
    const api = TestBed.inject(RecurringPaymentsApiService);
    const http = TestBed.inject(HttpTestingController);
    api.createRecurringPayment({ name: 'Gym', amount: 450, frequency: 'monthly', dueDay: 19, isFixed: true }).subscribe();

    const request = http.expectOne('http://localhost:3000/api/recurring-payments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({ name: 'Gym', amount: 450, dueDay: 19 });
    request.flush({ id: 'gym', name: 'Gym', amount: 450, frequency: 'monthly', isFixed: true, isActive: true });
  });

  it('should format currency without MX prefix', () => {
    const pipe = new AppCurrencyPipe();

    expect(pipe.transform(126)).toBe('$126');
    expect(pipe.transform(2372.85)).toBe('$2,372.85');
    expect(pipe.transform(undefined)).toBe('$0');
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

    http.expectOne((request) => request.url === 'http://localhost:3000/api/progress/heatmap' && request.params.get('filter') === 'routine' && request.params.get('year') === '2026').flush({
      filter: 'habits', year: 2026, items: [{ date: '2026-07-01', value: 75, level: 3, status: 'good' }],
      summary: { average: 75, activeDays: 1, excellentDays: 0, currentStreak: 1 },
    });

    expect(result).toEqual({ activeDays: 1, filter: 'routine' });
  });

  it('should map the real dashboard contract as configured money', () => {
    const summary = mapDashboardSummaryToHomeSummary({
      availableToday: 1397.15, periodIncome: 4730, periodSpent: 0, budgetRemaining: 700,
      currentMonthExpenses: 0, currentWeekExpenses: 2295, totalDebt: 10015,
      activeDebts: [{ id: 'debt-1', name: 'Deuda bancaria', initialAmount: 10015, currentAmount: 10015, minimumPayment: 2372.85, nextPaymentDate: '2026-07-15' }],
      activeSavingsGoals: [{ id: 'goal-1', name: 'Laptop', targetAmount: 15000, currentAmount: 500 }],
    });

    expect(summary.weeklyLimit).toBe(700);
    expect(summary.debtLeft).toBe(10015);
    expect(summary.debtLabel).toBe('Deuda bancaria');
    expect(summary.nextDebtPayment).toBe(2372.85);
    expect(summary.saved).toBe(500);
  });
});
