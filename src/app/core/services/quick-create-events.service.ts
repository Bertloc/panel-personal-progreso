import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class QuickCreateEventsService {
  private readonly expenseCreated = new Subject<void>();
  readonly expenseCreated$ = this.expenseCreated.asObservable();

  notifyExpenseCreated(): void {
    this.expenseCreated.next();
  }
}
