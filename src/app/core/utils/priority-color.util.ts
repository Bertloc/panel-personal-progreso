import { CategoryPriority } from '../models/money.model';

type PriorityTone = 'green' | 'orange' | 'red' | 'purple';
const tones: Record<CategoryPriority, PriorityTone> = { low: 'green', medium: 'orange', high: 'red', essential: 'purple' };

export const priorityToTone = (priority: CategoryPriority = 'medium') => tones[priority];
export const priorityToColor = (priority: CategoryPriority = 'medium') => ({ green: '#4ade80', orange: '#ffb454', red: '#ff4d6d', purple: '#a78bfa' })[priorityToTone(priority)];
export const priorityToClass = (priority: CategoryPriority = 'medium') => `status-badge status-badge--${priorityToTone(priority)}`;
