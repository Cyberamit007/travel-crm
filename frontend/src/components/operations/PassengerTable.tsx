import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  ChevronDown, ChevronUp, Phone, Plus, Pencil, Trash2, IndianRupee,
  AlertCircle, CheckCircle, Search,
} from 'lucide-react';
import { useCreateTraveler, useUpdateTraveler, useDeleteTraveler } from '../../hooks/useOperations';
import { Departure, DepartureBooking, Traveler } from '../../types/index';
import Modal from '../ui/Modal';
import { formatCurrency, cn } from '../../utils/helpers';

const BOOKING_STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-600',
  COMPLETED: 'bg-slate-100 text-slate-600',
};

interface TravelerForm {
  name: string;
  mobile?: string;
  gender?: string;
  age?: number;
  seatNumber?: string;
  pickupPoint?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  roomSharing?: string;
  foodPreference?: string;
  isChild?: boolean;
  isSeniorCitizen?: boolean;
  needsExtraMattress?: boolean;
  specialNotes?: string;
}

function TravelerFormModal({
  open, onClose, defaultValues, onSubmit, isLoading,
}: {
  open: boolean; onClose: () => void; defaultValues?: Partial<Traveler>;
  onSubmit: (data: TravelerForm) => void; isLoading: boolean;
}) {
  const { register, handleSubmit } = useForm<TravelerForm>({
    defaultValues: {
      name: defaultValues?.name ?? '',
      mobile: defaultValues?.mobile ?? '',
      gender: defaultValues?.gender ?? '',
      age: defaultValues?.age,
      seatNumber: defaultValues?.seatNumber ?? '',
      pickupPoint: defaultValues?.pickupPoint ?? '',
      emergencyContactName: defaultValues?.emergencyContactName ?? '',
      emergencyContactPhone: defaultValues?.emergencyContactPhone ?? '',
      roomSharing: defaultValues?.roomSharing ?? '',
      foodPreference: defaultValues?.foodPreference ?? '',
      isChild: defaultValues?.isChild ?? false,
      isSeniorCitizen: defaultValues?.isSeniorCitizen ?? false,
      needsExtraMattress: defaultValues?.needsExtraMattress ?? false,
      specialNotes: defaultValues?.specialNotes ?? '',
    },
  });

  return (
    <Modal
      open={open} onClose={onClose} title={defaultValues ? 'Edit Traveler' : 'Add Traveler'} size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button form="traveler-form" type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Saving…' : defaultValues ? 'Update' : 'Add Traveler'}
          </button>
        </>
      }
    >
      <form id="traveler-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Full Name *</label>
          <input {...register('name', { required: true })} className="input" placeholder="Traveler name" />
        </div>
        <div>
          <label className="label">Mobile</label>
          <input {...register('mobile')} className="input" placeholder="+91-" />
        </div>
        <div>
          <label className="label">Gender</label>
          <select {...register('gender')} className="input">
            <option value="">—</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="label">Age</label>
          <input type="number" {...register('age')} className="input" placeholder="Age" />
        </div>
        <div>
          <label className="label">Seat Number</label>
          <input {...register('seatNumber')} className="input" placeholder="e.g. A4" />
        </div>
        <div>
          <label className="label">Pickup Point</label>
          <input {...register('pickupPoint')} className="input" placeholder="Pickup location" />
        </div>
        <div>
          <label className="label">Room Sharing</label>
          <select {...register('roomSharing')} className="input">
            <option value="">Use booking default</option>
            <option value="SINGLE">Single</option>
            <option value="DOUBLE">Double</option>
            <option value="TRIPLE">Triple</option>
            <option value="QUAD">Quad</option>
          </select>
        </div>
        <div>
          <label className="label">Food Preference</label>
          <select {...register('foodPreference')} className="input">
            <option value="">Use booking default</option>
            <option value="VEG">Veg</option>
            <option value="NON_VEG">Non-Veg</option>
            <option value="JAIN">Jain</option>
          </select>
        </div>
        <div>
          <label className="label">Emergency Contact Name</label>
          <input {...register('emergencyContactName')} className="input" />
        </div>
        <div>
          <label className="label">Emergency Contact Phone</label>
          <input {...register('emergencyContactPhone')} className="input" />
        </div>
        <div className="sm:col-span-2 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('isChild')} className="rounded border-slate-300" /> Child
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('isSeniorCitizen')} className="rounded border-slate-300" /> Senior Citizen
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('needsExtraMattress')} className="rounded border-slate-300" /> Needs Extra Mattress
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Special Notes</label>
          <textarea {...register('specialNotes')} className="input" rows={2} placeholder="Any special requirement..." />
        </div>
      </form>
    </Modal>
  );
}

