import { HOME_FALLBACK } from '../fallbacks/home.fallback';
import { DashboardSummary } from '../models/dashboard.model';
import { HomeSummary, HeatmapDay } from '../models/home-summary.model';
import { BudgetCurrentResponse } from '../models/budgets.model';
import { DebtApi } from '../models/debts.model';
import { HabitApi, HabitsView } from '../models/habits.model';
import { DebtInfo, ExpenseApi, MoneyCategory, MoneyCategoryApi, MoneyView, Paycheck, PaymentItem, RecentExpense } from '../models/money.model';
import { HeatmapApiDay, HeatmapApiResponse, ProgressTodayApi, ProgressView } from '../models/progress.model';
import { ProjectApi, ProjectBudgetApi, ProjectCard, ProjectsView, ProjectTaskApi } from '../models/projects.model';
import { SavingsGoal, SavingsGoalApi } from '../models/savings.model';
import { SettingsApi } from '../models/settings.model';
import { IncomeSource } from '../models/income.model';
import { RecurringPayment } from '../models/recurring-payment.model';
import { toNumber } from '../utils/number.util';

const heatmapStatus = ['empty', 'low', 'medium', 'good', 'excellent'] as const;
const clampPercent = (value: unknown) => Math.max(0, Math.min(100, Math.round(toNumber(value))));

export function mapHeatmapDays(days: HeatmapApiDay[], length: number): HeatmapDay[] {
  return Array.from({ length }, (_, index) => {
    const day = days[index];
    const statusValue = heatmapStatus.indexOf((day?.state ?? day?.status ?? 'empty') as typeof heatmapStatus[number]);
    const value = Math.max(0, Math.min(4, Math.round(toNumber(day?.value ?? day?.score ?? Math.max(0, statusValue))))) as HeatmapDay['value'];
    return { id: day?.id ?? day?.date ?? `empty-${index + 1}`, date: day?.date, value, score: toNumber(day?.score ?? value), status: heatmapStatus[value] };
  });
}

export function mapDashboardSummaryToHomeSummary(source: DashboardSummary): HomeSummary {
  const debt = source.activeDebts?.[0];
  const originalDebt = toNumber(debt?.initialAmount ?? debt?.originalAmount ?? debt?.totalAmount);
  const debtLeft = toNumber(source.debtLeft ?? source.totalDebt ?? debt?.currentAmount ?? debt?.remainingAmount);
  const periodSpent = toNumber(source.periodSpent ?? source.weeklySpent);
  const budgetRemaining = toNumber(source.budgetRemaining ?? source.weeklyRemaining);
  const saved = source.saved === undefined
    ? (source.activeSavingsGoals ?? []).reduce((total, goal) => total + toNumber(goal.currentAmount ?? goal.current), 0)
    : toNumber(source.saved);
  return {
    ...HOME_FALLBACK,
    userName: source.userName ?? HOME_FALLBACK.userName,
    date: source.date ?? HOME_FALLBACK.date,
    availableToday: toNumber(source.availableToday), resetHours: toNumber(source.resetHours),
    weeklySpent: toNumber(source.weeklySpent ?? source.currentWeekExpenses ?? periodSpent), weeklyRemaining: budgetRemaining, weeklyLimit: toNumber(source.weeklyLimit) || periodSpent + budgetRemaining,
    monthlySpent: toNumber(source.monthlySpent ?? source.currentMonthExpenses), monthlyLimit: toNumber(source.monthlyLimit) || periodSpent + budgetRemaining, saved,
    savingsLabel: source.savingsLabel ?? source.activeSavingsGoals?.[0]?.name ?? HOME_FALLBACK.savingsLabel, debtLeft, debtLabel: source.debtLabel ?? debt?.name ?? HOME_FALLBACK.debtLabel,
    nextDebtDate: source.nextDebtDate ?? debt?.nextPaymentDate ?? HOME_FALLBACK.nextDebtDate, nextDebtPayment: toNumber(source.nextDebtPayment ?? debt?.minimumPayment), debtProgress: source.debtProgress === undefined && originalDebt ? clampPercent(((originalDebt - debtLeft) / originalDebt) * 100) : clampPercent(source.debtProgress),
    suggestedExtraPayment: toNumber(source.suggestedExtraPayment), activeDays: toNumber(source.activeDays), streak: toNumber(source.streak),
    habits: source.habits ?? source.habitsToday ?? [], heatmap: source.heatmap ? mapHeatmapDays(source.heatmap, 84) : HOME_FALLBACK.heatmap,
  };
}

