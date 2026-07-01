import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RoutineEventsService {
  private readonly changed = new Subject<void>();
  readonly changed$ = this.changed.asObservable();
  notifyChanged() { this.changed.next(); }
}
