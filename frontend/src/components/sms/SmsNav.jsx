import SubNav from '../dashboard/SubNav';

export const SMS_NAV = [
  { label: 'Dashboard', path: '/finance/sms/dashboard' },
  { label: 'Templates', path: '/finance/sms/templates' },
  { label: 'Logs', path: '/finance/sms/logs' },
  { label: 'Fee Reminder', path: '/finance/sms/fee-reminder' },
  { label: 'Attendance Alert', path: '/finance/sms/attendance-alert' },
  { label: 'Exam Notice', path: '/finance/sms/exam-notice' },
];

export function SmsPlaceholderBanner() {
  return (
    <div className="mb-8 p-5 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 flex flex-wrap items-center gap-4 shadow-sm">
      <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-500 text-white uppercase tracking-wide shadow-sm">
        Placeholder
      </span>
      <p className="text-sm text-amber-900 flex-1 leading-relaxed">
        SMS integration is not active yet. This is a Phase 2 UI placeholder. No messages will be sent and no balance will be deducted.
      </p>
    </div>
  );
}

export default function SmsNav() {
  return <SubNav items={SMS_NAV} />;
}
