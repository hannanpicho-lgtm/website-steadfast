import { describe, expect, it } from 'vitest';
import { buildQueuedTasks, getQueuedPreviewProduct, type QueueTaskItem } from '@/app/services/taskQueue';

type Task = QueueTaskItem & {
  product: string;
};

const tasks: Task[] = [
  { id: 'generated-newest', product: 'Generated Newest', price: 120, source: 'Auto Top-Up', status: 'Active' },
  { id: 'manual-a', product: 'Manual A', price: 116, source: 'Manual', status: 'Active' },
  { id: 'manual-b', product: 'Manual B', price: 102, source: 'Bulk Import', status: 'Active' },
  { id: 'generated-old', product: 'Generated Old', price: 111, source: 'Auto Top-Up', status: 'Active' },
  { id: 'paused-manual', product: 'Paused Manual', price: 118, source: 'Manual', status: 'Paused' },
  { id: 'out-of-range-manual', product: 'Out Of Range', price: 260, source: 'Manual', status: 'Active' },
];

describe('taskQueue', () => {
  it('preserves server eligibleTaskIds order for queue preview', () => {
    const queued = buildQueuedTasks(tasks, ['manual-b', 'manual-a', 'generated-old'], 80, 150);

    expect(queued.map((task) => task.id)).toEqual(['manual-b', 'manual-a', 'generated-old']);
    expect(getQueuedPreviewProduct(queued)?.id).toBe('manual-b');
  });

  it('falls back to VIP in-range manual-first ordering when eligibleTaskIds are missing', () => {
    const queued = buildQueuedTasks(tasks, undefined, 80, 150);

    expect(queued.map((task) => task.id)).toEqual([
      'manual-a',
      'manual-b',
      'generated-newest',
      'generated-old',
    ]);
  });

  it('excludes paused and out-of-range tasks from fallback queue', () => {
    const queued = buildQueuedTasks(tasks, undefined, 80, 150);

    expect(queued.some((task) => task.id === 'paused-manual')).toBe(false);
    expect(queued.some((task) => task.id === 'out-of-range-manual')).toBe(false);
  });
});