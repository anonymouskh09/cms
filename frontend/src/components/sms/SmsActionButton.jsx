import { useState } from 'react';
import { Button, Alert } from '../ui';
import { smsService } from '../../services/authService';

const DEFAULT_MSG = 'SMS integration is not active yet. This is a Phase 2 UI placeholder.';

export default function SmsActionButton({ label = 'Send SMS', variant = 'secondary', className = '', onNotify }) {
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClick = async (e) => {
    e?.stopPropagation?.();
    setLoading(true);
    try {
      const res = await smsService.testPlaceholder();
      const message = res.data?.message || DEFAULT_MSG;
      setMsg(message);
      onNotify?.(message);
    } catch {
      setMsg(DEFAULT_MSG);
      onNotify?.(DEFAULT_MSG);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant={variant} className={className} onClick={handleClick} disabled={loading}>
        {loading ? 'Checking...' : label}
      </Button>
      {msg && !onNotify && (
        <Alert type="warning" message={msg} onClose={() => setMsg('')} />
      )}
    </>
  );
}

export { DEFAULT_MSG as SMS_PLACEHOLDER_MSG };