const categoryTones: MoneyCategory['tone'][] = ['green', 'blue', 'purple', 'orange', 'pink'];
export function mapMoneyView(categories: MoneyCategoryApi[], expenses: ExpenseApi[], budget: BudgetCurrentResponse, debts: DebtApi[], goals: SavingsGoalApi[], settings: SettingsApi, incomeSources: IncomeSource[] = [], recurringPayments: RecurringPayment[] = []): MoneyView {
  const limits = budget.limits ?? [];
  const mappedCategories: MoneyCategory[] = limits.map((item, index) => {
    const name = item.name ?? item.categoryName ?? item.category?.name ?? 'Sin categoría';
    const apiCategory = categories.find((category) => category.name === name);
    const used = toNumber(item.used ?? item.usedAmount ?? item.spent ?? apiCategory?.used ?? apiCategory?.spent ?? expenses.filter((expense) => expense.category?.name === name || expense.categoryName === name).reduce((sum, expense) => sum + toNumber(expense.amount), 0));
    const limit = toNumber(item.limit ?? item.limitAmount ?? item.amount ?? apiCategory?.limit);
    return { name, used, limit, tone: categoryTones[index % categoryTones.length], status: used > limit && limit > 0 ? 'Excedido' : used >= limit * 0.8 && limit > 0 ? 'Cuidado' : 'OK' };
  });
  const findLimit = (name: string) => mappedCategories.find((item) => item.name.toLowerCase().includes(name))?.limit ?? 0;
  const debt = debts.find(({ status }) => !status || status === 'active');
  const paycheck: Paycheck = {
    income: incomeSources.filter(({ isActive }) => isActive).reduce((sum, source) => sum + toNumber(source.amount), 0) || toNumber(settings.paydayIncome ?? settings.income ?? budget.current?.income), debt: toNumber(debt?.nextPaymentAmount ?? debt?.minimumPayment),
    gym: findLimit('gym'), nutritionist: findLimit('nutri'), foodWeekly: findLimit('comida'), transportPerDay: findLimit('transporte') / 14, transportDays: 7,
  };
  const originalDebt = toNumber(debt?.initialAmount ?? debt?.originalAmount ?? debt?.totalAmount);
  const left = toNumber(debt?.currentAmount ?? debt?.remainingAmount ?? debt?.balance);
  const debtInfo: DebtInfo = {
    name: debt?.name, left, nextPayment: toNumber(debt?.nextPaymentAmount ?? debt?.minimumPayment), date: debt?.nextPaymentDate ?? 'Sin fecha',
    progress: debt?.progressPercent ?? (debt?.progress === undefined ? (originalDebt ? clampPercent(((originalDebt - left) / originalDebt) * 100) : 0) : clampPercent(debt.progress)),
    extra: toNumber(debt?.suggestedExtraPayment), bankPlan: debt?.bankPlan ?? 'Sin proyección', aggressivePlan: debt?.aggressivePlan ?? 'Sin proyección',
  };
  const upcomingPayments: PaymentItem[] = recurringPayments.filter(({ isActive }) => isActive).map((payment) => ({ name: payment.name, amount: toNumber(payment.amount), dueLabel: payment.nextDueDate ?? (payment.dueDay ? `Día ${payment.dueDay}` : payment.frequency) }));
  const savingsGoals: SavingsGoal[] = goals.filter(({ status }) => !status || status === 'active').map((goal, index) => ({ name: goal.name, current: toNumber(goal.currentAmount ?? goal.current), target: toNumber(goal.targetAmount ?? goal.target), tone: (['purple', 'green', 'blue'] as const)[index % 3] }));
  const recentExpenses: RecentExpense[] = expenses.slice(0, 5).map((expense) => ({ name: expense.category?.name ?? expense.categoryName ?? expense.name ?? expense.description ?? 'Gasto', amount: toNumber(expense.amount), day: formatRelativeDay(expense.expenseDate ?? expense.date ?? expense.createdAt) }));
  return { paycheck, upcomingPayments, debtInfo, categories: mappedCategories, savingsGoals, recentExpenses };
}

function formatRelativeDay(value?: string): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value); const today = new Date();
  const days = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86_400_000);
  return days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

const habitSections = {
  morning: { title: 'Mañana', time: '6am - 12pm', icon: 'Sol' },
  afternoon: { title: 'Tarde', time: '12pm - 6pm', icon: 'Día' },
  night: { title: 'Noche', time: '6pm - 11pm', icon: 'Luna' },
  anytime: { title: 'General', time: 'Todo el día', icon: 'Día' },
} as const;

