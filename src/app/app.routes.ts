import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'money',
    loadComponent: () =>
      import('./features/money/money-page').then((m) => m.MoneyPage),
  },
  {
    path: 'habits',
    loadComponent: () =>
      import('./features/habits/habits-page').then((m) => m.HabitsPage),
  },
  {
    path: 'progress',
    loadComponent: () =>
      import('./features/progress/progress-page').then((m) => m.ProgressPage),
  },
  {
    path: 'projects',
    loadComponent: () =>
      import('./features/projects/projects-page').then((m) => m.ProjectsPage),
  },
];
