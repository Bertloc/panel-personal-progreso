import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { CategoryPriority, CategoryType, MoneyCategoryApi } from '../../../core/models/money.model';
import { MoneyApiService } from '../../../core/services/money-api.service';
import { QuickCreateEventsService } from '../../../core/services/quick-create-events.service';

@Component({
  selector: 'app-category-manager',
  imports: [ReactiveFormsModule],
  template: `
    <div class="manager">
      <div class="manager-head"><div><h2>Categorías</h2><p class="meta">Organiza cada movimiento a tu manera.</p></div></div>
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="field-grid">
          <label>Nombre <input formControlName="name" maxlength="60" /></label>
          <label>Tipo <select formControlName="type">@for (type of types; track type.value) { <option [value]="type.value">{{ type.label }}</option> }</select></label>
          <label>Prioridad <select formControlName="priority">@for (priority of priorities; track priority.value) { <option [value]="priority.value">{{ priority.label }}</option> }</select></label>
          <label>Color <input formControlName="color" type="color" /></label>
          <label>Icono (opcional) <input formControlName="icon" maxlength="20" /></label>
          <label class="check"><input formControlName="isFixed" type="checkbox" /> Categoría fija</label>
        </div>
        <div class="actions">
          @if (editingId()) { <button class="secondary" type="button" (click)="cancelEdit()">Cancelar</button> }
          <button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Guardando…' : editingId() ? 'Actualizar' : 'Crear categoría' }}</button>
        </div>
      </form>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (loading()) { <p class="empty">Cargando categorías…</p> } @else {
        <div class="items">
          @for (category of categories(); track category.id) {
            <article class="item">
              <div class="item-head"><strong>{{ category.icon }} {{ category.name }}</strong><span class="status-badge">{{ category.type }}</span></div>
              <p class="meta">{{ category.priority || 'sin prioridad' }} · {{ category.isFixed ? 'fija' : 'variable' }}</p>
              <div class="actions"><button class="secondary" type="button" (click)="edit(category)">Editar</button><button class="danger" type="button" (click)="remove(category)">Eliminar</button></div>
            </article>
          } @empty { <p class="empty">Aún no tienes categorías configuradas.</p> }
        </div>
      }
    </div>
  `,
  styleUrl: './setup-manager.css',
})
export class CategoryManager {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(MoneyApiService);
  private readonly events = inject(QuickCreateEventsService);
  protected readonly categories = signal<MoneyCategoryApi[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly types: { value: CategoryType; label: string }[] = [
    { value: 'expense', label: 'Gasto' }, { value: 'saving', label: 'Ahorro' }, { value: 'debt', label: 'Deuda' },
    { value: 'income', label: 'Ingreso' }, { value: 'project', label: 'Proyecto' },
  ];
  protected readonly priorities: { value: CategoryPriority; label: string }[] = [
    { value: 'low', label: 'Baja' }, { value: 'medium', label: 'Media' }, { value: 'high', label: 'Alta' }, { value: 'essential', label: 'Esencial' },
  ];
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required], type: this.fb.nonNullable.control<CategoryType>('expense', Validators.required),
    priority: this.fb.nonNullable.control<CategoryPriority>('medium'), isFixed: false, color: '#4ade80', icon: '',
  });

  constructor() { this.load(); }

  protected save() {
    if (this.form.invalid || this.saving()) return;
    const payload = this.form.getRawValue(); const id = this.editingId();
    this.saving.set(true); this.error.set('');
    (id ? this.api.updateCategory(id, payload) : this.api.createCategory(payload))
      .pipe(finalize(() => this.saving.set(false))).subscribe({
        next: () => { this.cancelEdit(); this.events.notifyMoneyChanged(); this.load(); },
        error: () => this.error.set('No se pudo guardar la categoría.'),
      });
  }

  protected edit(category: MoneyCategoryApi) {
    this.editingId.set(category.id);
    this.form.patchValue({ name: category.name, type: category.type as CategoryType || 'expense', priority: category.priority ?? 'medium', isFixed: category.isFixed ?? false, color: category.color ?? '#4ade80', icon: category.icon ?? '' });
  }

  protected cancelEdit() { this.editingId.set(null); this.form.reset({ name: '', type: 'expense', priority: 'medium', isFixed: false, color: '#4ade80', icon: '' }); }

  protected remove(category: MoneyCategoryApi) {
    if (!confirm(`¿Eliminar ${category.name}?`)) return;
    this.api.deleteCategory(category.id).subscribe({ next: () => { this.events.notifyMoneyChanged(); this.load(); }, error: () => this.error.set('No se pudo eliminar la categoría.') });
  }

  private load() {
    this.loading.set(true); this.error.set('');
    this.api.getCategories().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (categories) => this.categories.set(categories), error: () => this.error.set('No se pudieron cargar las categorías.') });
  }
}
