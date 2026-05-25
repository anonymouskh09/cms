import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Button, Input, Alert, Spinner, Badge } from '../../components/ui';
import { PageHeader, DashboardCard } from '../../components/dashboard';
import AiNav from '../../components/phase3/AiNav';
import { aiService } from '../../services/authService';

const PROVIDER_ICONS = {
  openai: 'OAI',
  anthropic: 'CL',
  openrouter: 'OR',
  local: 'LLM',
};

function ProviderCard({ provider, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(provider.id)}
      className={`text-left p-5 rounded-2xl border-2 transition-all w-full ${
        selected
          ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100'
          : 'border-gray-200 bg-white hover:border-violet-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold ${
            selected ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}>
            {PROVIDER_ICONS[provider.id] || 'AI'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{provider.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">Default: {provider.default_model}</p>
          </div>
        </div>
        <Badge status={provider.configured ? 'active' : 'inactive'}>
          {provider.configured ? 'Configured' : 'Not configured'}
        </Badge>
      </div>
    </button>
  );
}

export default function AiSettingsPage() {
  const { user } = useAuth();
  const [institutionId, setInstitutionId] = useState(user?.role === 'owner' ? '1' : null);
  const [settings, setSettings] = useState(null);
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const params = user?.role === 'owner' && institutionId ? { institution_id: institutionId } : {};

  const load = useCallback(() => {
    setLoading(true);
    aiService.getSettings(params).then((res) => {
      const s = res.data.data?.settings || res.data.data;
      setSettings(s);
      setProviders(res.data.data?.providers || []);
      setForm({
        provider: s?.provider || 'openrouter',
        model: s?.model || '',
        max_tokens: s?.max_tokens ?? 2000,
        temperature: s?.temperature ?? 0.7,
        is_enabled: Boolean(s?.is_enabled),
      });
      if (res.data.message) {
        setMsg(res.data.message);
        setMsgType(res.data.configured ? 'success' : 'warning');
      }
    }).catch((e) => {
      setMsg(e.response?.data?.message || 'Failed to load settings');
      setMsgType('error');
    }).finally(() => setLoading(false));
  }, [institutionId, user?.role]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        ...form,
        institution_id: user?.role === 'owner' ? parseInt(institutionId, 10) : undefined,
      };
      const res = settings?.id
        ? await aiService.updateSettings(settings.id, payload)
        : await aiService.createSettings(payload);
      setSettings(res.data.data);
      setMsg(res.data.message || 'Settings saved.');
      setMsgType('success');
    } catch (e) {
      setMsg(e.response?.data?.message || 'Save failed');
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMsg('');
    try {
      const res = await aiService.testConnection({
        provider: form.provider,
        model: form.model,
        institution_id: user?.role === 'owner' ? parseInt(institutionId, 10) : undefined,
      });
      setMsg(res.data.message);
      setMsgType(res.data.success ? 'success' : 'warning');
    } catch (e) {
      setMsg(e.response?.data?.message || 'Connection test failed');
      setMsgType('error');
    } finally {
      setTesting(false);
    }
  };

  const selectedProvider = providers.find((p) => p.id === form.provider);

  return (
    <DashboardLayout>
      <PageHeader
        title="AI Settings"
        subtitle="Configure AI provider and model settings for your institution (keys stay on the server)"
        pill={form.is_enabled ? 'AI Enabled' : 'AI Disabled'}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleTest} disabled={testing || loading}>
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>Save Settings</Button>
          </div>
        }
      />
      <AiNav />
      <Alert type={msgType} message={msg} onClose={() => setMsg('')} />

      {user?.role === 'owner' && (
        <DashboardCard title="Institution" subtitle="AI settings are stored per institution" className="mb-6" padding="p-5 md:p-6">
          <select
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-500/30 outline-none"
          >
            <option value="1">Schools</option>
            <option value="2">Primal Academy</option>
          </select>
        </DashboardCard>
      )}

      {loading ? <Spinner /> : (
        <div className="space-y-6">
          <DashboardCard title="Select Provider" subtitle="Choose the AI provider for this institution">
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {providers.map((p) => (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  selected={form.provider === p.id}
                  onSelect={(id) => setForm({ ...form, provider: id })}
                />
              ))}
            </div>
            {selectedProvider && !selectedProvider.configured && (
              <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                AI provider is not configured yet. Add the API key to backend <code className="text-xs">.env</code> and restart the server.
              </p>
            )}
          </DashboardCard>

          <DashboardCard title="Model Configuration" subtitle="Fine-tune generation parameters">
            <div className="grid md:grid-cols-2 gap-x-8">
              <Input
                label="Model Name"
                value={form.model || ''}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder={selectedProvider?.default_model || 'e.g. gpt-4o-mini'}
                help="Model identifier sent to the provider API"
              />
              <Input
                label="Max Tokens"
                type="number"
                min={256}
                max={32000}
                value={form.max_tokens}
                onChange={(e) => setForm({ ...form, max_tokens: parseInt(e.target.value, 10) })}
              />
              <Input
                label="Temperature"
                type="number"
                step="0.1"
                min={0}
                max={2}
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                help="Lower = more focused, higher = more creative"
              />
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key Status</label>
                <div className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600">
                  {settings?.api_key_configured ? 'Configured on server (hidden)' : 'Not configured on server'}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">API keys are never stored or shown in the browser.</p>
              </div>
            </div>

            <div className="mt-4 pt-6 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Enable AI for this institution</p>
                <p className="text-sm text-gray-500">When disabled, AI features remain unavailable even if a provider is configured.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={Boolean(form.is_enabled)}
                  onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600" />
              </label>
            </div>
          </DashboardCard>
        </div>
      )}
    </DashboardLayout>
  );
}
