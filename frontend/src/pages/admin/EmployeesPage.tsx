import { useState } from 'react';
import {
  Plus, Edit, Trash2, TrendingUp, Search, Copy, Check, KeyRound,
  UserCircle, Mail, Phone, ToggleLeft, ToggleRight, Users,
} from 'lucide-react';
import {
  useUsers, useCreateUser, useUpdateUser, useDeleteUser,
  useEmployeePerformance, useResetEmployeePassword,
} from '../../hooks/useUsers';
import { User } from '../../types/index';
import { useForm } from 'react-hook-form';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import AvailabilityBadge from '../../components/ui/AvailabilityBadge';
import EmployeeProfileModal from '../../components/employees/EmployeeProfileModal';
import { formatDate, cn } from '../../utils/helpers';
import { EmployeePerformance } from '../../types/index';
import { Skeleton } from '../../components/ui/Skeleton';

interface UserForm {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

// ─── Sub-modals ───────────────────────────────────────────────────────────────

function EmployeeFormModal({
  open, onClose, defaultValues, onSubmit, isLoading, isEdit,
}: {
  open: boolean; onClose: () => void; defaultValues?: Partial<User>;
  onSubmit: (data: UserForm) => void; isLoading: boolean; isEdit: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<UserForm>({
    defaultValues: {
      name: defaultValues?.name ?? '',
      email: defaultValues?.email ?? '',
      phone: defaultValues?.phone ?? '',
      role: defaultValues?.role ?? 'EMPLOYEE',
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Employee' : 'Add Employee'}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button form="employee-form" type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Saving…' : isEdit ? 'Update' : 'Add Employee'}
          </button>
        </>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Full Name *</label>
          <input {...register('name', { required: 'Name is required' })} className="input" placeholder="Employee name" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Email *</label>
          <input {...register('email', { required: 'Email is required' })} type="email" className="input" placeholder="employee@example.com" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        {!isEdit && (
          <div>
            <label className="label">Password *</label>
            <input
              {...register('password', { required: !isEdit ? 'Password is required' : false, minLength: { value: 6, message: 'Minimum 6 characters' } })}
              type="password"
              className="input"
              placeholder="Minimum 6 characters"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
        )}
        <div>
          <label className="label">Phone</label>
          <input {...register('phone')} className="input" placeholder="+91 98765 43210" />
        </div>
        <div>
          <label className="label">Role</label>
          <select {...register('role')} className="input">
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ open, onClose, user }: { open: boolean; onClose: () => void; user: User | null }) {
  const [newPassword, setNewPassword] = useState('');
  const [show, setShow] = useState(false);
  const resetPassword = useResetEmployeePassword();

  const handleSubmit = () => {
    if (!user || newPassword.length < 8) return;
    resetPassword.mutate({ id: user.id, newPassword }, { onSuccess: () => { onClose(); setNewPassword(''); setShow(false); } });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reset Password"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={newPassword.length < 8 || resetPassword.isPending} className="btn-primary">
            {resetPassword.isPending ? 'Resetting…' : 'Reset Password'}
          </button>
        </>
      }
    >
      {user && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <div>
            <label className="label">New Password *</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input pr-10"
                placeholder="Minimum 8 characters"
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                {show ? '🙈' : '👁'}
              </button>
            </div>
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className="text-red-500 text-xs mt-1">Minimum 8 characters</p>
            )}
          </div>
          <p className="text-xs text-slate-400">The employee's current sessions will be logged out immediately.</p>
        </div>
      )}
    </Modal>
  );
}

