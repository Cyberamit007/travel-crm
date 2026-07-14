import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  ChevronDown, ChevronUp, Phone, Plus, Pencil, Trash2, IndianRupee,
  AlertCircle, CheckCircle, Search, Check, X, MessageSquareWarning, Link2, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useCreateTraveler, useUpdateTraveler, useDeleteTraveler,
  useApproveTraveler, useRejectTraveler, useRequestTravelerCorrection, useRegeneratePortalLink,
} from '../../hooks/useOperations';
import { Departure, DepartureBooking, Traveler } from '../../types/index';
import Modal from '../ui/Modal';
import { formatCurrency, cn } from '../../utils/helpers';

const BOOKING_STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-600',
  COMPLETED: 'bg-slate-100 text-slate-600',
};

const VERIFICATION_STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-500',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  VERIFIED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-600',
  CORRECTION_REQUESTED: 'bg-orange-50 text-orange-700',
};
const VERIFICATION_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Not Submitted',
  SUBMITTED: 'Pending Review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  CORRECTION_REQUESTED: 'Correction Requested',
};

const PHONE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const todayISO = () => new Date().toISOString().slice(0, 10);

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}

interface TravelerForm {
  name: string;
  mobile?: string;
  email?: string;
  gender?: string;
  dob?: string;
  age?: number;
  bloodGroup?: string;
  nationality?: string;
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
  govIdType?: string;
  govIdNumber?: string;
  medicalConditions?: string;
  arrivalDetails?: string;
  departureDetails?: string;
  flightBookedByUs?: string;
  pickupDropBookedByUs?: string;
}

function boolToSelect(v: boolean | null | undefined): string {
  return v === true ? 'yes' : v === false ? 'no' : '';
}

