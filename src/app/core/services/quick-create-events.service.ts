import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type MoneyChange = 'expense' | 'income' | 'debt-payment' | 'saving' | 'setup';

@Injectable({ providedIn: 'root' })
export class QuickCreateEventsService {
  private readonly moneyChanged = new Subject<MoneyChange>();
  readonly moneyChanged$ = this.moneyChanged.asObservable();

  notifyMoneyChanged(change: MoneyChange = 'setup'): void { this.moneyChanged.next(change); }
}
