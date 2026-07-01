import { Routes } from '@angular/router';
import { onboardingGuard } from './core/guards/onboarding.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'money/setup',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./features/money/setup/money-setup-page').then((m) => m.MoneySetupPage),
  },
  {
    path: 'money',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./features/money/money-page').then((m) => m.MoneyPage),
  },
  {
    path: 'habits',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./features/habits/habits-page').then((m) => m.HabitsPage),
  },
  {
    path: 'progress',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./features/progress/progress-page').then((m) => m.ProgressPage),
  },
  {
    path: 'projects',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./features/projects/projects-page').then((m) => m.ProjectsPage),
  },
  {
    path: 'settings',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./features/settings/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./features/onboarding/onboarding-page').then((m) => m.OnboardingPage),
  },
];