export function mapHabitsView(habits: HabitApi[]): HabitsView {
  const sections = Object.entries(habitSections).map(([moment, section]) => ({ ...section, habits: habits.filter((habit) => (habit.moment ?? 'anytime') === moment).map((habit) => ({ name: habit.name, done: habit.completed === true || habit.status === 'completed' || habit.log?.status === 'completed' || habit.todayLog?.status === 'completed', streak: toNumber(habit.streak) })) })).filter((section) => section.habits.length);
  const completed = sections.flatMap((section) => section.habits).filter((habit) => habit.done).length;
  return { progress: habits.length ? Math.round((completed / habits.length) * 100) : 0, completed, total: habits.length, streak: Math.max(0, ...habits.map((habit) => toNumber(habit.streak))), sections };
}

export function mapProgressView(heatmapResponse: HeatmapApiResponse | HeatmapApiDay[], today: ProgressTodayApi): ProgressView {
  const response = Array.isArray(heatmapResponse) ? { days: heatmapResponse } : heatmapResponse;
  const days = response.days ?? response.heatmap ?? [];
  const months = response.monthlyConsistency?.map((month) => ({ name: month.name ?? month.month ?? '', percent: clampPercent(month.percent) })) ?? [];
  return { heatmap: mapHeatmapDays(days, 126), activeDays: toNumber(today.activeDays) || days.filter((day) => toNumber(day.value ?? day.score) > 0).length, streak: toNumber(today.streak), consistency: clampPercent(today.consistency), longestStreak: toNumber(today.longestStreak), bestMonth: today.bestMonth ?? '—', bestMonthDays: toNumber(today.bestMonthDays), monthlyConsistency: months };
}

const statusLabels: Record<string, string> = { planned: 'Planeado', active: 'Activo', paused: 'En pausa', completed: 'Completado', cancelled: 'Cancelado' };
const priorityLabels: Record<string, 'Alta' | 'Media' | 'Baja'> = { high: 'Alta', medium: 'Media', low: 'Baja' };
export function mapProjectsView(projects: ProjectApi[], tasksByProject: Record<string, ProjectTaskApi[]>, budgetsByProject: Record<string, ProjectBudgetApi[]>): ProjectsView {
  const active = projects.filter((project) => project.status === 'active');
  const allTasks = projects.flatMap((project) => tasksByProject[project.id] ?? []);
  const cards: ProjectCard[] = projects.map((project, index) => {
    const tasks = tasksByProject[project.id] ?? []; const done = tasks.filter((task) => task.completed || task.status === 'completed').length;
    return { name: project.name, status: statusLabels[project.status ?? ''] ?? project.status ?? 'Planeado', progress: project.progress === undefined ? (tasks.length ? Math.round((done / tasks.length) * 100) : 0) : clampPercent(project.progress), tasks: `${done}/${tasks.length} tareas`, tone: (['purple', 'blue', 'green'] as const)[index % 3] };
  });
  const priorityTasks = allTasks.filter((task) => !task.completed && task.status !== 'completed').sort((a, b) => ['high', 'medium', 'low'].indexOf(a.priority ?? 'low') - ['high', 'medium', 'low'].indexOf(b.priority ?? 'low')).slice(0, 5).map((task) => ({ name: task.name ?? task.title ?? 'Tarea', done: false, priority: priorityLabels[task.priority ?? ''] ?? 'Baja' }));
  const projectBudgets = projects.flatMap((project) => (budgetsByProject[project.id] ?? []).map((budget) => ({ name: budget.name ?? budget.category ?? project.name, spent: toNumber(budget.spent ?? budget.used), limit: toNumber(budget.limit ?? budget.amount) })));
  const featuredProject = active[0] ?? projects[0]; const featuredTasks = featuredProject ? tasksByProject[featuredProject.id] ?? [] : [];
  return { summaryCards: [{ label: 'Activos', value: `${active.length} proyectos`, copy: `${cards.filter((card) => card.progress >= 80).length} cerca de terminar` }, { label: 'Tiempo', value: '—', copy: 'esta semana' }], projectBudgets, priorityTasks, projects: cards, featured: featuredProject ? { name: featuredProject.name, next: featuredTasks.find((task) => !task.completed && task.status !== 'completed')?.name ?? featuredTasks.find((task) => !task.completed)?.title ?? 'Sin tareas pendientes', progress: cards.find((card) => card.name === featuredProject.name)?.progress ?? 0, status: statusLabels[featuredProject.status ?? ''] ?? featuredProject.status ?? 'Planeado' } : undefined };
}