function CredentialsModal({ open, onClose, email, password }: { open: boolean; onClose: () => void; email: string; password: string }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title="Account Created" size="sm" footer={<button onClick={onClose} className="btn-primary">Done</button>}>
      <div className="space-y-4">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-sm font-semibold text-emerald-800">Employee account created successfully.</p>
          <p className="text-xs text-emerald-700 mt-0.5">Share these login credentials with the employee.</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Login URL</label>
            <input readOnly value={window.location.origin + '/login'} className="input text-sm bg-slate-50" />
          </div>
          <div>
            <label className="label">Email</label>
            <div className="flex items-center gap-2">
              <input readOnly value={email} className="input text-sm bg-slate-50 flex-1" />
              <button onClick={() => copy(email, setCopiedEmail)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors flex-shrink-0">
                {copiedEmail ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="flex items-center gap-2">
              <input readOnly value={password} className="input text-sm bg-slate-50 flex-1 font-mono" />
              <button onClick={() => copy(password, setCopiedPass)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors flex-shrink-0">
                {copiedPass ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400">This is the only time the password will be shown. The employee can change it from their settings.</p>
      </div>
    </Modal>
  );
}

function PerformanceModal({ open, onClose, employee }: { open: boolean; onClose: () => void; employee: EmployeePerformance | null }) {
  if (!employee) return null;
  const rate = parseFloat(employee.conversionRate);
  return (
    <Modal open={open} onClose={onClose} title="Performance" size="sm" footer={<button onClick={onClose} className="btn-secondary">Close</button>}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={employee.name} size="lg" />
          <div>
            <p className="font-bold text-slate-900">{employee.name}</p>
            <p className="text-sm text-slate-500">{employee.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'Total', value: employee.total, color: 'text-slate-800' },
            { label: 'Active', value: employee.active, color: 'text-primary-700' },
            { label: 'Confirmed', value: employee.confirmed, color: 'text-emerald-700' },
            { label: 'Lost', value: employee.lost, color: 'text-red-700' },
            { label: 'Overdue', value: employee.overdue, color: 'text-orange-700' },
            { label: 'Conversion', value: `${employee.conversionRate}%`, color: rate >= 50 ? 'text-emerald-700' : rate >= 25 ? 'text-amber-700' : 'text-red-700' },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <p className={cn('text-xl font-bold tabular', item.color)}>{item.value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─── Employee Profile Card ────────────────────────────────────────────────────

function EmployeeCard({
  user,
  perf,
  onProfile,
  onPerf,
  onEdit,
  onDelete,
  onResetPass,
  onToggleActive,
}: {
  user: User;
  perf?: EmployeePerformance;
  onProfile: () => void;
  onPerf: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResetPass: () => void;
  onToggleActive: () => void;
}) {
  const rate = perf ? parseFloat(perf.conversionRate) : 0;
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className={cn('card p-5 flex flex-col gap-4 hover:shadow-md transition-all duration-200', !user.isActive && 'opacity-60')}>
      {/* Top: avatar + name + role */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onProfile} className="flex-shrink-0">
            <Avatar name={user.name} size="md" className="ring-2 ring-white shadow-sm" />
          </button>
          <div className="min-w-0">
            <button
              onClick={onProfile}
              className="font-bold text-slate-900 text-sm hover:text-primary-600 transition-colors text-left truncate block w-full"
            >
              {user.name}
            </button>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={cn(
                'badge text-[10px] px-2 py-0.5',
                isAdmin ? 'bg-mountain-100 text-mountain-700' : 'bg-primary-100 text-primary-700'
              )}>
                {user.role}
              </span>
              <AvailabilityBadge status={(user as any).availability ?? 'AVAILABLE'} size="xs" showLabel={false} />
              {!user.isActive && (
                <span className="badge text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500">Inactive</span>
              )}
            </div>
          </div>
        </div>
        {/* Action menu */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {perf && (
            <button onClick={onPerf} className="btn-ghost p-1.5" title="Performance">
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onResetPass} className="btn-ghost p-1.5" title="Reset password">
            <KeyRound className="w-3.5 h-3.5" />
          </button>
          <button onClick={onEdit} className="btn-ghost p-1.5" title="Edit">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="btn-ghost p-1.5 hover:text-red-600" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-1.5">
        <a href={`mailto:${user.email}`} className="flex items-center gap-2 text-xs text-slate-500 hover:text-primary-600 transition-colors">
          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{user.email}</span>
        </a>
        {user.phone && (
          <a href={`tel:${user.phone}`} className="flex items-center gap-2 text-xs text-slate-500 hover:text-primary-600 transition-colors">
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            {user.phone}
          </a>
        )}
      </div>

      {/* Stats row */}
      {perf && (
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
          <div className="text-center">
            <p className="text-base font-bold text-slate-800 tabular">{perf.total}</p>
            <p className="text-[10px] text-slate-400">Leads</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-emerald-700 tabular">{perf.confirmed}</p>
            <p className="text-[10px] text-slate-400">Confirmed</p>
          </div>
          <div className="text-center">
            <p className={cn('text-base font-bold tabular', rate >= 50 ? 'text-emerald-700' : rate >= 25 ? 'text-amber-600' : 'text-red-600')}>
              {perf.conversionRate}%
            </p>
            <p className="text-[10px] text-slate-400">Conv.</p>
          </div>
        </div>
      )}

      {/* Footer: joined + toggle active */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-[10px] text-slate-400">Joined {formatDate(user.createdAt)}</span>
        <button
          onClick={onToggleActive}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium transition-colors',
            user.isActive ? 'text-emerald-600 hover:text-red-500' : 'text-slate-400 hover:text-emerald-600'
          )}
        >
          {user.isActive
            ? <ToggleRight className="w-4 h-4" />
            : <ToggleLeft className="w-4 h-4" />}
          {user.isActive ? 'Active' : 'Inactive'}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminEmployeesPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [perfEmployee, setPerfEmployee] = useState<EmployeePerformance | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const { data, isLoading } = useUsers({ search: search || undefined, limit: 100 });
  const { data: perfData } = useEmployeePerformance();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const users = data?.data ?? [];
  const performance = perfData?.data ?? [];
  const getPerf = (id: string) => performance.find((p) => p.id === id);

  const handleCreate = (formData: UserForm) => {
    createUser.mutate(formData as any, {
      onSuccess: () => {
        setCreateOpen(false);
        setCreatedCreds({ email: formData.email, password: formData.password! });
      },
    });
  };

  const handleEdit = (formData: UserForm) => {
    if (!editUser) return;
    updateUser.mutate({ id: editUser.id, ...formData }, { onSuccess: () => setEditUser(null) });
  };

  const handleDelete = () => {
    if (!deleteUserId) return;
    deleteUser.mutate(deleteUserId, { onSuccess: () => setDeleteUserId(null) });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Employees</h2>
          <p className="page-subtitle">{users.length} team member{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Employee</span>
        </button>
      </div>

      {/* Search */}
      <div className="card px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="input py-1.5 text-sm border-0 shadow-none focus:ring-0 p-0 bg-transparent"
          />
        </div>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users className="empty-state-icon" />
            <p className="empty-state-title">No employees found</p>
            <p className="empty-state-body">
              {search ? 'Try a different search term.' : 'Add your first team member to get started.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {users.map((u) => (
            <EmployeeCard
              key={u.id}
              user={u}
              perf={getPerf(u.id)}
              onProfile={() => setProfileUserId(u.id)}
              onPerf={() => { const p = getPerf(u.id); if (p) setPerfEmployee(p); }}
              onEdit={() => setEditUser(u)}
              onDelete={() => setDeleteUserId(u.id)}
              onResetPass={() => setResetPassUser(u)}
              onToggleActive={() => updateUser.mutate({ id: u.id, isActive: !u.isActive })}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <EmployeeFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isLoading={createUser.isPending}
        isEdit={false}
      />

      {editUser && (
        <EmployeeFormModal
          open={!!editUser}
          onClose={() => setEditUser(null)}
          defaultValues={editUser}
          onSubmit={handleEdit}
          isLoading={updateUser.isPending}
          isEdit
        />
      )}

      <Modal
        open={!!deleteUserId}
        onClose={() => setDeleteUserId(null)}
        title="Delete Employee"
        size="sm"
        footer={
          <>
            <button onClick={() => setDeleteUserId(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} disabled={deleteUser.isPending} className="btn-danger">
              {deleteUser.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this employee? This action cannot be undone.
        </p>
      </Modal>

      <PerformanceModal open={!!perfEmployee} onClose={() => setPerfEmployee(null)} employee={perfEmployee} />

      <CredentialsModal
        open={!!createdCreds}
        onClose={() => setCreatedCreds(null)}
        email={createdCreds?.email ?? ''}
        password={createdCreds?.password ?? ''}
      />

      <ResetPasswordModal open={!!resetPassUser} onClose={() => setResetPassUser(null)} user={resetPassUser} />

      <EmployeeProfileModal employeeId={profileUserId} onClose={() => setProfileUserId(null)} />
    </div>
  );
}
