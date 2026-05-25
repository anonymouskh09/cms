import ChallanStatusBadge from './ChallanStatusBadge';

function formatRs(n) {
  const num = Number(n) || 0;
  return `Rs. ${num.toLocaleString('en-PK')}`;
}

function formatMonth(ym) {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-PK', { month: 'short', year: 'numeric' });
}

const STATUS_STYLES = {
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function FeeSummaryKpis({ summary }) {
  if (!summary) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
        <p className="text-[10px] uppercase font-semibold text-emerald-700">Jama (Paid)</p>
        <p className="text-lg font-bold text-emerald-900">{formatRs(summary.total_paid)}</p>
        <p className="text-xs text-emerald-600">{summary.count_paid} month(s)</p>
      </div>
      <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
        <p className="text-[10px] uppercase font-semibold text-amber-700">Baqi (Due)</p>
        <p className="text-lg font-bold text-amber-900">{formatRs(summary.total_outstanding)}</p>
        <p className="text-xs text-amber-600">{summary.count_pending + summary.count_overdue} challan(s)</p>
      </div>
      <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
        <p className="text-[10px] uppercase font-semibold text-red-700">Overdue</p>
        <p className="text-lg font-bold text-red-900">{summary.count_overdue}</p>
      </div>
      <div className="rounded-xl bg-violet-50 border border-violet-100 p-3 text-center">
        <p className="text-[10px] uppercase font-semibold text-violet-700">Total Challans</p>
        <p className="text-lg font-bold text-violet-900">{summary.count_challans}</p>
      </div>
    </div>
  );
}

export function FeeMonthTimeline({ monthlyHistory = [] }) {
  if (!monthlyHistory.length) {
    return (
      <p className="text-sm text-gray-500 py-2">Abhi koi challan nahi — pehli fee generate karein.</p>
    );
  }
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
      {monthlyHistory.map((row) => (
        <div
          key={`${row.month_year}-${row.challan_no}`}
          className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${STATUS_STYLES[row.status] || STATUS_STYLES.pending}`}
        >
          <div>
            <span className="font-semibold">{formatMonth(row.month_year)}</span>
            <span className="text-xs opacity-75 ml-2">{row.challan_no}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold">{formatRs(row.total_amount)}</span>
            <ChallanStatusBadge status={row.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeePreviewPanel({ feePreview, compact = false }) {
  if (!feePreview) return null;

  const { breakdown = [], existing_challan, can_generate, message, has_fee_structure } = feePreview;

  return (
    <div className={`rounded-xl border ${existing_challan ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'} p-4 ${compact ? 'text-sm' : ''}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
        {formatMonth(feePreview.month_year)} — Fee detail
      </p>

      {!has_fee_structure && (
        <p className="text-red-700 text-sm font-medium mb-2">
          ⚠ Fee structure class ke liye set nahi — Fee Structures menu se add karein.
        </p>
      )}

      {breakdown.length > 0 && (
        <ul className="space-y-1 mb-3">
          {breakdown.map((line, i) => (
            <li key={`${line.fee_type}-${i}`} className="flex justify-between text-gray-700">
              <span>{line.fee_type}</span>
              <span className="font-medium">{formatRs(line.amount)}</span>
            </li>
          ))}
          <li className="flex justify-between border-t border-gray-200 pt-1 mt-1 font-medium">
            <span>Base fee</span>
            <span>{formatRs(feePreview.base_amount)}</span>
          </li>
          {feePreview.fine_amount > 0 && (
            <li className="flex justify-between text-red-700">
              <span>Late fine</span>
              <span>{formatRs(feePreview.fine_amount)}</span>
            </li>
          )}
          <li className="flex justify-between text-base font-bold text-gray-900 pt-1">
            <span>Total</span>
            <span>{formatRs(feePreview.total_amount)}</span>
          </li>
          <li className="text-xs text-gray-500">Due date: {feePreview.due_date || '—'}</li>
        </ul>
      )}

      {existing_challan && (
        <p className="text-sm text-amber-800 font-medium">
          Is month ki challan pehle se hai ({existing_challan.challan_no}) — Status:{' '}
          <ChallanStatusBadge status={existing_challan.status} />
          {existing_challan.status === 'paid' ? ' ✓ Fee jama ho chuki' : ` — ${formatRs(existing_challan.total_amount)} baqi`}
        </p>
      )}

      {message && !existing_challan && (
        <p className="text-sm text-gray-600">{message}</p>
      )}

      {can_generate && !compact && (
        <p className="text-sm text-emerald-700 font-medium mt-2">✓ Is month ki nayi challan generate ho sakti hai</p>
      )}
    </div>
  );
}

export default function StudentFeeSummary({
  data,
  loading,
  showPreview = true,
  showTimeline = true,
  showPayments = true,
  compact = false,
}) {
  if (loading) {
    return (
      <p className="text-sm text-violet-600 flex items-center gap-2 py-4">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
        Fee history load ho rahi hai…
      </p>
    );
  }
  if (!data) return null;

  const student = data.student;
  const summary = data.summary;
  const monthlyHistory = data.monthly_history || data.challans?.map((ch) => ({
    month_year: ch.month_year,
    challan_no: ch.challan_no,
    status: ch.status,
    total_amount: ch.total_amount,
    fine_amount: ch.fine_amount,
    due_date: ch.due_date,
    paid_at: ch.paid_at,
    pdf_url: ch.pdf_url,
  })) || [];

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {student && !compact && (
        <p className="text-sm text-gray-600">
          <strong>{student.first_name} {student.last_name || ''}</strong>
          {student.class_name ? ` · ${student.class_name}` : ''}
          {student.section_name ? ` ${student.section_name}` : ''}
          {student.admission_no ? ` · ${student.admission_no}` : ''}
        </p>
      )}

      <div>
        <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Fee summary</p>
        <FeeSummaryKpis summary={summary} />
      </div>

      {showPreview && data.fee_preview && (
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Selected month</p>
          <FeePreviewPanel feePreview={data.fee_preview} compact={compact} />
        </div>
      )}

      {showTimeline && (
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Month-wise history (kon si jama / baqi)</p>
          <FeeMonthTimeline monthlyHistory={monthlyHistory} />
        </div>
      )}

      {showPayments && (data.payments?.length > 0) && !compact && (
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Payment records</p>
          <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
            {data.payments.slice(0, 8).map((p) => (
              <li key={p.id} className="flex justify-between border-b border-gray-100 pb-1">
                <span>{new Date(p.created_at).toLocaleDateString()} · {p.challan_no || formatMonth(p.month_year)}</span>
                <span className="font-medium text-emerald-700">{formatRs(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-gray-400 leading-relaxed">
        Fee class/grade ke Fee Structure se calculate hoti hai. Har month ki alag challan — Paid = jama, Pending/Overdue = baqi.
      </p>
    </div>
  );
}
