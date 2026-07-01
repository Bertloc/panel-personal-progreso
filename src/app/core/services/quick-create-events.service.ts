import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class QuickCreateEventsService {
  private readonly expenseCreated = new Subject<void>();
  private readonly moneyChanged = new Subject<void>();
  readonly expenseCreated$ = this.expenseCreated.asObservable();
  readonly moneyChanged$ = this.moneyChanged.asObservable();

  notifyExpenseCreated(): void {
    this.expenseCreated.next();
  }

  notifyMoneyChanged(): void { this.moneyChanged.next(); }
}