function TravelerFormModal({
  open, onClose, defaultValues, onSubmit, isLoading,
}: {
  open: boolean; onClose: () => void; defaultValues?: Partial<Traveler>;
  onSubmit: (data: TravelerForm) => void; isLoading: boolean;
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<TravelerForm>({
    defaultValues: {
      name: defaultValues?.name ?? '',
      mobile: defaultValues?.mobile ?? '',
      email: defaultValues?.email ?? '',
      gender: defaultValues?.gender ?? '',
      dob: defaultValues?.dob ? defaultValues.dob.slice(0, 10) : '',
      age: defaultValues?.age,
      bloodGroup: defaultValues?.bloodGroup ?? '',
      nationality: defaultValues?.nationality ?? '',
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
      govIdType: defaultValues?.govIdType ?? '',
      govIdNumber: defaultValues?.govIdNumber ?? '',
      medicalConditions: defaultValues?.medicalConditions ?? '',
      arrivalDetails: defaultValues?.arrivalDetails ?? '',
      departureDetails: defaultValues?.departureDetails ?? '',
      flightBookedByUs: boolToSelect(defaultValues?.flightBookedByUs),
      pickupDropBookedByUs: boolToSelect(defaultValues?.pickupDropBookedByUs),
    },
  });

  const flightBookedByUs = watch('flightBookedByUs');

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
          <input
            {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' }, maxLength: { value: 100, message: 'Name is too long' } })}
            className="input" placeholder="Traveler name"
          />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <label className="label">Mobile</label>
          <input
            {...register('mobile', { validate: (v) => !v || PHONE_PATTERN.test(v) || 'Enter a valid 10-digit mobile number' })}
            className="input" placeholder="98765 43210"
          />
          <FieldError message={errors.mobile?.message} />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            {...register('email', { validate: (v) => !v || EMAIL_PATTERN.test(v) || 'Enter a valid email address' })}
            className="input" placeholder="traveler@email.com"
          />
          <FieldError message={errors.email?.message} />
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
          <label className="label">Date of Birth</label>
          <input
            type="date" max={todayISO()}
            {...register('dob', {
              validate: (v) => {
                if (!v) return true;
                const d = new Date(v);
                if (d > new Date()) return 'Date of birth cannot be in the future';
                if (new Date().getFullYear() - d.getFullYear() > 120) return 'Enter a valid date of birth';
                return true;
              },
            })}
            className="input"
          />
          <FieldError message={errors.dob?.message} />
        </div>
        <div>
          <label className="label">Age</label>
          <input
            type="number"
            {...register('age', { min: { value: 0, message: 'Age cannot be negative' }, max: { value: 120, message: 'Enter a valid age' } })}
            className="input" placeholder="Age"
          />
          <FieldError message={errors.age?.message} />
        </div>
        <div>
          <label className="label">Blood Group</label>
          <select {...register('bloodGroup')} className="input">
            <option value="">—</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Nationality</label>
          <input {...register('nationality')} className="input" placeholder="e.g. Indian" />
        </div>
        <div>
          <label className="label">Government ID Type</label>
          <select {...register('govIdType')} className="input">
            <option value="">—</option>
            <option value="AADHAR">Aadhar</option>
            <option value="PASSPORT">Passport</option>
            <option value="VOTER_ID">Voter ID</option>
            <option value="DRIVING_LICENSE">Driving License</option>
          </select>
        </div>
        <div>
          <label className="label">Government ID Number</label>
          <input
            {...register('govIdNumber', {
              validate: (v) => {
                if (!v) return true;
                if (watch('govIdType') === 'AADHAR') return /^\d{12}$/.test(v.replace(/\s/g, '')) || 'Aadhar number must be 12 digits';
                return v.trim().length >= 4 || 'Enter a valid ID number';
              },
            })}
            className="input" placeholder="ID number"
          />
          <FieldError message={errors.govIdNumber?.message} />
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
          <label className="label">Flight Booked By Us?</label>
          <select {...register('flightBookedByUs')} className="input">
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No — arranging own travel</option>
          </select>
        </div>
        {flightBookedByUs === 'no' && (
          <div>
            <label className="label">Pickup &amp; Drop Opted?</label>
            <select {...register('pickupDropBookedByUs')} className="input">
              <option value="">—</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        )}
        <div>
          <label className="label">Arrival Details</label>
          <input {...register('arrivalDetails')} className="input" placeholder="Flight/train number, arrival time" />
        </div>
        <div>
          <label className="label">Return Details</label>
          <input {...register('departureDetails')} className="input" placeholder="Return flight/train number, time" />
        </div>
        <div>
          <label className="label">Emergency Contact Name</label>
          <input {...register('emergencyContactName')} className="input" />
        </div>
        <div>
          <label className="label">Emergency Contact Phone</label>
          <input
            {...register('emergencyContactPhone', { validate: (v) => !v || PHONE_PATTERN.test(v) || 'Enter a valid 10-digit mobile number' })}
            className="input"
          />
          <FieldError message={errors.emergencyContactPhone?.message} />
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
          <label className="label">Medical Conditions</label>
          <textarea {...register('medicalConditions')} className="input" rows={2} placeholder="Allergies, medication, conditions to be aware of..." />
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
  const [rejectTarget, setRejectTarget] = useState<Traveler | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [correctionTarget, setCorrectionTarget] = useState<Traveler | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');

  const createTraveler = useCreateTraveler(departureId);
  const updateTraveler = useUpdateTraveler(departureId);
  const deleteTraveler = useDeleteTraveler(departureId);
  const approveTraveler = useApproveTraveler(departureId);
  const rejectTraveler = useRejectTraveler(departureId);
  const requestCorrection = useRequestTravelerCorrection(departureId);
  const regenerateLink = useRegeneratePortalLink();

  const handleAdd = (data: TravelerForm) => {
    createTraveler.mutate({
      bookingId: booking.id, ...data, age: data.age ? Number(data.age) : undefined,
      flightBookedByUs: data.flightBookedByUs === '' ? null : data.flightBookedByUs === 'yes',
      pickupDropBookedByUs: data.pickupDropBookedByUs === '' ? null : data.pickupDropBookedByUs === 'yes',
    } as any, {
      onSuccess: () => setAddOpen(false),
    });
  };
  const handleEdit = (data: TravelerForm) => {
    if (!editTraveler) return;
    updateTraveler.mutate({
      id: editTraveler.id, ...data, age: data.age ? Number(data.age) : undefined,
      flightBookedByUs: data.flightBookedByUs === '' ? null : data.flightBookedByUs === 'yes',
      pickupDropBookedByUs: data.pickupDropBookedByUs === '' ? null : data.pickupDropBookedByUs === 'yes',
    } as any, {
      onSuccess: () => setEditTraveler(null),
    });
  };
  const handleDelete = () => {
    if (!deleteId) return;
    deleteTraveler.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
  };
  const handleCopyPortalLink = () => {
    regenerateLink.mutate(booking.id, {
      onSuccess: async (data) => {
        const link = `${window.location.origin}/traveller/${data.travelerPortalToken}`;
        try {
          if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard API unavailable');
          await navigator.clipboard.writeText(link);
          toast.success('Portal link copied — share it with the customer');
        } catch {
          // Clipboard API can silently fail (no focus, blocked permission, insecure
          // context) — fall back to the legacy textarea+execCommand copy path.
          const textarea = document.createElement('textarea');
          textarea.value = link;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const copied = document.execCommand('copy');
          document.body.removeChild(textarea);
          if (copied) toast.success('Portal link copied — share it with the customer');
          else toast.error(`Couldn't copy automatically. Link: ${link}`, { duration: 8000 });
        }
      },
    });
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
          <button
            onClick={(e) => { e.stopPropagation(); handleCopyPortalLink(); }}
            disabled={regenerateLink.isPending}
            title="Copy Traveler Portal link to share with the customer"
            className="flex items-center gap-1 text-[10px] font-medium text-primary-600 hover:text-primary-700 bg-primary-50 px-2 py-1 rounded-lg"
          >
            {regenerateLink.isPending ? <Copy className="w-3 h-3 animate-pulse" /> : <Link2 className="w-3 h-3" />}
            Portal Link
          </button>
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
                    <th className="text-left px-2 py-1.5">Travel</th>
                    <th className="text-left px-2 py-1.5">Emergency Contact</th>
                    <th className="text-left px-2 py-1.5">Room</th>
                    <th className="text-left px-2 py-1.5">Food</th>
                    <th className="text-left px-2 py-1.5">Verification</th>
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
                      <td className="px-2 py-2 text-slate-500">
                        {t.flightBookedByUs === true ? (
                          <span className="badge bg-primary-50 text-primary-700 text-[9px]">Flight (Us)</span>
                        ) : t.flightBookedByUs === false ? (
                          t.pickupDropBookedByUs === true ? (
                            <span className="badge bg-emerald-50 text-emerald-700 text-[9px]">Pickup/Drop</span>
                          ) : t.pickupDropBookedByUs === false ? (
                            <span className="badge badge-muted text-[9px]">Own Travel</span>
                          ) : (
                            <span className="badge bg-amber-50 text-amber-700 text-[9px]">Own Flight — Confirm Transfer</span>
                          )
                        ) : '—'}
                      </td>
                      <td className="px-2 py-2 text-slate-500">{t.emergencyContactName ? `${t.emergencyContactName} (${t.emergencyContactPhone || '—'})` : '—'}</td>
                      <td className="px-2 py-2 text-slate-500">{t.roomSharing || booking.roomSharing}</td>
                      <td className="px-2 py-2 text-slate-500">{t.foodPreference || booking.foodPreference}</td>
                      <td className="px-2 py-2">
                        <span
                          className={cn('badge text-[10px]', VERIFICATION_STATUS_BADGE[t.verificationStatus])}
                          title={t.verificationNote || undefined}
                        >
                          {VERIFICATION_STATUS_LABEL[t.verificationStatus] ?? t.verificationStatus}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        {t.verificationStatus !== 'VERIFIED' && (
                          <>
                            <button
                              onClick={() => approveTraveler.mutate(t.id)}
                              disabled={approveTraveler.isPending || !t.name?.trim() || /^Traveler \d+$/.test(t.name.trim()) || !t.gender}
                              title={!t.name?.trim() || /^Traveler \d+$/.test(t.name.trim()) || !t.gender ? 'Name and Gender are required before verifying' : 'Verify traveler'}
                              className="p-1 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setRejectTarget(t)}
                              title="Reject"
                              className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setCorrectionTarget(t)}
                              title="Request correction"
                              className="p-1 rounded hover:bg-orange-50 text-slate-400 hover:text-orange-500"
                            >
                              <MessageSquareWarning className="w-3 h-3" />
                            </button>
                          </>
                        )}
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

      <Modal
        open={!!rejectTarget} onClose={() => { setRejectTarget(null); setRejectReason(''); }} title="Reject Traveler Details" size="sm"
        footer={<>
          <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="btn-secondary">Cancel</button>
          <button
            onClick={() => rejectTarget && rejectTraveler.mutate({ id: rejectTarget.id, reason: rejectReason }, { onSuccess: () => { setRejectTarget(null); setRejectReason(''); } })}
            disabled={rejectTraveler.isPending || !rejectReason.trim()} className="btn-danger"
          >
            {rejectTraveler.isPending ? 'Rejecting…' : 'Reject'}
          </button>
        </>}
      >
        <label className="label">Rejection Reason *</label>
        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="input" placeholder="Explain why these details are being rejected..." />
      </Modal>

      <Modal
        open={!!correctionTarget} onClose={() => { setCorrectionTarget(null); setCorrectionNote(''); }} title="Request Correction" size="sm"
        footer={<>
          <button onClick={() => { setCorrectionTarget(null); setCorrectionNote(''); }} className="btn-secondary">Cancel</button>
          <button
            onClick={() => correctionTarget && requestCorrection.mutate({ id: correctionTarget.id, note: correctionNote }, { onSuccess: () => { setCorrectionTarget(null); setCorrectionNote(''); } })}
            disabled={requestCorrection.isPending || !correctionNote.trim()} className="btn-primary"
          >
            {requestCorrection.isPending ? 'Sending…' : 'Send to Customer'}
          </button>
        </>}
      >
        <label className="label">What needs correcting? *</label>
        <textarea value={correctionNote} onChange={(e) => setCorrectionNote(e.target.value)} rows={3} className="input" placeholder="e.g. Government ID number doesn't match the document..." />
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
