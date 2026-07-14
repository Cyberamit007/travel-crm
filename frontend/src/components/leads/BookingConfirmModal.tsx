import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { IndianRupee, Users, MapPin, Package, Utensils, BedDouble, Calendar, FileText } from 'lucide-react';
import Modal from '../ui/Modal';
import { Lead, Booking, FoodPreference, RoomSharing, TourType } from '../../types/index';
import { useCreateBooking, useUpdateBooking } from '../../hooks/useBookings';
import { usePackages } from '../../hooks/usePackages';
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
  bookingNotes: string;
  packageId: string;
  departureDate: string;
  returnDate: string;
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

  const { data: packagesData } = usePackages({ status: 'ACTIVE' });
  const packages = packagesData?.data ?? [];

  // Packages whose master destination matches the destination/campaign chosen
  // when this lead was created — surfaced first so Ops doesn't have to hunt
  // through every active package. Ops can still see everything via the toggle.
  const matchingPackages = useMemo(
    () => (lead.destination
      ? packages.filter((p) => p.destination?.name?.toLowerCase() === lead.destination!.toLowerCase())
      : []),
    [packages, lead.destination]
  );
  const [showAllPackages, setShowAllPackages] = useState(false);
  const displayedPackages = matchingPackages.length > 0 && !showAllPackages ? matchingPackages : packages;

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<BookingForm>({
    defaultValues: {
      travelerName: existingBooking?.travelerName ?? lead.name,
      numberOfTravelers: existingBooking?.numberOfTravelers ?? lead.groupSize ?? 1,
      aadharNumber: existingBooking?.aadharNumber ?? '',
      foodPreference: existingBooking?.foodPreference ?? 'NO_PREFERENCE',
      roomSharing: existingBooking?.roomSharing ?? 'DOUBLE',
      departureLocation: existingBooking?.departureLocation ?? lead.destination ?? '',
      departurePackage: existingBooking?.departurePackage ?? '',
      tourType: existingBooking?.tourType ?? 'GIT',
      specialRequest: existingBooking?.specialRequest ?? '',
      bookingNotes: existingBooking?.bookingNotes ?? '',
      packageId: existingBooking?.packageId ?? '',
      departureDate: existingBooking?.departureDate ? existingBooking.departureDate.split('T')[0] : '',
      returnDate: existingBooking?.returnDate ? existingBooking.returnDate.split('T')[0] : '',
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

  const packageId = useWatch({ control, name: 'packageId' });
  const departureDate = useWatch({ control, name: 'departureDate' });
  const selectedPackage = packages.find((p) => p.id === packageId);

  // Linking a package makes it the source of truth for the trip's destination —
  // matches booking.controller.ts, which overrides departureLocation with the
  // package's destination when both are present, so this keeps the form in
  // sync with what will actually be saved.
  useEffect(() => {
    if (selectedPackage?.destination?.name) setValue('departureLocation', selectedPackage.destination.name);
  }, [selectedPackage, setValue]);

  // Return date = departure date + package nights, recalculated whenever
  // either changes. Still a plain input afterward, so Ops can override it.
  useEffect(() => {
    if (!departureDate || !selectedPackage) return;
    const d = new Date(departureDate);
    d.setDate(d.getDate() + selectedPackage.nights);
    setValue('returnDate', d.toISOString().split('T')[0]);
  }, [departureDate, selectedPackage, setValue]);

  useEffect(() => {
    if (open) {
      setValue('travelerName', existingBooking?.travelerName ?? lead.name);
      setValue('numberOfTravelers', existingBooking?.numberOfTravelers ?? lead.groupSize ?? 1);
      setValue('aadharNumber', existingBooking?.aadharNumber ?? '');
      setValue('foodPreference', existingBooking?.foodPreference ?? 'NO_PREFERENCE');
      setValue('roomSharing', existingBooking?.roomSharing ?? 'DOUBLE');
      setValue('departureLocation', existingBooking?.departureLocation ?? lead.destination ?? '');
      setValue('departurePackage', existingBooking?.departurePackage ?? '');
      setValue('tourType', existingBooking?.tourType ?? 'GIT');
      setValue('specialRequest', existingBooking?.specialRequest ?? '');
      setValue('bookingNotes', existingBooking?.bookingNotes ?? '');
      setValue('packageId', existingBooking?.packageId ?? '');
      setValue('departureDate', existingBooking?.departureDate ? existingBooking.departureDate.split('T')[0] : '');
      setValue('returnDate', existingBooking?.returnDate ? existingBooking.returnDate.split('T')[0] : '');
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
      foodPreference: data.foodPreference as FoodPreference,
      roomSharing: data.roomSharing as RoomSharing,
      departureLocation: data.departureLocation || undefined,
      departurePackage: data.departurePackage || undefined,
      tourType: data.tourType as TourType,
      specialRequest: data.specialRequest || undefined,
      bookingNotes: data.bookingNotes || undefined,
      packageId: data.packageId || undefined,
      departureDate: data.departureDate || undefined,
      returnDate: data.returnDate || undefined,
      finalPrice: Number(data.finalPrice),
      amountPaid: Number(data.amountPaid),
      balanceDueDate: data.balanceDueDate || undefined,
    };

    if (isEdit && existingBooking) {
      updateBooking.mutate(
        { ...payload, id: existingBooking.id },
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

        {/* Booking number display for edit mode */}
        {isEdit && existingBooking?.bookingNumber && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-xl">
            <span className="text-xs font-semibold text-primary-600">Booking #</span>
            <span className="font-mono text-sm font-bold text-primary-800">{existingBooking.bookingNumber}</span>
          </div>
        )}

        {/* ── Package & Trip Dates ─────────────────────────────────────────── */}
        <div>
          <SectionHeader icon={Package} label="Package & Dates" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Tour Package</label>
              <select {...register('packageId')} className="input">
                <option value="">-- No package linked --</option>
                {displayedPackages.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name} ({p.nights}N/{p.days}D)</option>
                ))}
              </select>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-slate-400">Linking a package auto-generates workflow tasks on departure date</p>
                {matchingPackages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllPackages((v) => !v)}
                    className="text-[10px] font-medium text-primary-600 hover:text-primary-700 flex-shrink-0"
                  >
                    {showAllPackages ? `Show only ${lead.destination} packages` : 'Show all packages'}
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="label">Departure Date</label>
              <input type="date" {...register('departureDate')} className="input" />
            </div>
            <div>
              <label className="label">Return Date</label>
              <input
                type="date"
                {...register('returnDate', {
                  validate: (v, formValues) => !v || !formValues.departureDate || v >= formValues.departureDate || 'Return date cannot be before departure date',
                })}
                className="input"
              />
              {errors.returnDate && <p className="text-red-500 text-xs mt-1">{errors.returnDate.message}</p>}
            </div>
          </div>
        </div>

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
                type="number" min={1}
                {...register('numberOfTravelers', { required: 'Required', min: { value: 1, message: 'At least 1' }, valueAsNumber: true })}
                className="input"
              />
              {errors.numberOfTravelers && <p className="text-red-500 text-xs mt-1">{errors.numberOfTravelers.message}</p>}
            </div>
            <div>
              <label className="label">Aadhar Card No.</label>
              <input
                {...register('aadharNumber', { validate: (v) => !v || /^\d{12}$/.test(v.replace(/\s/g, '')) || 'Aadhar number must be 12 digits' })}
                className="input font-mono" placeholder="XXXX XXXX XXXX" maxLength={14}
              />
              {errors.aadharNumber && <p className="text-red-500 text-xs mt-1">{errors.aadharNumber.message}</p>}
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
            <div>
              <label className="label">Special Request</label>
              <input {...register('specialRequest')} className="input" placeholder="Any special requirement…" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Internal Booking Notes</label>
              <textarea {...register('bookingNotes')} className="input resize-none text-sm" rows={2} placeholder="Internal notes about this booking…" />
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
                type="number" min={0} step="0.01"
                {...register('finalPrice', { required: 'Price is required', min: { value: 0, message: 'Must be ≥ 0' }, valueAsNumber: true })}
                className="input"
              />
              {errors.finalPrice && <p className="text-red-500 text-xs mt-1">{errors.finalPrice.message}</p>}
            </div>
            <div>
              <label className="label">Amount Paid (₹)</label>
              <input
                type="number" min={0} step="0.01"
                {...register('amountPaid', {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Must be ≥ 0' },
                  validate: (v, formValues) => !(v > Number(formValues.finalPrice || 0)) || 'Amount paid cannot exceed the final price',
                })}
                className="input"
              />
              {errors.amountPaid && <p className="text-red-500 text-xs mt-1">{errors.amountPaid.message}</p>}
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
              <p className={cn('text-sm font-bold mt-0.5', balanceAmount > 0 ? 'text-orange-600' : 'text-emerald-600')}>
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
