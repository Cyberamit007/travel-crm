import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Mountain, Calendar, IndianRupee, Users, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertTriangle, XCircle, Upload, FileCheck,
} from 'lucide-react';
import { usePortalBooking, useSubmitTraveler, useUploadTravelerDocument } from '../../hooks/usePortal';
import { Traveler } from '../../types/index';
import { formatDate, formatCurrency, cn } from '../../utils/helpers';
import { Skeleton } from '../../components/ui/Skeleton';

const PHONE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const todayISO = () => new Date().toISOString().slice(0, 10);

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}

const STATUS_META: Record<string, { label: string; icon: typeof Clock; classes: string }> = {
  PENDING: { label: 'Awaiting Your Details', icon: Clock, classes: 'bg-slate-100 text-slate-600' },
  SUBMITTED: { label: 'Pending Review', icon: Clock, classes: 'bg-amber-50 text-amber-700' },
  VERIFIED: { label: 'Verified', icon: CheckCircle2, classes: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { label: 'Needs Attention', icon: XCircle, classes: 'bg-red-50 text-red-600' },
  CORRECTION_REQUESTED: { label: 'Correction Requested', icon: AlertTriangle, classes: 'bg-orange-50 text-orange-700' },
};

interface TravelerFormValues {
  name: string;
  mobile?: string;
  email?: string;
  gender?: string;
  dob?: string;
  bloodGroup?: string;
  nationality?: string;
  foodPreference?: string;
  roomSharing?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  govIdType?: string;
  govIdNumber?: string;
  medicalConditions?: string;
  arrivalDetails?: string;
  departureDetails?: string;
  specialNotes?: string;
  isSeniorCitizen?: boolean;
  isChild?: boolean;
  needsExtraMattress?: boolean;
  flightBookedByUs?: string;
  pickupDropBookedByUs?: string;
}

function boolToSelect(v: boolean | null | undefined): string {
  return v === true ? 'yes' : v === false ? 'no' : '';
}

function TravelerCard({ traveler, token, index }: { traveler: Traveler; token: string; index: number }) {
  const editable = traveler.verificationStatus !== 'VERIFIED';
  const [expanded, setExpanded] = useState(traveler.verificationStatus === 'PENDING' || traveler.verificationStatus === 'REJECTED' || traveler.verificationStatus === 'CORRECTION_REQUESTED');
  const submit = useSubmitTraveler(token);
  const uploadDoc = useUploadTravelerDocument(token);
  const meta = STATUS_META[traveler.verificationStatus] ?? STATUS_META.PENDING;
  const StatusIcon = meta.icon;

  const { register, handleSubmit, watch, formState: { errors } } = useForm<TravelerFormValues>({
    defaultValues: {
      name: traveler.name?.startsWith('Traveler ') ? '' : traveler.name,
      mobile: traveler.mobile ?? '',
      email: traveler.email ?? '',
      gender: traveler.gender ?? '',
      dob: traveler.dob ? traveler.dob.slice(0, 10) : '',
      bloodGroup: traveler.bloodGroup ?? '',
      nationality: traveler.nationality ?? '',
      foodPreference: traveler.foodPreference ?? '',
      roomSharing: traveler.roomSharing ?? '',
      emergencyContactName: traveler.emergencyContactName ?? '',
      emergencyContactPhone: traveler.emergencyContactPhone ?? '',
      govIdType: traveler.govIdType ?? '',
      govIdNumber: traveler.govIdNumber ?? '',
      medicalConditions: traveler.medicalConditions ?? '',
      arrivalDetails: traveler.arrivalDetails ?? '',
      departureDetails: traveler.departureDetails ?? '',
      specialNotes: traveler.specialNotes ?? '',
      isSeniorCitizen: traveler.isSeniorCitizen,
      isChild: traveler.isChild,
      needsExtraMattress: traveler.needsExtraMattress,
      flightBookedByUs: boolToSelect(traveler.flightBookedByUs),
      pickupDropBookedByUs: boolToSelect(traveler.pickupDropBookedByUs),
    },
  });

  const flightBookedByUs = watch('flightBookedByUs');

  const onSubmit = (data: TravelerFormValues) => {
    if (!data.name?.trim()) return;
    submit.mutate({
      travelerId: traveler.id,
      ...data,
      flightBookedByUs: data.flightBookedByUs === '' ? null : data.flightBookedByUs === 'yes',
      pickupDropBookedByUs: data.pickupDropBookedByUs === '' ? null : data.pickupDropBookedByUs === 'yes',
    } as any, { onSuccess: () => setExpanded(false) });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadDoc.mutate({ travelerId: traveler.id, file });
  };

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {index + 1}
          </div>
          <p className="font-semibold text-slate-800 text-sm truncate">
            {traveler.name?.startsWith('Traveler ') ? `Traveler ${index + 1}` : traveler.name}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn('badge text-[10px] flex items-center gap-1', meta.classes)}>
            <StatusIcon className="w-3 h-3" />{meta.label}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 sm:p-5">
          {traveler.verificationNote && (traveler.verificationStatus === 'REJECTED' || traveler.verificationStatus === 'CORRECTION_REQUESTED') && (
            <div className="mb-4 flex items-start gap-2 text-sm bg-orange-50 border border-orange-200 text-orange-800 rounded-xl px-3.5 py-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{traveler.verificationNote}</span>
            </div>
          )}

          {!editable ? (
            <p className="text-sm text-slate-500">These details have been verified and are locked. Contact your travel agent if something needs to change.</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Full Name *</label>
                <input
                  {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' }, maxLength: { value: 100, message: 'Name is too long' } })}
                  className="input" placeholder="As per government ID"
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
                  className="input"
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
                      const age = new Date().getFullYear() - d.getFullYear();
                      if (age > 120) return 'Enter a valid date of birth';
                      return true;
                    },
                  })}
                  className="input"
                />
                <FieldError message={errors.dob?.message} />
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
                <label className="label">Food Preference</label>
                <select {...register('foodPreference')} className="input">
                  <option value="">—</option>
                  <option value="VEG">Vegetarian</option>
                  <option value="NON_VEG">Non-Vegetarian</option>
                  <option value="JAIN">Jain</option>
                  <option value="NO_PREFERENCE">No Preference</option>
                </select>
              </div>
              <div>
                <label className="label">Room Preference</label>
                <select {...register('roomSharing')} className="input">
                  <option value="">Use booking default</option>
                  <option value="SINGLE">Single</option>
                  <option value="DOUBLE">Double Sharing</option>
                  <option value="TRIPLE">Triple Sharing</option>
                  <option value="QUAD">Quad Sharing</option>
                </select>
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
                  className="input"
                />
                <FieldError message={errors.govIdNumber?.message} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Upload Government ID (photo/scan)</label>
                <input type="file" accept="image/*,.pdf" onChange={onFileChange} className="input py-1.5" />
                {traveler.govIdDocumentUrl && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1"><FileCheck className="w-3.5 h-3.5" />Document uploaded</p>
                )}
                {uploadDoc.isPending && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Upload className="w-3 h-3 animate-pulse" />Uploading…</p>}
              </div>
              <div>
                <label className="label">Are your flight tickets booked through us?</label>
                <select {...register('flightBookedByUs')} className="input">
                  <option value="">—</option>
                  <option value="yes">Yes</option>
                  <option value="no">No, I'm arranging my own travel</option>
                </select>
              </div>
              {flightBookedByUs === 'no' && (
                <div>
                  <label className="label">Would you like pickup &amp; drop transfer?</label>
                  <select {...register('pickupDropBookedByUs')} className="input">
                    <option value="">—</option>
                    <option value="yes">Yes, please arrange it</option>
                    <option value="no">No, I'll arrange my own transfer</option>
                  </select>
                </div>
              )}
              {flightBookedByUs === 'no' && (
                <div className="sm:col-span-2 text-xs bg-primary-50 border border-primary-100 text-primary-700 rounded-xl px-3.5 py-2.5">
                  Pickup &amp; Drop transfer is included as part of your package — let us know if you'd like us to arrange it, and share your arrival/departure details below either way.
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="label">Arrival Details</label>
                <input {...register('arrivalDetails')} className="input" placeholder="Flight/train number, arrival time" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Return Details</label>
                <input {...register('departureDetails')} className="input" placeholder="Return flight/train number, time" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Medical Conditions / Allergies</label>
                <textarea {...register('medicalConditions')} className="input" rows={2} placeholder="Anything our team should be aware of" />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" {...register('isSeniorCitizen')} className="rounded border-slate-300" /> Senior Citizen
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" {...register('isChild')} className="rounded border-slate-300" /> Child
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" {...register('needsExtraMattress')} className="rounded border-slate-300" /> Needs Extra Mattress
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Special Notes</label>
                <textarea {...register('specialNotes')} className="input" rows={2} />
              </div>
              <div className="sm:col-span-2 flex justify-end pt-1">
                <button type="submit" disabled={submit.isPending} className="btn-primary px-5">
                  {submit.isPending ? 'Submitting…' : 'Submit Details'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function TravelerPortalPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { data, isLoading, isError } = usePortalBooking(token);
  const booking = data?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-primary-900 to-mountain-900 p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5 mx-auto border border-white/20">
            <XCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Link Invalid or Expired</h1>
          <p className="text-slate-300 text-sm">This traveler information link is no longer valid. Please contact your travel agent for a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-primary-900 to-mountain-900 px-4 sm:px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
              <Mountain className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm">Travel CRM</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Hi {booking.customerName.split(' ')[0]}, welcome aboard!</h1>
          <p className="text-primary-200 text-sm mb-5">
            {booking.package?.name ?? booking.destination}{booking.bookingNumber ? ` · ${booking.bookingNumber}` : ''}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-primary-300 mb-1" />
              <p className="text-[10px] text-primary-300 uppercase tracking-wide">Departure</p>
              <p className="text-sm font-semibold text-white">{booking.departureDate ? formatDate(booking.departureDate) : '—'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <Users className="w-3.5 h-3.5 text-primary-300 mb-1" />
              <p className="text-[10px] text-primary-300 uppercase tracking-wide">Travelers</p>
              <p className="text-sm font-semibold text-white">{booking.numberOfTravelers}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <IndianRupee className="w-3.5 h-3.5 text-primary-300 mb-1" />
              <p className="text-[10px] text-primary-300 uppercase tracking-wide">Paid</p>
              <p className="text-sm font-semibold text-white">{formatCurrency(booking.amountPaid)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <IndianRupee className="w-3.5 h-3.5 text-primary-300 mb-1" />
              <p className="text-[10px] text-primary-300 uppercase tracking-wide">Balance</p>
              <p className="text-sm font-semibold text-white">{formatCurrency(booking.balanceAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Travelers */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Traveler Details</h2>
          <p className="text-xs text-slate-500 mt-0.5">Please fill in details for each traveler in your group. Our team will review and confirm.</p>
        </div>
        {booking.travelers.map((t, i) => (
          <TravelerCard key={t.id} traveler={t} token={token} index={i} />
        ))}
        <p className="text-center text-xs text-slate-400 pt-4">
          Questions about your trip? Please reach out to your travel agent directly.
        </p>
      </div>
    </div>
  );
}
