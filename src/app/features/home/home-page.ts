import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, finalize, map, of, tap } from 'rxjs';
import { HOME_FALLBACK } from '../../core/fallbacks/home.fallback';
import { mapDashboardSummaryToHomeSummary } from '../../core/mappers/api.mapper';
import { HomeSummary } from '../../core/models/home-summary.model';
import { RoutineSummary } from '../../core/models/routine.model';
import { ProjectsSummary } from '../../core/models/projects.model';
import { DashboardApiService } from '../../core/services/dashboard-api.service';
import { OnboardingStateService } from '../../core/services/onboarding-state.service';
import { QuickCreateEventsService } from '../../core/services/quick-create-events.service';
import { RoutineEventsService } from '../../core/services/routine-events.service';
import { RoutinesApiService } from '../../core/services/routines-api.service';
import { ProjectsApiService } from '../../core/services/projects-api.service';
import { MoneyApiService } from '../../core/services/money-api.service';
import { FinancialGuidance, GuidanceRecommendation } from '../../core/models/financial-guidance.model';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, AppCurrencyPipe],
  template: `
    <div class="page-stack">
      <header class="page-header">
        <a class="settings-link" routerLink="/settings" aria-label="Configuración"><span aria-hidden="true">⚙</span></a>
        <p class="page-eyebrow">{{ homeSummary.date || today }}</p>
        <h1 class="page-title">Buenos días, {{ homeSummary.userName || profileName }}</h1>
        <p class="page-copy">Tu centro de control personal para hoy.</p>
      </header>

      @if (apiError()) {
        <p class="api-error" role="status">No pudimos cargar tu resumen. Tus datos guardados no se modificaron.</p>
      }

      @if (guidanceLoading()) {
        <section class="surface-card guidance-card" role="status">Calculando qué hacer ahora…</section>
      } @else if (guidanceError()) {
        <section class="surface-card guidance-card"><h2 class="section-card-title">Qué hacer ahora</h2><p class="section-card-copy">No pudimos calcular una sugerencia con tus datos actuales.</p></section>
      } @else if (primaryRecommendation(); as recommendation) {
        <section class="surface-card guidance-card">
          <p class="card-label">Qué hacer ahora</p>
          @switch (recommendation.reason) {
            @case ('commitments_exceed_income') { <h2 class="section-card-title">Revisa tus compromisos</h2><p class="section-card-copy">Tus compromisos estimados superan tu ingreso disponible por {{ recommendation.amount | appCurrency }}.</p> }
            @case ('category_near_limit') { <h2 class="section-card-title">Cuida {{ recommendation.entityName }}</h2><p class="section-card-copy">Has utilizado {{ recommendation.percent }}% de su presupuesto.</p> }
            @case ('category_exceeded') { <h2 class="section-card-title">Revisa {{ recommendation.entityName }}</h2><p class="section-card-copy">Esta categoría ya superó su presupuesto.</p> }
            @case ('daily_budget') { <h2 class="section-card-title">Mantén tu presupuesto</h2><p class="section-card-copy">Procura no superar aproximadamente {{ recommendation.amount | appCurrency }} por día durante este periodo.</p> }
            @case ('upcoming_obligations') { <h2 class="section-card-title">Reserva tus próximos pagos</h2><p class="section-card-copy">Tienes {{ recommendation.amount | appCurrency }} en compromisos próximos registrados.</p> }
            @case ('unassigned_margin') { <h2 class="section-card-title">Tienes margen sin asignar</h2><p class="section-card-copy">Después de tus compromisos tienes {{ recommendation.amount | appCurrency }} sin asignar.</p> }
            @case ('priority_debt') { <h2 class="section-card-title">Prioriza {{ recommendation.entityName }}</h2><p class="section-card-copy">Podrías aplicar hasta {{ recommendation.amount | appCurrency }} como pago adicional, sin superar su saldo.</p> }
            @case ('no_extra_margin') { <h2 class="section-card-title">Mantén el pago de {{ recommendation.entityName }}</h2><p class="section-card-copy">Ahora no hay margen estimado para recomendar un pago adicional.</p> }
            @case ('target_date') { <h2 class="section-card-title">Aparta {{ recommendation.amount | appCurrency }} para {{ recommendation.entityName }}</h2>@if (recommendation.shortfall) { <p class="section-card-copy">La meta requiere ese monto este mes, pero después de tus compromisos tienes {{ guidance()?.available | appCurrency }} disponibles.</p> } @else { <p class="section-card-copy">Para acercarte a la meta en la fecha elegida.</p> } }
            @case ('target_date_missing') { <h2 class="section-card-title">Agrega fecha a {{ recommendation.entityName }}</h2><p class="section-card-copy">Así podremos calcular cuánto apartar por periodo.</p> }
            @case ('no_active_debt') { <h2 class="section-card-title">No tienes deuda activa</h2><p class="section-card-copy">El modo Pagar deuda no tiene una deuda sobre la cual orientar una acción.</p> }
            @case ('no_active_goal') { <h2 class="section-card-title">Crea una meta de ahorro</h2><p class="section-card-copy">Agrega una meta con fecha objetivo para recibir una sugerencia.</p> }
            @default { <h2 class="section-card-title">Configura tu presupuesto</h2><p class="section-card-copy">Necesitamos un presupuesto activo para calcular un límite diario.</p> }
          }
          <p class="guidance-why">{{ guidanceExplanation() }}</p>
          <a class="card-link" [routerLink]="guidanceRoute(recommendation)" [queryParams]="guidanceQuery(recommendation)">{{ guidanceCta(recommendation) }} →</a>
        </section>
      }

      @if (loading()) {
        <section class="surface-card loading-state" role="status">Cargando tu resumen…</section>
      } @else if (financialReady) {
        <section class="surface-card hero-card">
          <div class="card-head">
            <div><p class="card-label">Este mes</p><h2 class="section-card-title">Resumen financiero</h2></div>
            <a class="card-link" routerLink="/money">Ver dinero ↗</a>
          </div>
          <div class="financial-summary">
            <div class="budget-total"><p class="card-label">Presupuesto del mes</p><strong class="hero-amount">{{ homeSummary.monthlyLimit | appCurrency }}</strong></div>
            <div><p class="card-label">Gastado este mes</p><strong>{{ homeSummary.monthlySpent | appCurrency }}</strong></div>
            <div><p class="card-label">Restante este mes</p><strong class="meta-accent">{{ monthlyRemaining | appCurrency }}</strong></div>
          </div>
          <div class="progress-track progress-track--large financial-progress" aria-hidden="true">
            <span class="progress-fill progress-fill--green" [style.width.%]="getProgressPercent(homeSummary.monthlySpent, homeSummary.monthlyLimit)"></span>
          </div>
          <p class="budget-copy">{{ homeSummary.monthlySpent | appCurrency }} de {{ homeSummary.monthlyLimit | appCurrency }} utilizados.</p>
          @if (budgetExceeded) { <p class="budget-alert" role="status">Presupuesto superado por {{ budgetOverage | appCurrency }}.</p> }
        </section>

        <section class="mini-grid">
          <article class="surface-card compact-card"><i class="metric-icon metric-icon--green">◇</i><p class="card-label">Ahorro</p><strong>{{ homeSummary.saved | appCurrency }}</strong><p class="card-meta">en metas</p></article>
          <article class="surface-card compact-card"><i class="metric-icon metric-icon--red">▭</i><p class="card-label">Deuda</p><strong>{{ homeSummary.debtLeft | appCurrency }}</strong><p class="card-meta">{{ homeSummary.debtLabel }}</p></article>
        </section>
      } @else if (!apiError()) {
        <section class="surface-card setup-card">
          <h2 class="section-card-title">Aún no hay presupuesto mensual</h2>
          <p class="section-card-copy">Configura un presupuesto para ver cuánto has gastado y cuánto te queda este mes.</p>
          <a class="card-link" routerLink="/money">Ver dinero →</a>
        </section>
      }

      @if (routineError()) {
        <p class="api-error" role="status">No pudimos cargar tu rutina.</p>
      } @else if (routineSummary(); as routine) {
        @if (routine.today.total) {
          <section class="surface-card routine-card">
            <div class="card-head"><h2 class="section-card-title">Rutina de hoy</h2><a class="card-link" routerLink="/routine">Ver rutina ↗</a></div>
            <strong>{{ routine.today.done }}/{{ routine.today.total }} completadas · {{ routine.today.completionPercent }}%</strong>
            <p class="card-meta">Racha: {{ routine.streak.current }} días</p>
            <div class="progress-track"><span class="progress-fill progress-fill--green" [style.width.%]="routine.today.completionPercent"></span></div>
          </section>
        } @else {
          <section class="surface-card setup-card"><h2 class="section-card-title">Rutina de hoy</h2><p class="section-card-copy">Configura tu rutina para ver tu progreso diario.</p><a class="card-link" routerLink="/routine/setup">Crear rutina →</a></section>
        }
      }

      @if (projectError()) {
        <p class="api-error" role="status">No pudimos cargar tus proyectos.</p>
      } @else if (projectSummary(); as projects) {
        @if (projects.highestProgressProject; as project) {
          <section class="surface-card routine-card">
            <div class="card-head"><h2 class="section-card-title">Proyecto principal</h2><a class="card-link" [routerLink]="['/projects', project.id]">Ver proyecto ↗</a></div>
            <strong>{{ project.name }} · {{ project.progressPercent ?? 0 }}%</strong>
            <p class="card-meta">Próxima tarea: {{ project.nextTask?.title || 'Sin tareas próximas' }}</p>
            <div class="progress-track"><span class="progress-fill progress-fill--purple" [style.width.%]="project.progressPercent ?? 0"></span></div>
          </section>
        } @else {
          <section class="surface-card setup-card"><h2 class="section-card-title">Proyectos</h2><p class="section-card-copy">Agrega un proyecto para dar seguimiento a tus avances.</p><a class="card-link" routerLink="/projects">Crear proyecto →</a></section>
        }
      }

      @if (homeSummary.activeDays || homeSummary.streak) {
        <section class="surface-card">
          <div class="card-head"><h2 class="section-card-title">Progreso anual</h2><a class="card-link" routerLink="/progress">Ver</a></div>
          <p class="section-card-copy">Cada punto representa un día.</p>
          <div class="heatmap-preview">
            @for (day of homeSummary.heatmap; track day.id) { <span [class]="getHeatmapClass(day.value)"></span> }
          </div>
          <div class="split-line split-line--bottom"><p class="section-card-copy">{{ homeSummary.activeDays }} días activos</p><p class="accent-copy">{{ homeSummary.streak }} días de racha</p></div>
        </section>
      }
    </div>
  `,
  styles: `
    .page-header { position: relative; padding-right: 56px; }
    .settings-link { position: absolute; top: 0; right: 0; display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-card-secondary); color: var(--color-text-secondary); font-size: 1.25rem; text-decoration: none; }
    .settings-link:hover, .settings-link:focus-visible { border-color: var(--color-green); color: var(--color-green); }
    .hero-card { padding: 22px; background: radial-gradient(circle at top right, rgb(40 215 154 / .14), transparent 42%), var(--color-card); border-color: rgb(40 215 154 / .28); }
    .card-label, .card-meta { margin: 0; color: var(--color-text-secondary); }
    .hero-amount { display: block; margin-top: 8px; font-size: clamp(3.1rem, 14vw, 4.5rem); line-height: .92; letter-spacing: -.08em; color: var(--color-green); }
    .financial-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 12px; margin: 22px 0 14px; }
    .financial-summary .budget-total { grid-column: 1 / -1; }
    .financial-summary > div:not(.budget-total) strong { display: block; margin-top: 5px; font-size: 1.2rem; }
    .meta-accent, .accent-copy { margin: 0; color: var(--color-green); }
    .budget-copy { margin: 9px 0 0; color: var(--color-text-secondary); font-size: .82rem; }
    .budget-alert { margin: 12px 0 0; padding: 10px 12px; border-radius: 12px; background: rgb(255 77 109 / .12); color: var(--color-red); font-weight: 700; }
    .compact-card { min-width: 0; padding: 16px; }
    .compact-card strong { display: block; margin: 4px 0 2px; font-size: 1.2rem; }
    .metric-icon { display: grid; place-items: center; width: 28px; height: 28px; margin-bottom: 12px; border-radius: 10px; background: #23252b; color: var(--color-text-secondary); font-style: normal; }
    .metric-icon--orange { color: var(--color-orange); } .metric-icon--green { color: var(--color-green); } .metric-icon--red { color: var(--color-red); }
    .value-green { color: var(--color-green); }
    .setup-card { display: grid; gap: 12px; background: linear-gradient(180deg, rgb(35 29 65 / .7), var(--color-card)); }
    .guidance-card { display: grid; gap: 11px; border-color: rgb(124 109 255 / .3); background: radial-gradient(circle at top right, rgb(124 109 255 / .14), transparent 44%), var(--color-card); }
    .guidance-why { margin: 0; color: var(--color-text-secondary); font-size: .78rem; }
    .routine-card { display: grid; gap: 12px; }
    .api-error { margin: 0; padding: 12px 14px; border-radius: 14px; background: rgb(255 77 109 / .12); color: var(--color-red); }
    .loading-state { color: var(--color-text-secondary); text-align: center; }
    .list-row:first-child { padding-top: 0; } .list-row:last-child { padding-bottom: 0; border-bottom: 0; }
    .heatmap-preview { display: grid; grid-template-columns: repeat(12, 1fr); gap: 5px; margin-top: 8px; }
    .heatmap-preview .heatmap-cell { min-height: 16px; aspect-ratio: 1; }
    .split-line--bottom { margin-top: 14px; }
  `,
})
export class HomePage {
  private readonly summary = signal<HomeSummary>(HOME_FALLBACK);
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly onboarding = inject(OnboardingStateService);
  private readonly events = inject(QuickCreateEventsService);
  private readonly routinesApi = inject(RoutinesApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly moneyApi = inject(MoneyApiService);
  private readonly routineEvents = inject(RoutineEventsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly apiError = signal(false);
  private readonly summaryLoading = signal(true);
  private readonly routineLoading = signal(true);
  private readonly projectLoading = signal(true);
  protected readonly loading = computed(() => this.summaryLoading() || this.routineLoading() || this.projectLoading());
  protected readonly routineSummary = signal<RoutineSummary | null>(null);
  protected readonly routineError = signal(false);
  protected readonly projectSummary = signal<ProjectsSummary | null>(null);
  protected readonly projectError = signal(false);
  protected readonly guidance = signal<FinancialGuidance | null>(null);
  protected readonly guidanceLoading = signal(true);
  protected readonly guidanceError = signal(false);
  protected readonly primaryRecommendation = computed(() => this.guidance()?.recommendations.find(({ priority }) => priority === 'primary') ?? null);
  protected readonly today = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).toUpperCase();

  constructor() {
    this.loadSummary();
    this.loadRoutineSummary();
    this.loadProjectSummary();
    this.loadGuidance();
    this.events.moneyChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.loadSummary(); this.loadGuidance(); });
    this.routineEvents.changed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadRoutineSummary());
    this.events.projectChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadProjectSummary());
  }

  private loadSummary() {
    this.summaryLoading.set(true); this.summary.set(HOME_FALLBACK);
    this.dashboardApi.getSummary().pipe(
      map(mapDashboardSummaryToHomeSummary),
      tap(() => this.apiError.set(false)),
      catchError(() => { this.apiError.set(true); return of(HOME_FALLBACK); }),
      finalize(() => this.summaryLoading.set(false)), takeUntilDestroyed(this.destroyRef),
    ).subscribe((summary) => this.summary.set(summary));
  }

  private loadRoutineSummary() {
    this.routineLoading.set(true); this.routineSummary.set(null);
    this.routinesApi.getSummary().pipe(finalize(() => this.routineLoading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({ next: (summary) => { this.routineError.set(false); this.routineSummary.set(summary); }, error: () => { this.routineError.set(true); this.routineSummary.set(null); } });
  }

  private loadProjectSummary() {
    this.projectLoading.set(true); this.projectSummary.set(null);
    this.projectsApi.getSummary().pipe(finalize(() => this.projectLoading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({ next: (summary) => { this.projectError.set(false); this.projectSummary.set(summary); }, error: () => { this.projectError.set(true); this.projectSummary.set(null); } });
  }

  private loadGuidance() {
    this.guidanceLoading.set(true);
    this.moneyApi.getGuidance().pipe(finalize(() => this.guidanceLoading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (guidance) => { this.guidanceError.set(false); this.guidance.set(guidance); },
      error: () => { this.guidanceError.set(true); this.guidance.set(null); },
    });
  }

  get homeSummary() { return this.summary(); }
  protected get profileName() { return this.onboarding.status()?.profile?.displayName ?? ''; }
  protected get financialReady() { return this.homeSummary.monthlyLimit > 0; }
  protected get monthlyRemaining() { return Math.max(0, this.homeSummary.monthlyLimit - this.homeSummary.monthlySpent); }
  protected get budgetExceeded() { return this.homeSummary.monthlySpent > this.homeSummary.monthlyLimit; }
  protected get budgetOverage() { return Math.max(0, this.homeSummary.monthlySpent - this.homeSummary.monthlyLimit); }
  protected guidanceExplanation() { return `Basado en tu modo ${({ adjusted: 'Ajustado', flexible: 'Flexible', debt_aggressive: 'Pagar deuda', saving_aggressive: 'Ahorrar' })[this.guidance()?.mode ?? 'adjusted']} y los datos del periodo.`; }
  protected guidanceRoute(recommendation: GuidanceRecommendation) { return recommendation.reason === 'no_active_debt' ? '/settings' : '/money'; }
  protected guidanceQuery(recommendation: GuidanceRecommendation) { return recommendation.type === 'debt' ? { tab: 'debt' } : recommendation.type === 'saving' || recommendation.reason === 'no_active_goal' ? { tab: 'saving' } : recommendation.type === 'setup' ? { tab: 'budget' } : null; }
  protected guidanceCta(recommendation: GuidanceRecommendation) { return recommendation.reason === 'no_active_debt' ? 'Cambiar modo' : recommendation.type === 'debt' ? 'Ver deuda' : recommendation.type === 'saving' || recommendation.reason === 'no_active_goal' ? 'Ver ahorro' : 'Ver dinero'; }
  protected getProgressPercent(used: number, limit: number) { return limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0; }
  protected getHeatmapClass(value: HomeSummary['heatmap'][number]['value']) { return `heatmap-cell heatmap-cell--${value}`; }
}
