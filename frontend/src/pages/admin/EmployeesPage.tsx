import { useState } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, TrendingUp, Search, Copy, Check } from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useEmployeePerformance } from '../../hooks/useUsers';
import { User } from '../../types/index';
import { useForm } from 'react-hook-form';
import Table, { Column } from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import { formatDate, cn } from '../../utils/helpers';
import { EmployeePerformance } from '../../types/index';

interface UserForm {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

function EmployeeFormModal({
  open,
  onClose,
  defaultValues,
  onSubmit,
  isLoading,
  isEdit,
}: {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<User>;
  onSubmit: (data: UserForm) => void;
  isLoading: boolean;
  isEdit: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserForm>({
    defaultValues: {
      name: defaultValues?.name ?? '',
      email: defaultValues?.email ?? '',
      phone: defaultValues?.phone ?? '',
      role: defaultValues?.role ?? 'EMPLOYEE',
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Employee' : 'Add Employee'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Full Name *</label>
          <input
            {...register('name', { required: 'Name is required' })}
            className="input"
            placeholder="Employee name"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Email *</label>
          <input
            {...register('email', { required: 'Email is required' })}
            type="email"
            className="input"
            placeholder="employee@example.com"
          />
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
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Add Employee'}
          </button>
        </div>
      </form>
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
    <Modal open={open} onClose={onClose} title="Account Created" size="sm">
      <div className="space-y-4">
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm font-semibold text-green-800">Employee account created successfully.</p>
          <p className="text-xs text-green-700 mt-0.5">Share these login credentials with the employee.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Login URL</label>
            <div className="flex items-center gap-2">
              <input readOnly value={window.location.origin + '/login'} className="input text-sm bg-slate-50" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <div className="flex items-center gap-2">
              <input readOnly value={email} className="input text-sm bg-slate-50 flex-1" />
              <button
                onClick={() => copy(email, setCopiedEmail)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 flex-shrink-0 transition-colors"
                title="Copy email"
              >
                {copiedEmail ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="flex items-center gap-2">
              <input readOnly value={password} className="input text-sm bg-slate-50 flex-1 font-mono" />
              <button
                onClick={() => copy(password, setCopiedPass)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 flex-shrink-0 transition-colors"
                title="Copy password"
              >
                {copiedPass ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">This is the only time the password will be shown. The employee can change it from their settings.</p>

        <div className="flex justify-end">
          <button onClick={onClose} className="btn-primary">Done</button>
        </div>
      </div>
    </Modal>
  );
}

function PerformanceModal({ open, onClose, employee }: { open: boolean; onClose: () => void; employee: EmployeePerformance | null }) {
  if (!employee) return null;
  return (
    <Modal open={open} onClose={onClose} title="Employee Performance" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={employee.name} size="lg" />
          <div>
            <p className="font-bold text-slate-900">{employee.name}</p>
            <p className="text-sm text-slate-500">{employee.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Leads', value: employee.total, color: 'text-slate-900' },
            { label: 'Active', value: employee.active, color: 'text-primary-700' },
            { label: 'Confirmed', value: employee.confirmed, color: 'text-green-700' },
            { label: 'Lost', value: employee.lost, color: 'text-red-700' },
            { label: 'Overdue', value: employee.overdue, color: 'text-orange-700' },
            { label: 'Conversion', value: `${employee.conversionRate}%`, color: parseFloat(employee.conversionRate) >= 50 ? 'text-green-700' : parseFloat(employee.conversionRate) >= 25 ? 'text-yellow-700' : 'text-red-700' },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
              <p className={cn('text-2xl font-bold', item.color)}>{item.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default function AdminEmployeesPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [perfEmployee, setPerfEmployee] = useState<EmployeePerformance | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

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

  const handleToggleActive = (user: User) => {
    updateUser.mutate({ id: user.id, isActive: !user.isActive });
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div>
            <p className="font-medium text-slate-800">{row.name}</p>
            <p className="text-xs text-slate-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => <span className="text-sm text-slate-600">{row.phone ?? '—'}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <span className={cn('badge', row.role === 'ADMIN' ? 'bg-mountain-100 text-mountain-700' : 'bg-primary-100 text-primary-700')}>
          {row.role}
        </span>
      ),
    },
    {
      key: 'leads',
      header: 'Leads',
      render: (row) => {
        const perf = getPerf(row.id);
        return <span className="font-medium">{perf?.total ?? row._count?.assignedLeads ?? 0}</span>;
      },
    },
    {
      key: 'conversion',
      header: 'Conversion',
      render: (row) => {
        const perf = getPerf(row.id);
        if (!perf) return <span className="text-slate-400">—</span>;
        const rate = parseFloat(perf.conversionRate);
        return (
          <span className={cn('font-semibold', rate >= 50 ? 'text-green-600' : rate >= 25 ? 'text-yellow-600' : 'text-red-600')}>
            {perf.conversionRate}%
          </span>
        );
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleActive(row); }}
          className={cn('flex items-center gap-1.5 text-xs font-medium', row.isActive ? 'text-green-700' : 'text-slate-400')}
        >
          {row.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          {row.isActive ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const perf = getPerf(row.id);
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {perf && (
              <button
                onClick={() => setPerfEmployee(perf)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-mountain-600 transition-colors"
                title="View Performance"
              >
                <TrendingUp className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setEditUser(row)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeleteUserId(row.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Employees</h2>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} team members</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Employee</span>
        </button>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="input py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <Table
          columns={columns}
          data={users}
          loading={isLoading}
          emptyMessage="No employees found"
        />
      </div>

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
          isEdit={true}
        />
      )}

      <Modal open={!!deleteUserId} onClose={() => setDeleteUserId(null)} title="Delete Employee" size="sm">
        <p className="text-slate-600">Are you sure you want to delete this employee? This action cannot be undone.</p>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setDeleteUserId(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} disabled={deleteUser.isPending} className="btn-danger">
            {deleteUser.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>

      <PerformanceModal
        open={!!perfEmployee}
        onClose={() => setPerfEmployee(null)}
        employee={perfEmployee}
      />

      <CredentialsModal
        open={!!createdCreds}
        onClose={() => setCreatedCreds(null)}
        email={createdCreds?.email ?? ''}
        password={createdCreds?.password ?? ''}
      />
    </div>
  );
}
