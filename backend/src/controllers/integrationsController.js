const INTEGRATION_MSG = 'This feature is UI-only in Phase 3 and is not active yet.';

const PLACEHOLDER = { success: false, message: INTEGRATION_MSG, placeholder: true };

function qrAttendanceStatus(req, res) {
  res.json({
    success: true,
    placeholder: true,
    message: INTEGRATION_MSG,
    data: {
      qr_enabled: false,
      biometric_enabled: false,
      devices_connected: 0,
      last_scan: null,
      supported_devices: ['QR Scanner (placeholder)', 'Fingerprint Reader (placeholder)'],
    },
  });
}

function notificationsStatus(req, res) {
  res.json({
    success: true,
    placeholder: true,
    message: INTEGRATION_MSG,
    data: {
      push_enabled: false,
      email_enabled: false,
      sms_linked: false,
      pending_notifications: 0,
      channels: ['Push (inactive)', 'Email (inactive)', 'In-app (active via Announcements)'],
    },
  });
}

function testIntegration(req, res) {
  res.json(PLACEHOLDER);
}

module.exports = { qrAttendanceStatus, notificationsStatus, testIntegration };
