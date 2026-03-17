import React from 'react';
import { Plus, Edit, Trash2, Check, X, LinkIcon } from 'lucide-react';

interface TasksProps {
  taskConfigurations: any[];
  tasksLoading: boolean;
  editingTaskId: string | null;
  taskDraft: any;
  setTaskDraft: (draft: any) => void;
  setModalType: any;
  setSelectedItem: (item: any) => void;
  handleStartTaskInlineEdit: (task: any) => void;
  handleCancelTaskInlineEdit: () => void;
  handleSaveTaskInlineEdit: (id: string) => void;
  handleDeleteTaskInline: (id: string) => void;
}

export default function Tasks({
  taskConfigurations,
  tasksLoading,
  editingTaskId,
  taskDraft,
  setTaskDraft,
  setModalType,
  setSelectedItem,
  handleStartTaskInlineEdit,
  handleCancelTaskInlineEdit,
  handleSaveTaskInlineEdit,
  handleDeleteTaskInline,
}: TasksProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Task Management</h2>
          <p className="text-gray-400 text-sm mt-1">Manage product submission tasks for all merchants</p>
        </div>
        <button onClick={() => setModalType('add-task')} className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors">
          <Plus size={18} />
          Add Task
        </button>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 gap-4">
        {tasksLoading ? (
          <div className="bg-[#252b3d] rounded-lg p-6 text-center text-gray-400">Loading tasks…</div>
        ) : null}
        {!tasksLoading && taskConfigurations.length === 0 ? (
          <div className="bg-[#252b3d] rounded-lg p-6 text-center text-gray-400">No tasks configured yet.</div>
        ) : null}
        {taskConfigurations.map((task) => (
          <div key={task.id} className="bg-[#252b3d] rounded-lg p-6 hover:bg-[#2c3e50] transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {editingTaskId === task.id && taskDraft ? (
                    <input
                      type="text"
                      value={taskDraft.product}
                      onChange={(e) => setTaskDraft((prev) => (prev ? { ...prev, product: e.target.value } : prev))}
                      className="flex-1 bg-[#11182a] border border-gray-600 rounded px-3 py-2 text-white font-semibold focus:border-[#00D9FF] focus:outline-none"
                    />
                  ) : (
                    <h3 className="text-lg font-bold text-white">{task.product}</h3>
                  )}
                  {editingTaskId === task.id && taskDraft ? (
                    <select
                      value={taskDraft.status}
                      onChange={(e) => setTaskDraft((prev) => (prev ? { ...prev, status: e.target.value } : prev))}
                      className="px-3 py-1 rounded border border-gray-600 bg-[#11182a] text-xs font-semibold text-white focus:border-[#00D9FF] focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Paused">Paused</option>
                    </select>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      task.status === 'Active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {task.status}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Merchant:{' '}
                  {editingTaskId === task.id && taskDraft ? (
                    <input
                      type="text"
                      value={taskDraft.merchant}
                      onChange={(e) => setTaskDraft((prev) => (prev ? { ...prev, merchant: e.target.value } : prev))}
                      className="ml-1 bg-[#11182a] border border-gray-600 rounded px-2 py-1 text-white font-semibold focus:border-[#00D9FF] focus:outline-none"
                    />
                  ) : (
                    <span className="text-white font-semibold">{task.merchant}</span>
                  )}
                </p>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-[#1a1f2e] p-3 rounded-lg">
                    <p className="text-gray-400 text-xs">Product Price</p>
                    {editingTaskId === task.id && taskDraft ? (
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={taskDraft.price}
                        onChange={(e) => setTaskDraft((prev) => (prev ? { ...prev, price: e.target.value } : prev))}
                        className="w-full bg-[#11182a] border border-gray-600 rounded px-2 py-1 text-white font-bold text-lg focus:border-[#00D9FF] focus:outline-none"
                      />
                    ) : (
                      <p className="text-white font-bold text-lg">${task.price.toFixed(2)}</p>
                    )}
                  </div>
                  <div className="bg-[#1a1f2e] p-3 rounded-lg">
                    <p className="text-gray-400 text-xs">Commission</p>
                    {editingTaskId === task.id && taskDraft ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={taskDraft.commissionPercent}
                          onChange={(e) => setTaskDraft((prev) => (prev ? { ...prev, commissionPercent: e.target.value } : prev))}
                          className="w-full bg-[#11182a] border border-gray-600 rounded px-2 py-1 text-[#00D9FF] font-bold text-lg focus:border-[#00D9FF] focus:outline-none"
                        />
                        <span className="text-[#00D9FF] font-bold">%</span>
                      </div>
                    ) : (
                      <p className="text-[#00D9FF] font-bold text-lg">{(task.commission * 100).toFixed(2)}%</p>
                    )}
                  </div>
                  <div className="bg-[#1a1f2e] p-3 rounded-lg">
                    <p className="text-gray-400 text-xs">Assigned Users</p>
                    <p className="text-purple-300 font-bold text-lg">{task.assignedUsers}</p>
                  </div>
                  <div className="bg-[#1a1f2e] p-3 rounded-lg">
                    <p className="text-gray-400 text-xs">Completed Today</p>
                    <p className="text-green-300 font-bold text-lg">{task.completedToday}</p>
                  </div>
                </div>
                {editingTaskId === task.id && taskDraft ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <input
                      type="url"
                      value={taskDraft.productUrl}
                      onChange={(e) => setTaskDraft((prev) => (prev ? { ...prev, productUrl: e.target.value } : prev))}
                      className="bg-[#11182a] border border-gray-600 rounded px-3 py-2 text-white focus:border-[#00D9FF] focus:outline-none"
                      placeholder="Product URL"
                    />
                    <input
                      type="text"
                      value={taskDraft.image}
                      onChange={(e) => setTaskDraft((prev) => (prev ? { ...prev, image: e.target.value } : prev))}
                      className="bg-[#11182a] border border-gray-600 rounded px-3 py-2 text-white focus:border-[#00D9FF] focus:outline-none"
                      placeholder="Image URL"
                    />
                  </div>
                ) : task.productUrl ? (
                  <a href={task.productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 text-sm text-[#00D9FF] hover:underline">
                    <LinkIcon size={14} />
                    View product URL
                  </a>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 ml-4">
                {editingTaskId === task.id ? (
                  <>
                    <button
                      onClick={() => handleSaveTaskInlineEdit(task.id)}
                      className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                      title="Save"
                    >
                      <Check size={18} className="text-green-400" />
                    </button>
                    <button
                      onClick={handleCancelTaskInlineEdit}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                      title="Cancel"
                    >
                      <X size={18} className="text-red-400" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleStartTaskInlineEdit(task)}
                      className="p-2 bg-[#1a1f2e] hover:bg-blue-500/20 rounded-lg transition-colors"
                      title="Edit Task"
                    >
                      <Edit size={18} className="text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteTaskInline(task.id)}
                      className="p-2 bg-[#1a1f2e] hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
