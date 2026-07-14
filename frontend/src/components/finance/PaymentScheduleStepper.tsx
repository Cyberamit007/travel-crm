import { Check, Pencil } from 'lucide-react';
import { PaymentScheduleItem } from '../../types/index';
import { formatCurrency, formatDate, cn } from '../../utils/helpers';

export default function PaymentScheduleStepper({ items, onEdit }: { items: PaymentScheduleItem[]; onEdit?: (item: PaymentScheduleItem) => void }) {
  if (items.length === 0) return null;
  const today = new Date();

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-start min-w-max">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isOverdue = item.status !== 'PAID' && new Date(item.dueDate) < today;
          const outstanding = item.amount - item.paidAmount;

          return (
            <div key={item.id} className="flex items-start">
              <div className="flex flex-col items-center w-28">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2',
                    item.status === 'PAID'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isOverdue
                        ? 'border-red-400 text-red-500 bg-white'
                        : item.status === 'PARTIAL'
                          ? 'border-amber-400 text-amber-500 bg-white'
                          : 'border-slate-200 text-slate-300 bg-white'
                  )}
                >
                  {item.status === 'PAID' ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                </div>
                <p className="text-[11px] text-center mt-1.5 font-medium text-slate-700 leading-tight">{item.label}</p>
                <p className="text-[11px] text-center text-slate-500">{formatCurrency(item.amount)}</p>
                <p className={cn('text-[10px] text-center', isOverdue ? 'text-red-500 font-medium' : 'text-slate-400')}>
                  {isOverdue ? 'Overdue · ' : ''}{formatDate(item.dueDate)}
                </p>
                {item.status === 'PARTIAL' && (
                  <p className="text-[10px] text-center text-amber-600">{formatCurrency(outstanding)} left</p>
                )}
                {onEdit && item.status !== 'PAID' && (
                  <button onClick={() => onEdit(item)} className="text-[10px] text-primary-600 hover:text-primary-700 flex items-center gap-0.5 mt-0.5">
                    <Pencil className="w-2.5 h-2.5" />Edit
                  </button>
                )}
              </div>
              {!isLast && <div className={cn('h-0.5 w-6 mt-3.5 flex-shrink-0', item.status === 'PAID' ? 'bg-emerald-400' : 'bg-slate-200')} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
