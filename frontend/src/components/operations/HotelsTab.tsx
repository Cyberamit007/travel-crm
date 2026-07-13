import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Plus, Pencil, Trash2, MapPin, Phone, FileCheck } from 'lucide-react';
import { useCreateHotel, useUpdateHotel, useDeleteHotel } from '../../hooks/useOperations';
import { Hotel } from '../../types/index';
import Modal from '../ui/Modal';
import { formatDate, cn } from '../../utils/helpers';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-600',
};

interface HotelForm {
  name: string; location?: string; checkInDate?: string; checkOutDate?: string;
  numberOfRooms?: number; roomAllocation?: string; vendorName?: string; vendorContact?: string;
  confirmationNumber?: string; status: string;
}

function HotelFormModal({ open, onClose, defaultValues, onSubmit, isLoading }: {
  open: boolean; onClose: () => void; defaultValues?: Partial<Hotel>;
  onSubmit: (data: HotelForm) => void; isLoading: boolean;
}) {
  const { register, handleSubmit } = useForm<HotelForm>({
    defaultValues: {
      name: defaultValues?.name ?? '',
      location: defaultValues?.location ?? '',
      checkInDate: defaultValues?.checkInDate?.slice(0, 10) ?? '',
      checkOutDate: defaultValues?.checkOutDate?.slice(0, 10) ?? '',
      numberOfRooms: defaultValues?.numberOfRooms,
      roomAllocation: defaultValues?.roomAllocation ?? '',
      vendorName: defaultValues?.vendorName ?? '',
      vendorContact: defaultValues?.vendorContact ?? '',
      confirmationNumber: defaultValues?.confirmationNumber ?? '',
      status: defaultValues?.status ?? 'PENDING',
    },
  });

  return (
    <Modal
      open={open} onClose={onClose} title={defaultValues ? 'Edit Hotel' : 'Add Hotel'} size="lg"
      footer={<>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button form="hotel-form" type="submit" disabled={isLoading} className="btn-primary">{isLoading ? 'Saving…' : defaultValues ? 'Update' : 'Add Hotel'}</button>
      </>}
    >
      <form id="hotel-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Hotel Name *</label>
          <input {...register('name', { required: true })} className="input" placeholder="Hotel name" />
        </div>
        <div>
          <label className="label">Location</label>
          <input {...register('location')} className="input" />
        </div>
        <div>
          <label className="label">Status</label>
          <select {...register('status')} className="input">
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="label">Check-in Date</label>
          <input type="date" {...register('checkInDate')} className="input" />
        </div>
        <div>
          <label className="label">Check-out Date</label>
          <input type="date" {...register('checkOutDate')} className="input" />
        </div>
        <div>
          <label className="label">Number of Rooms</label>
          <input type="number" {...register('numberOfRooms')} className="input" />
        </div>
        <div>
          <label className="label">Confirmation Number</label>
          <input {...register('confirmationNumber')} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Room Allocation</label>
          <input {...register('roomAllocation')} className="input" placeholder="e.g. 5 Double, 2 Triple" />
        </div>
        <div>
          <label className="label">Vendor Name</label>
          <input {...register('vendorName')} className="input" />
        </div>
        <div>
          <label className="label">Vendor Contact</label>
          <input {...register('vendorContact')} className="input" />
        </div>
      </form>
    </Modal>
  );
}

export default function HotelsTab({ departureId, hotels }: { departureId: string; hotels: Hotel[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editHotel, setEditHotel] = useState<Hotel | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const createHotel = useCreateHotel(departureId);
  const updateHotel = useUpdateHotel(departureId);
  const deleteHotel = useDeleteHotel(departureId);

  return (
    <div className="space-y-4">
      <button onClick={() => setAddOpen(true)} className="btn-primary text-sm">
        <Plus className="w-4 h-4" />Add Hotel
      </button>

      {hotels.length === 0 ? (
        <div className="empty-state">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No hotels added yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {hotels.map((h) => (
            <div key={h.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{h.name}</p>
                  {h.location && <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{h.location}</p>}
                </div>
                <span className={cn('badge', STATUS_BADGE[h.status])}>{h.status}</span>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                {h.checkInDate && <p>Check-in: {formatDate(h.checkInDate)}</p>}
                {h.checkOutDate && <p>Check-out: {formatDate(h.checkOutDate)}</p>}
                {h.numberOfRooms && <p>{h.numberOfRooms} room(s){h.roomAllocation ? ` — ${h.roomAllocation}` : ''}</p>}
                {h.confirmationNumber && <p className="flex items-center gap-1"><FileCheck className="w-3 h-3" />{h.confirmationNumber}</p>}
                {h.vendorName && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{h.vendorName} {h.vendorContact && `· ${h.vendorContact}`}</p>}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => setEditHotel(h)} className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  <Pencil className="w-3 h-3" />Edit
                </button>
                <button onClick={() => setDeleteId(h.id)} className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <HotelFormModal
        open={addOpen} onClose={() => setAddOpen(false)} isLoading={createHotel.isPending}
        onSubmit={(data) => createHotel.mutate(data as any, { onSuccess: () => setAddOpen(false) })}
      />
      <HotelFormModal
        open={!!editHotel} onClose={() => setEditHotel(null)} defaultValues={editHotel ?? undefined} isLoading={updateHotel.isPending}
        onSubmit={(data) => editHotel && updateHotel.mutate({ id: editHotel.id, ...data } as any, { onSuccess: () => setEditHotel(null) })}
      />
      <Modal
        open={!!deleteId} onClose={() => setDeleteId(null)} title="Remove Hotel" size="sm"
        footer={<>
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
          <button onClick={() => deleteId && deleteHotel.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} disabled={deleteHotel.isPending} className="btn-danger">
            {deleteHotel.isPending ? 'Removing…' : 'Remove'}
          </button>
        </>}
      >
        <p className="text-sm text-slate-600">Remove this hotel from the departure?</p>
      </Modal>
    </div>
  );
}
