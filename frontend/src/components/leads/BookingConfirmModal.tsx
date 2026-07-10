import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { IndianRupee, Users, MapPin, Package, Utensils, BedDouble, Star, CalendarClock, FileText } from 'lucide-react';
import Modal from '../ui/Modal';
import { Lead, Booking } from '../../types/index';
import { useCreateBooking, useUpdateBooking } from '../../hooks/useBookings';
import { formatCurrency, cn } from '../../utils/helpers';

interface BookingForm {
  travelerName: string;
  numberOfTravelers: number;
  aadharNumber: string;
  foodPreference: string;
  roomSharing: string;
  departureLocation: string;
  departurePackage: string;
  tourType: string;
  specialRequest: string;
  finalPrice: number;
  amountPaid: number;
  balanceDueDate: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  existingBooking?: Booking | null;
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-1 border-b border-slate-100 mb-3">
      <Icon className="w-3.5 h-3.5 text-primary-500" />
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

export default function BookingConfirmModal({ open, onClose, lead, existingBooking }: Props) {
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const isEdit = !!existingBooking;
  const todayDate = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<BookingForm>({
    defaultValues: {
      travelerName: existingBooking?.travelerName ?? lead.name,
      numberOfTravelers: existingBooking?.numberOfTravelers ?? lead.groupSize ?? 1,
      aadharNumber: existingBooking?.aadharNumber ?? '',
      foodPreference: existingBooking?.foodPreference ?? 'NO_PREFERENCE',
      roomSharing: existingBooking?.roomSharing ?? 'DOUBLE',
      departureLocation: existingBooking?.departureLocation ?? '',
      departurePackage: existingBooking?.departurePackage ?? '',
      tourType: existingBooking?.tourType ?? 'GIT',
      specialRequest: existingBooking?.specialRequest ?? '',
      finalPrice: existingBooking?.finalPrice ?? lead.budget ?? 0,
      amountPaid: existingBooking?.amountPaid ?? 0,
      balanceDueDate: existingBooking?.balanceDueDate
        ? existingBooking.balanceDueDate.split('T')[0]
        : '',
    },
  });

  const finalPrice = useWatch({ control, name: 'finalPrice' });
  const amountPaid = useWatch({ control, name: 'amountPaid' });
  const balanceAmount = Math.max(0, Number(finalPrice || 0) - Number(amountPaid || 0));

  // Reset form when booking changes
  useEffect(() => {
    if (open) {
      setValue('travelerName', existingBooking?.travelerName ?? lead.name);
      setValue('numberOfTravelers', existingBooking?.numberOfTravelers ?? lead.groupSize ?? 1);
      setValue('aadharNumber', existingBooking?.aadharNumber ?? '');
      setValue('foodPreference', existingBooking?.foodPreference ?? 'NO_PREFERENCE');
      setValue('roomSharing', existingBooking?.roomSharing ?? 'DOUBLE');
      setValue('departureLocation', existingBooking?.departureLocation ?? '');
      setValue('departurePackage', existingBooking?.departurePackage ?? '');
      setValue('tourType', existingBooking?.tourType ?? 'GIT');
      setValue('specialRequest', existingBooking?.specialRequest ?? '');
      setValue('finalPrice', existingBooking?.finalPrice ?? lead.budget ?? 0);
      setValue('amountPaid', existingBooking?.amountPaid ?? 0);
      setValue('balanceDueDate', existingBooking?.balanceDueDate ? existingBooking.balanceDueDate.split('T')[0] : '');
    }
  }, [open, existingBooking, lead]);

  const onSubmit = (data: BookingForm) => {
    const payload = {
      leadId: lead.id,
      travelerName: data.travelerName,
      numberOfTravelers: Number(data.numberOfTravelers),
      aadharNumber: data.aadharNumber || undefined,
      foodPreference: data.foodPreference,
      roomSharing: data.roomSharing,
      departureLocation: data.departureLocation || undefined,
      departurePackage: data.departurePackage || undefined,
      tourType: data.tourType,
      specialRequest: data.specialRequest || undefined,
      finalPrice: Number(data.finalPrice),
      amountPaid: Number(data.amountPaid),
      balanceDueDate: data.balanceDueDate || undefined,
    };

    if (isEdit && existingBooking) {
      updateBooking.mutate(
        {
          ...payload,
          id: existingBooking.id,
          foodPreference: payload.foodPreference as Booking['foodPreference'],
          roomSharing: payload.roomSharing as Booking['roomSharing'],
          tourType: payload.tourType as Booking['tourType'],
        },
        { onSuccess: onClose }
      );
    } else {
      createBooking.mutate(payload, { onSuccess: onClose });
    }
  };

  const isPending = createBooking.isPending || updateBooking.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Booking Details' : 'Confirm Booking'}
      size="2xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button form="booking-form" type="submit" disabled={isPending} className="btn-primary gap-2">
            {isPending ? 'Saving…' : isEdit ? 'Update Booking' : 'Confirm & Save'}
          </button>
        </>
      }
    >
      <form id="booking-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Traveler Details ────────────────────────────────────────────── */}
        <div>
          <SectionHeader icon={Users} label="Traveler Details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Lead / Traveler Name *</label>
              <input {...register('travelerName', { required: 'Name is required' })} className="input" />
              {errors.travelerName && <p className="text-red-500 text-xs mt-1">{errors.travelerName.message}</p>}
            </div>
            <div>
              <label className="label">No. of Travelers *</label>
              <input
                type="number"
                min={1}
                {...register('numberOfTravelers', { required: 'Required', min: { value: 1, message: 'At least 1' }, valueAsNumber: true })}
                className="input"
              />
              {errors.numberOfTravelers && <p className="text-red-500 text-xs mt-1">{errors.numberOfTravelers.message}</p>}
            </div>
            <div>
              <label className="label">Aadhar Card No.</label>
              <input {...register('aadharNumber')} className="input font-mono" placeholder="XXXX XXXX XXXX" maxLength={14} />
            </div>
            <div>
              <label className="label">Food Preference</label>
              <select {...register('foodPreference')} className="input">
                <option value="NO_PREFERENCE">No Preference</option>
                <option value="VEG">Vegetarian</option>
                <option value="NON_VEG">Non-Vegetarian</option>
                <option value="JAIN">Jain</option>
              </select>
            </div>
            <div>
              <label className="label">Room Sharing</label>
              <select {...register('roomSharing')} className="input">
                <option value="SINGLE">Single Occupancy</option>
                <option value="DOUBLE">Double Sharing</option>
                <option value="TRIPLE">Triple Sharing</option>
                <option value="QUAD">Quad Sharing</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Trip Details ─────────────────────────────────────────────────── */}
        <div>
          <SectionHeader icon={MapPin} label="Trip Details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Departure Location</label>
              <input {...register('departureLocation')} className="input" placeholder="e.g. Delhi, Mumbai" />
            </div>
            <div>
              <label className="label">Departure Package</label>
              <input {...register('departurePackage')} className="input" placeholder="e.g. Ex-Delhi 6N7D" />
            </div>
            <div>
              <label className="label">Tour Type</label>
              <select {...register('tourType')} className="input">
                <option value="GIT">GIT — Group Inclusive Tour</option>
                <option value="FIT">FIT — Fixed / Independent Tour</option>
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="label">Special Request</label>
              <input {...register('specialRequest')} className="input" placeholder="Any special requirement…" />
            </div>
          </div>
        </div>

        {/* ── Payment Details ──────────────────────────────────────────────── */}
        <div>
          <SectionHeader icon={IndianRupee} label="Payment Details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Price Finalised (₹) *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                {...register('finalPrice', { required: 'Price is required', min: { value: 0, message: 'Must be ≥ 0' }, valueAsNumber: true })}
                className="input"
              />
              {errors.finalPrice && <p className="text-red-500 text-xs mt-1">{errors.finalPrice.message}</p>}
            </div>
            <div>
              <label className="label">Amount Paid (₹)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                {...register('amountPaid', { valueAsNumber: true })}
                className="input"
              />
            </div>
          </div>

          {/* Balance summary strip */}
          <div className="mt-3 flex items-center gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex-1 text-center">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Final Price</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{formatCurrency(Number(finalPrice) || 0)}</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="flex-1 text-center">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Amount Paid</p>
              <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatCurrency(Number(amountPaid) || 0)}</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="flex-1 text-center">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Balance Due</p>
              <p className={`text-sm font-bold mt-0.5 ${balanceAmount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                {formatCurrency(balanceAmount)}
              </p>
            </div>
          </div>

          {balanceAmount > 0 && (
            <div className="mt-3">
              <label className="label">Balance Due Date</label>
              <input
                type="date"
                {...register('balanceDueDate', {
                  validate: (val) => !val || val >= todayDate || 'Balance due date cannot be in the past',
                })}
                className="input"
                min={todayDate}
              />
              {errors.balanceDueDate && <p className="text-red-500 text-xs mt-1">{errors.balanceDueDate.message}</p>}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
