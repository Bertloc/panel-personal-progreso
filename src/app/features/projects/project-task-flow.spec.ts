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
  });

  function createDetail(status: ProjectTask['status'] = 'pending'): ComponentFixture<ProjectDetailPage> {
    const fixture = TestBed.createComponent(ProjectDetailPage);
    http.expectOne(`${API_BASE_URL}/projects/${project.id}`).flush(project);
    http.expectOne(`${API_BASE_URL}/projects/${project.id}/tasks`).flush([task(status)]);
    fixture.detectChanges();
    return fixture;
  }

  function openTaskEditor(fixture: ComponentFixture<ProjectDetailPage>): void {
    const button = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find(({ textContent }) => textContent?.includes('Agregar tarea'))!;
    button.click();
    fixture.detectChanges();
  }
});

function labels(fixture: ComponentFixture<ProjectTaskFormModal>): string[] {
  return Array.from<HTMLLabelElement>(fixture.nativeElement.querySelectorAll('label')).map(({ textContent }) => textContent?.trim() ?? '');
}
