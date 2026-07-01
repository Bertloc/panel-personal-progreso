import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { getHeatmapValueFromDay } from './core/utils/heatmap.util';
import { HomePage } from './features/home/home-page';
import { AppCurrencyPipe } from './shared/pipes/app-currency.pipe';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { mapHeatmapDays } from './core/mappers/api.mapper';
import { toNumber } from './core/utils/number.util';
import { QuickCreate } from './shared/components/quick-create/quick-create';
import { OnboardingPage } from './features/onboarding/onboarding-page';
import { RecurringPaymentsApiService } from './core/services/recurring-payments-api.service';

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
});
