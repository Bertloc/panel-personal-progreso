import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/config/api.config';
import { Project, ProjectTask } from '../../core/models/projects.model';
import { AuthService } from '../../core/services/auth.service';
import { QuickCreateEventsService } from '../../core/services/quick-create-events.service';
import { ProjectDetailPage } from './project-detail-page';
import { ProjectTaskFormModal } from './project-task-form-modal';

const project: Project = { id: 'project-1', name: 'Proyecto', priority: 'medium', status: 'planned', consumesMoney: false };
const task = (status: ProjectTask['status']): ProjectTask => ({ id: 'task-1', projectId: project.id, title: 'Tarea', priority: 'medium', status });
const authStub = { currentUser: signal(null), loading: signal(false), isAuthenticated: signal(true), getAccessToken: () => Promise.resolve(null), logout: () => Promise.resolve(), whenReady: () => Promise.resolve() };

describe('Project task flow', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectDetailPage, ProjectTaskFormModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => project.id } } } },
        { provide: AuthService, useValue: authStub },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates tasks as pending and only shows status while editing', () => {
    const createFixture = TestBed.createComponent(ProjectTaskFormModal);
    createFixture.componentRef.setInput('projectId', project.id);
    createFixture.detectChanges();

    expect(createFixture.nativeElement.textContent).toContain('El título es obligatorio.');
    expect(labels(createFixture).some((label) => label.startsWith('Estado'))).toBe(false);

    createFixture.componentInstance['form'].patchValue({ title: 'Nueva tarea', status: 'completed' });
    createFixture.componentInstance['save']();
    const request = http.expectOne(`${API_BASE_URL}/projects/${project.id}/tasks`);
    expect(request.request.body.status).toBe('pending');
    request.flush(task('pending'));

    const editFixture = TestBed.createComponent(ProjectTaskFormModal);
    editFixture.componentRef.setInput('projectId', project.id);
    editFixture.componentRef.setInput('task', task('completed'));
    editFixture.detectChanges();

    expect(labels(editFixture).some((label) => label.startsWith('Estado'))).toBe(true);
    expect((editFixture.nativeElement.querySelector('select[formControlName="status"]') as HTMLSelectElement).value).toBe('completed');
  });

  it('keeps the task editor usable and ignores stale reloads', () => {
    const fixture = createDetail();
    TestBed.inject(QuickCreateEventsService).notifyProjectChanged();
    TestBed.inject(QuickCreateEventsService).notifyProjectChanged();
    const projects = http.match(`${API_BASE_URL}/projects/${project.id}`);
    const tasks = http.match(`${API_BASE_URL}/projects/${project.id}/tasks`);

    openTaskEditor(fixture);
    projects[1].flush(project);
    tasks[1].flush([task('completed')]);
    projects[0].flush(project);
    tasks[0].flush([task('pending')]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-project-task-form-modal')).not.toBeNull();
    expect(fixture.componentInstance['tasks']()[0].status).toBe('completed');
  });

  it('renders the status returned by PATCH and performs one refresh', () => {
    const fixture = createDetail('in_progress');
    const select = fixture.nativeElement.querySelector('.task select') as HTMLSelectElement;
    expect(select.value).toBe('in_progress');

    select.value = 'completed';
    select.dispatchEvent(new Event('change'));
    const patch = http.expectOne(`${API_BASE_URL}/projects/tasks/task-1`);
    patch.flush(task('completed'));

    http.expectOne(`${API_BASE_URL}/projects/${project.id}`).flush(project);
    http.expectOne(`${API_BASE_URL}/projects/${project.id}/tasks`).flush([task('completed')]);
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('.task select') as HTMLSelectElement).value).toBe('completed');
    expect(fixture.nativeElement.querySelector('.task-meta').textContent).toContain('Completada');
    openTaskEditor(fixture);
    expect(fixture.nativeElement.querySelector('app-project-task-form-modal')).not.toBeNull();
  });

  it('opens a fresh task modal after ten consecutive saves', () => {
    const fixture = createDetail();
    const savedTasks: ProjectTask[] = [task('pending')];

    for (let index = 1; index <= 10; index++) {
      openTaskEditor(fixture);
      const input = fixture.nativeElement.querySelector('app-project-task-form-modal input[formControlName="title"]') as HTMLInputElement;
      input.value = `Tarea ${index}`;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      (fixture.nativeElement.querySelector('app-project-task-form-modal button[type="submit"]') as HTMLButtonElement).click();

      const savedTask = { ...task('pending'), id: `task-${index + 1}`, title: input.value };
      savedTasks.push(savedTask);
      http.expectOne(`${API_BASE_URL}/projects/${project.id}/tasks`).flush(savedTask);
      http.expectOne(`${API_BASE_URL}/projects/${project.id}`).flush(project);
      http.expectOne(`${API_BASE_URL}/projects/${project.id}/tasks`).flush(savedTasks);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-project-task-form-modal')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-action-modal .backdrop')).toBeNull();
      expect(fixture.componentInstance['taskEditor']()).toBeNull();
    }

    openTaskEditor(fixture);
    expect(fixture.nativeElement.querySelector('app-project-task-form-modal')).not.toBeNull();
  });

  it('opens again after repeated cancels, editing and deleting', () => {
    const fixture = createDetail();

    for (let index = 0; index < 10; index++) {
      openTaskEditor(fixture);
      findButton(fixture, 'Cancelar').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-action-modal')).toBeNull();
    }

    findButton(fixture, 'Editar').click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('app-project-task-form-modal input[formControlName="title"]') as HTMLInputElement;
    input.value = 'Tarea editada';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    findButton(fixture, 'Guardar').click();
    const edited = { ...task('pending'), title: input.value };
    http.expectOne(`${API_BASE_URL}/projects/tasks/task-1`).flush(edited);
    http.expectOne(`${API_BASE_URL}/projects/${project.id}`).flush(project);
    http.expectOne(`${API_BASE_URL}/projects/${project.id}/tasks`).flush([edited]);
    fixture.detectChanges();

    const originalConfirm = window.confirm;
    window.confirm = () => true;
    try {
      findButton(fixture, 'Eliminar').click();
      http.expectOne(`${API_BASE_URL}/projects/tasks/task-1`).flush(null);
      http.expectOne(`${API_BASE_URL}/projects/${project.id}`).flush(project);
      http.expectOne(`${API_BASE_URL}/projects/${project.id}/tasks`).flush([]);
      fixture.detectChanges();
    } finally {
      window.confirm = originalConfirm;
    }

    openTaskEditor(fixture);
    expect(fixture.nativeElement.querySelector('app-project-task-form-modal')).not.toBeNull();
  });

  function createDetail(status: ProjectTask['status'] = 'pending'): ComponentFixture<ProjectDetailPage> {
    const fixture = TestBed.createComponent(ProjectDetailPage);
    http.expectOne(`${API_BASE_URL}/projects/${project.id}`).flush(project);
    http.expectOne(`${API_BASE_URL}/projects/${project.id}/tasks`).flush([task(status)]);
    fixture.detectChanges();
    return fixture;
  }

  function openTaskEditor(fixture: ComponentFixture<ProjectDetailPage>): void {
    findButton(fixture, 'Agregar tarea').click();
    fixture.detectChanges();
  }
});

function labels(fixture: ComponentFixture<ProjectTaskFormModal>): string[] {
  return Array.from<HTMLLabelElement>(fixture.nativeElement.querySelectorAll('label')).map(({ textContent }) => textContent?.trim() ?? '');
}

function findButton(fixture: ComponentFixture<ProjectDetailPage>, text: string): HTMLButtonElement {
  return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find(({ textContent }) => textContent?.includes(text))!;
}
