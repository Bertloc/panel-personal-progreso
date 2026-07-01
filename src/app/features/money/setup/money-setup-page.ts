import { Component, signal } from '@angular/core';
import { BudgetManager } from './budget-manager';
import { CategoryManager } from './category-manager';
import { DebtsManager } from './debts-manager';
import { RecurringPaymentsManager } from './recurring-payments-manager';
import { SavingsManager } from './savings-manager';

type SetupSection = 'categories' | 'budget' | 'payments' | 'debts' | 'savings';

@Component({
  selector: 'app-money-setup-page',
  imports: [CategoryManager, BudgetManager, RecurringPaymentsManager, DebtsManager, SavingsManager],
  template: `
    <div class="page-stack">
      <header class="page-header">
        <p class="page-eyebrow">Tu configuración</p>
        <h1 class="page-title">Configurar dinero</h1>
        <p class="page-copy">Define tus categorías, presupuesto, pagos, deudas y metas.</p>
      </header>

      <nav class="setup-tabs" aria-label="Secciones de configuración">
        @for (item of sections; track item.id) {
          <button type="button" [class.active]="section() === item.id" (click)="section.set(item.id)">{{ item.label }}</button>
        }
      </nav>

      <section class="surface-card setup-content">
        @switch (section()) {
          @case ('categories') { <app-category-manager /> }
          @case ('budget') { <app-budget-manager /> }
          @case ('payments') { <app-recurring-payments-manager /> }
          @case ('debts') { <app-debts-manager /> }
          @case ('savings') { <app-savings-manager /> }
        }
      </section>
    </div>
  `,
  styles: `
    .setup-tabs { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
    .setup-tabs::-webkit-scrollbar { display: none; }
    .setup-tabs button { flex: 0 0 auto; padding: 10px 14px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-card); color: var(--color-text-secondary); }
    .setup-tabs button.active { border-color: rgb(74 222 128 / .35); background: rgb(74 222 128 / .12); color: var(--color-green); }
    .setup-content { padding: 18px; }
  `,
})
export class MoneySetupPage {
  protected readonly section = signal<SetupSection>('categories');
  protected readonly sections: { id: SetupSection; label: string }[] = [
    { id: 'categories', label: 'Categorías' }, { id: 'budget', label: 'Presupuesto' },
    { id: 'payments', label: 'Pagos' }, { id: 'debts', label: 'Deudas' }, { id: 'savings', label: 'Ahorro' },
  ];
}