function BookingCard({ booking, departureId }: { booking: DepartureBooking; departureId: string }) {
  const [expanded, setExpanded] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTraveler, setEditTraveler] = useState<Traveler | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const createTraveler = useCreateTraveler(departureId);
  const updateTraveler = useUpdateTraveler(departureId);
  const deleteTraveler = useDeleteTraveler(departureId);

  const handleAdd = (data: TravelerForm) => {
    createTraveler.mutate({ bookingId: booking.id, ...data, age: data.age ? Number(data.age) : undefined } as any, {
      onSuccess: () => setAddOpen(false),
    });
  };
  const handleEdit = (data: TravelerForm) => {
    if (!editTraveler) return;
    updateTraveler.mutate({ id: editTraveler.id, ...data, age: data.age ? Number(data.age) : undefined } as any, {
      onSuccess: () => setEditTraveler(null),
    });
  };
  const handleDelete = () => {
    if (!deleteId) return;
    deleteTraveler.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0 flex-wrap">
          <div>
            <p className="font-semibold text-slate-800 text-sm">{booking.lead?.name ?? booking.travelerName}</p>
            <p className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{booking.lead?.phone}</p>
          </div>
          <span className="text-xs text-slate-500">Booking #{booking.bookingNumber ?? booking.id.slice(0, 8)}</span>
          <span className="text-xs text-slate-500">{booking.numberOfTravelers} traveler(s)</span>
          <span className={cn('badge', BOOKING_STATUS_BADGE[booking.status])}>{booking.status}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-0.5 justify-end"><IndianRupee className="w-3 h-3" />{formatCurrency(booking.amountPaid)} paid</p>
            {booking.balanceAmount > 0 ? (
              <p className="text-xs text-orange-500">{formatCurrency(booking.balanceAmount)} pending</p>
            ) : (
              <p className="text-xs text-emerald-600 flex items-center gap-0.5 justify-end"><CheckCircle className="w-2.5 h-2.5" />Paid</p>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {(booking.specialRequest || booking.bookingNotes) && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{booking.specialRequest || booking.bookingNotes}</span>
            </div>
          )}

          {booking.travelers.length === 0 ? (
            <p className="text-xs text-slate-400">No individual traveler details added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 uppercase tracking-wide text-[10px]">
                    <th className="text-left px-2 py-1.5">Name</th>
                    <th className="text-left px-2 py-1.5">Mobile</th>
                    <th className="text-left px-2 py-1.5">Gender</th>
                    <th className="text-left px-2 py-1.5">Age</th>
                    <th className="text-left px-2 py-1.5">Seat</th>
                    <th className="text-left px-2 py-1.5">Pickup</th>
                    <th className="text-left px-2 py-1.5">Emergency Contact</th>
                    <th className="text-left px-2 py-1.5">Room</th>
                    <th className="text-left px-2 py-1.5">Food</th>
                    <th className="px-2 py-1.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {booking.travelers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-2 py-2 font-medium text-slate-700">
                        {t.name}
                        <div className="flex gap-1 mt-0.5">
                          {t.isChild && <span className="badge badge-muted text-[9px]">Child</span>}
                          {t.isSeniorCitizen && <span className="badge badge-muted text-[9px]">Senior</span>}
                          {t.needsExtraMattress && <span className="badge badge-muted text-[9px]">Extra Mattress</span>}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-slate-500">{t.mobile || '—'}</td>
                      <td className="px-2 py-2 text-slate-500">{t.gender || '—'}</td>
                      <td className="px-2 py-2 text-slate-500">{t.age ?? '—'}</td>
                      <td className="px-2 py-2 text-slate-500">{t.seatNumber || '—'}</td>
                      <td className="px-2 py-2 text-slate-500">{t.pickupPoint || '—'}</td>
                      <td className="px-2 py-2 text-slate-500">{t.emergencyContactName ? `${t.emergencyContactName} (${t.emergencyContactPhone || '—'})` : '—'}</td>
                      <td className="px-2 py-2 text-slate-500">{t.roomSharing || booking.roomSharing}</td>
                      <td className="px-2 py-2 text-slate-500">{t.foodPreference || booking.foodPreference}</td>
                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        <button onClick={() => setEditTraveler(t)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-primary-600">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => setDeleteId(t.id)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700">
            <Plus className="w-3.5 h-3.5" />Add Traveler
          </button>
        </div>
      )}

      <TravelerFormModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleAdd} isLoading={createTraveler.isPending} />
      <TravelerFormModal open={!!editTraveler} onClose={() => setEditTraveler(null)} defaultValues={editTraveler ?? undefined} onSubmit={handleEdit} isLoading={updateTraveler.isPending} />

      <Modal
        open={!!deleteId} onClose={() => setDeleteId(null)} title="Remove Traveler" size="sm"
        footer={<>
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} disabled={deleteTraveler.isPending} className="btn-danger">{deleteTraveler.isPending ? 'Removing…' : 'Remove'}</button>
        </>}
      >
        <p className="text-sm text-slate-600">Remove this traveler from the passenger list?</p>
      </Modal>
    </div>
  );
}

export default function PassengerTable({ departure }: { departure: Departure }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'paid' | 'pending'>('name');

  const filtered = useMemo(() => {
    let list = departure.bookings;
    if (statusFilter) list = list.filter((b) => b.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((b) =>
        b.lead?.name?.toLowerCase().includes(q) ||
        b.lead?.phone?.includes(q) ||
        b.travelers.some((t) => t.name.toLowerCase().includes(q))
      );
    }
    const sorted = [...list];
    if (sortBy === 'name') sorted.sort((a, b) => (a.lead?.name ?? '').localeCompare(b.lead?.name ?? ''));
    if (sortBy === 'paid') sorted.sort((a, b) => b.amountPaid - a.amountPaid);
    if (sortBy === 'pending') sorted.sort((a, b) => b.balanceAmount - a.balanceAmount);
    return sorted;
  }, [departure.bookings, search, statusFilter, sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone..."
            className="input py-1.5 pl-8 text-sm"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input py-1.5 text-sm w-auto">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="input py-1.5 text-sm w-auto">
          <option value="name">Sort: Name</option>
          <option value="paid">Sort: Amount Paid</option>
          <option value="pending">Sort: Pending Amount</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p className="text-sm text-slate-400">No bookings match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => <BookingCard key={b.id} booking={b} departureId={departure.id} />)}
        </div>
      )}
    </div>
  );
}
