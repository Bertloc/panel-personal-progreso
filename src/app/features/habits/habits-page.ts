import { Component, inject, signal } from '@angular/core';
import { HABITS_FALLBACK } from '../../core/fallbacks/habits.fallback';
import { mapHabitsView } from '../../core/mappers/api.mapper';
import { HabitsApiService } from '../../core/services/habits-api.service';
import { catchError, map, of } from 'rxjs';

@Component({
  selector: 'app-habits-page',
  template: `
    <div class="page-stack">
      <header class="page-header">
        <div class="split-line split-line--top">
          <div>
            <p class="page-eyebrow">Constancia</p>
            <h1 class="page-title">Hábitos</h1>
          </div>
          <p class="header-date">Sábado, 28 junio</p>
        </div>
      </header>

      <section class="surface-card habits-hero">
        <div class="habit-ring" [style.--progress]="progress" aria-hidden="true">
          <strong>{{ progress }}%</strong>
        </div>

        <div>
          <h2 class="section-card-title">Vamos en marcha</h2>
          <p class="section-card-copy">{{ completed }} de {{ total }} hábitos hechos</p>
          <p class="hero-streak">{{ streak }} días de racha</p>
        </div>
      </section>

      @for (section of sections; track section.title) {
        <section class="habit-section">
          <div class="section-header">
            <div class="row-inline">
              <span class="section-icon">{{ section.icon }}</span>
              <h2 class="section-title">{{ section.title }}</h2>
            </div>
            <span class="section-time">{{ section.time }}</span>
          </div>

          <div class="surface-card list-card">
            @for (habit of section.habits; track habit.name) {
              <div class="list-row">
                <span class="habit-check" [class.habit-check--done]="habit.done"></span>
                <span class="habit-name">{{ habit.name }}</span>
                <span class="streak-chip">{{ habit.streak }}</span>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .split-line--top {
      align-items: end;
    }

    .header-date {
      margin: 0 0 4px;
      color: var(--color-text-secondary);
    }

    .habits-hero {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 18px;
      background:
        radial-gradient(circle at top right, rgb(74 222 128 / 0.18), transparent 44%),
        linear-gradient(180deg, rgb(17 39 24 / 0.96), rgb(18 21 29 / 1));
      border-color: rgb(74 222 128 / 0.18);
    }

    .habit-ring {
      --progress: 0;
      display: grid;
      place-items: center;
      width: 104px;
      aspect-ratio: 1;
      border-radius: 50%;
      background:
        radial-gradient(circle at center, #13201a 59%, transparent 60%),
        conic-gradient(var(--color-green) calc(var(--progress) * 1%), #29243b 0);
      color: var(--color-text);
    }

    .habit-ring strong {
      font-size: 2rem;
      letter-spacing: -0.06em;
    }

    .hero-streak {
      margin: 10px 0 0;
      color: var(--color-orange);
      font-weight: 700;
    }

    .habit-section {
      display: grid;
      gap: 10px;
    }

    .section-header,
    .row-inline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .section-title {
      margin: 0;
      font-size: 1.1rem;
    }

    .section-time {
      color: var(--color-text-secondary);
      font-size: 0.9rem;
    }

    .section-icon {
      color: var(--color-green);
      font-size: 1rem;
    }

    .streak-chip {
      min-width: 34px;
      text-align: right;
      color: var(--color-orange);
      font-weight: 700;
    }

    @media (max-width: 380px) {
      .habits-hero {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class HabitsPage {
  private readonly view = signal(HABITS_FALLBACK);
  private readonly habitsApi = inject(HabitsApiService);
  protected get progress() { return this.view().progress; }
  protected get completed() { return this.view().completed; }
  protected get total() { return this.view().total; }
  protected get streak() { return this.view().streak; }
  protected get sections() { return this.view().sections; }

  constructor() {
    this.habitsApi.getTodayHabits().pipe(map(mapHabitsView), catchError(() => of(HABITS_FALLBACK))).subscribe((view) => this.view.set(view));
  }
}
