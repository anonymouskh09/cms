const PLACEHOLDER_MSG = 'SMS integration is not active yet. This is a Phase 2 UI placeholder.';

const PLACEHOLDER = {
  success: false,
  message: PLACEHOLDER_MSG,
  placeholder: true,
};

const ALL_TEMPLATES = [
  {
    id: 1,
    template_name: 'Attendance Absent Alert',
    template_type: 'attendance_absent',
    message_body: 'Dear {parent_name}, {student_name} was marked absent on {date} at {institution_name}.',
    variables: ['student_name', 'parent_name', 'date', 'institution_name'],
    status: 'active',
  },
  {
    id: 2,
    template_name: 'Fee Reminder',
    template_type: 'fee_reminder',
    message_body: 'Dear {parent_name}, fee of Rs. {fee_amount} for {student_name} is due on {due_date}. — {institution_name}',
    variables: ['student_name', 'parent_name', 'fee_amount', 'due_date', 'institution_name'],
    status: 'active',
  },
  {
    id: 3,
    template_name: 'Fee Overdue Reminder',
    template_type: 'fee_overdue',
    message_body: 'Dear {parent_name}, overdue fee of Rs. {fee_amount} for {student_name} at {institution_name}. Please pay immediately.',
    variables: ['student_name', 'parent_name', 'fee_amount', 'institution_name'],
    status: 'active',
  },
  {
    id: 4,
    template_name: 'General Announcement',
    template_type: 'general',
    message_body: '{institution_name}: {message}',
    variables: ['institution_name', 'message'],
    status: 'active',
  },
  {
    id: 5,
    template_name: 'Exam Notice',
    template_type: 'exam_notice',
    message_body: 'Dear {parent_name}, {exam_name} for {student_name} is scheduled on {exam_date}. — {institution_name}',
    variables: ['student_name', 'parent_name', 'exam_name', 'exam_date', 'institution_name'],
    status: 'active',
  },
  {
    id: 6,
    template_name: 'Result Published Notice',
    template_type: 'result_published',
    message_body: 'Dear {parent_name}, results for {exam_name} ({student_name}) are now available at {institution_name}.',
    variables: ['student_name', 'parent_name', 'exam_name', 'institution_name'],
    status: 'active',
  },
  {
    id: 7,
    template_name: 'Exam Schedule Notice',
    template_type: 'exam_schedule',
    message_body: 'Dear {parent_name}, {exam_name} schedule for {student_name}: {exam_date}. — {institution_name}',
    variables: ['student_name', 'parent_name', 'exam_name', 'exam_date', 'institution_name'],
    status: 'active',
  },
];

const ALL_LOGS = [
  {
    id: 1,
    recipient: '03001234567',
    message_type: 'fee_reminder',
    message_preview: 'Fee of Rs. 5000 due on 2026-06-01...',
    status: 'sent',
    sent_at: '2026-05-20 10:00:00',
    institution: 'Schools',
    sent_by: 'Finance Manager',
  },
  {
    id: 2,
    recipient: '03007654321',
    message_type: 'attendance_absent',
    message_preview: 'Your child was absent today...',
    status: 'failed',
    sent_at: null,
    institution: 'Schools',
    sent_by: 'Admin User',
  },
  {
    id: 3,
    recipient: '03009876543',
    message_type: 'exam_notice',
    message_preview: 'Mid Term Exam scheduled on 2026-06-15...',
    status: 'pending',
    sent_at: null,
    institution: 'Primal Academy',
    sent_by: 'Principal',
  },
  {
    id: 4,
    recipient: '03001112233',
    message_type: 'fee_overdue',
    message_preview: 'Overdue fee for Ali Khan. Please pay...',
    status: 'sent',
    sent_at: '2026-05-23 14:30:00',
    institution: 'Schools',
    sent_by: 'Finance Manager',
  },
];

function institutionLabel(req) {
  if (req.institutionFilter === 1) return 'Schools';
  if (req.institutionFilter === 2) return 'Primal Academy';
  return null;
}

function filterByInstitution(items, req, key = 'institution') {
  const label = institutionLabel(req);
  if (!label) return items;
  return items.filter((i) => i[key] === label);
}

function dashboard(req, res) {
  const data = {
    sms_balance: 5000,
    sent_today: 42,
    failed_today: 3,
    pending_messages: 12,
    last_campaign: 'Fee Reminder - May 2026',
    reminder_templates: ALL_TEMPLATES.filter((t) =>
      ['fee_reminder', 'fee_overdue', 'attendance_absent'].includes(t.template_type)
    ).map((t) => ({ id: t.id, template_name: t.template_name, template_type: t.template_type })),
  };
  res.json({ success: true, data, placeholder: true, message: PLACEHOLDER_MSG });
}

function templates(req, res) {
  const type = req.query.type;
  let data = [...ALL_TEMPLATES];
  if (type) data = data.filter((t) => t.template_type === type);
  res.json({ success: true, data, placeholder: true, message: PLACEHOLDER_MSG });
}

function createTemplate(req, res) {
  const { template_name, template_type, message_body, variables, status } = req.body;
  if (!template_name || !template_type || !message_body) {
    return res.status(400).json({ success: false, message: 'template_name, template_type, and message_body are required' });
  }
  res.status(201).json({
    success: true,
    data: {
      id: Date.now(),
      template_name,
      template_type,
      message_body,
      variables: variables || [],
      status: status || 'active',
    },
    placeholder: true,
    message: PLACEHOLDER_MSG,
  });
}

function updateTemplate(req, res) {
  const existing = ALL_TEMPLATES.find((t) => String(t.id) === String(req.params.id));
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Template not found' });
  }
  res.json({
    success: true,
    data: { ...existing, ...req.body, id: existing.id },
    placeholder: true,
    message: PLACEHOLDER_MSG,
  });
}

function logs(req, res) {
  const data = filterByInstitution(ALL_LOGS, req);
  res.json({ success: true, data, placeholder: true, message: PLACEHOLDER_MSG });
}

function testPlaceholder(req, res) {
  res.status(200).json(PLACEHOLDER);
}

module.exports = { dashboard, templates, createTemplate, updateTemplate, logs, testPlaceholder };
