import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CalendarClock, CheckCircle2, Circle, Loader2, Plus } from 'lucide-react';
import { useUpdateTaskStatus, useCreateTask } from '../../hooks/useOperations';
import { DepartureTask, DepartureTaskStatus } from '../../types/index';
import Modal from '../ui/Modal';
import { cn } from '../../utils/helpers';

const STATUS_CONFIG: Record<DepartureTaskStatus, { label: string; icon: typeof Circle; color: string }> = {
  PENDING: { label: 'Pending', icon: Circle, color: 'text-slate-400' },
  IN_PROGRESS: { label: 'In Progress', icon: Loader2, color: 'text-amber-500' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-500' },
};

function dayLabel(dayOffset: number) {
  if (dayOffset === 0) return 'Departure Day';
  if (dayOffset < 0) return `${Math.abs(dayOffset)} day(s) before departure`;
  return `Day ${dayOffset + 1}`;
}

function TaskRow({ task, departureId }: { task: DepartureTask; departureId: string }) {
  const updateStatus = useUpdateTaskStatus(departureId);
  const cfg = STATUS_CONFIG[task.status];

  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl bg-white">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400">{dayLabel(task.dayOffset)}</p>
        <p className="font-medium text-slate-800 text-sm">{task.title}</p>
        {task.description && <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {(['PENDING', 'IN_PROGRESS', 'COMPLETED'] as DepartureTaskStatus[]).map((s) => {
          const c = STATUS_CONFIG[s];
          const Icon = c.icon;
          const active = task.status === s;
          return (
            <button
              key={s}
              onClick={() => updateStatus.mutate({ id: task.id, status: s })}
              disabled={updateStatus.isPending}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
              )}
              title={c.label}
            >
              <Icon className={cn('w-3.5 h-3.5', active ? 'text-white' : c.color)} />
              <span className="hidden sm:inline">{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TaskForm { title: string; description?: string; dayOffset?: number; }

export default function TimelineTab({ departureId, timeline }: { departureId: string; timeline: DepartureTask[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const createTask = useCreateTask(departureId);
  const { register, handleSubmit, reset } = useForm<TaskForm>();

  const onSubmit = (data: TaskForm) => {
    createTask.mutate(
      { title: data.title, description: data.description, dayOffset: data.dayOffset !== undefined ? Number(data.dayOffset) : 0 },
      { onSuccess: () => { setAddOpen(false); reset(); } }
    );
  };

  return (
    <div className="space-y-4">
      <button onClick={() => setAddOpen(true)} className="btn-primary text-sm">
        <Plus className="w-4 h-4" />Add Activity
      </button>

      {timeline.length === 0 ? (
        <div className="empty-state">
          <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No day-wise timeline yet</p>
          <p className="text-xs text-slate-400 mt-1">Timeline auto-generates from the package's itinerary, or add activities manually.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {timeline.map((t) => <TaskRow key={t.id} task={t} departureId={departureId} />)}
        </div>
      )}

      <Modal
        open={addOpen} onClose={() => setAddOpen(false)} title="Add Timeline Activity" size="md"
        footer={<>
          <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary">Cancel</button>
          <button form="task-form" type="submit" disabled={createTask.isPending} className="btn-primary">{createTask.isPending ? 'Adding…' : 'Add Activity'}</button>
        </>}
      >
        <form id="task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Activity Title *</label>
            <input {...register('title', { required: true })} className="input" placeholder="e.g. Hotel Check-in" />
          </div>
          <div>
            <label className="label">Day Offset (0 = departure day)</label>
            <input type="number" {...register('dayOffset')} className="input" placeholder="0" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} className="input" rows={2} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
