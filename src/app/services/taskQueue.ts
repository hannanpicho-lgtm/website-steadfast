export interface QueueTaskItem {
  id: string;
  status: 'Active' | 'Paused';
  price: number;
  source?: string;
}

function isManualSource(task: Pick<QueueTaskItem, 'source'>) {
  return task.source === 'Manual' || task.source === 'Bulk Import';
}

export function buildQueuedTasks<T extends QueueTaskItem>(
  taskCatalog: T[],
  eligibleTaskIds?: string[],
  vipPriceMin?: number,
  vipPriceMax?: number,
) {
  const activeTasks = taskCatalog.filter((task) => task.status === 'Active');

  if (Array.isArray(eligibleTaskIds) && eligibleTaskIds.length > 0) {
    const taskById = new Map(activeTasks.map((task) => [task.id, task]));
    return eligibleTaskIds
      .map((id) => taskById.get(id))
      .filter((task): task is T => Boolean(task));
  }

  if (
    Number.isFinite(vipPriceMin)
    && Number.isFinite(vipPriceMax)
    && Number(vipPriceMin) > 0
    && Number(vipPriceMax) >= Number(vipPriceMin)
  ) {
    return activeTasks
      .filter((task) => Number(task.price ?? 0) >= Number(vipPriceMin) && Number(task.price ?? 0) <= Number(vipPriceMax))
      .map((task, index) => ({ task, index }))
      .sort((left, right) => {
        const manualDelta = Number(isManualSource(left.task)) - Number(isManualSource(right.task));
        if (manualDelta !== 0) {
          return -manualDelta;
        }
        return left.index - right.index;
      })
      .map(({ task }) => task);
  }

  return [] as T[];
}

export function getQueuedPreviewProduct<T extends QueueTaskItem>(queuedTasks: T[]) {
  return queuedTasks.length > 0 ? queuedTasks[0] : null;
}