import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { getHeatmapValueFromDay } from './core/utils/heatmap.util';
import { HomePage } from './features/home/home-page';
import { AppCurrencyPipe } from './shared/pipes/app-currency.pipe';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should prepare 84 valid heatmap days', () => {
    const fixture = TestBed.createComponent(HomePage);
    const heatmap = fixture.componentInstance.homeSummary.heatmap;

    expect(heatmap).toHaveLength(84);
    expect(heatmap.every(({ value }) => value >= 0 && value <= 4)).toBe(true);
    expect(heatmap.some(({ value }) => value === 4)).toBe(true);
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
});
