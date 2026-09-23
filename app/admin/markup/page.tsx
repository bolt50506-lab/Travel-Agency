'use client';

import { FormEvent, useEffect, useState } from 'react';

type Rule = {
  id: string;
  rule_type: string;
  scope: string;
  scope_value?: string | null;
  value: number;
  is_active: boolean;
  priority: number;
};

const typeLabels: Record<string, string> = {
  percentage_markup: 'Percentage markup',
  fixed_markup: 'Fixed markup (PKR)',
  minimum_margin: 'Minimum margin (PKR)',
};

const scopeLabels: Record<string, string> = {
  global: 'Everything',
  airline: 'Specific airline',
  route: 'Specific route',
  supplier: 'Specific supplier/API',
  hotel: 'Specific hotel/provider',
  hotel_category: 'Hotel category',
  agent: 'Specific agent',
};

export default function AdminMarkupPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('percentage_markup');
  const [scope, setScope] = useState('global');
  const [scopeValue, setScopeValue] = useState('');
  const [value, setValue] = useState('12');
  const [active, setActive] = useState(true);

  async function loadRules() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/modules?module=pricing_rules');
      const json = await res.json();
      setRules(json.data?.rows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRules(); }, []);

  async function createRule(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'pricing_rules',
          data: {
            rule_type: type,
            scope,
            scope_value: scope === 'global' ? null : scopeValue.trim(),
            value: Number(value),
            is_active: active,
            priority: 0,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save markup rule');
      setMessage('Markup rule saved.');
      setScopeValue('');
      await loadRules();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save markup rule');
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule: Rule) {
    await fetch('/api/admin/modules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'pricing_rules',
        id: rule.id,
        data: { is_active: !rule.is_active },
      }),
    });
    loadRules();
  }

  function describe(rule: Rule) {
    const amount = rule.rule_type === 'percentage_markup' ? `${rule.value}%` : `PKR ${Number(rule.value).toLocaleString()}`;
    const where = rule.scope === 'global' ? 'everything' : `${scopeLabels[rule.scope] || rule.scope}: ${rule.scope_value || '—'}`;
    return `${amount} on ${where}`;
  }

  return (
    <div className="container-page space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Markup & Pricing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a simple markup that the agency adds to supplier prices before showing the customer price.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Add markup rule</h2>
        <p className="mt-1 text-sm text-muted-foreground">Example: choose Percentage + Everything + 12 to add 12%.</p>

        <form onSubmit={createRule} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Markup type
            <select value={type} onChange={e => setType(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3">
              <option value="percentage_markup">Percentage (%)</option>
              <option value="fixed_markup">Fixed amount (PKR)</option>
              <option value="minimum_margin">Minimum margin (PKR)</option>
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            Applies to
            <select value={scope} onChange={e => setScope(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3">
              <option value="global">Everything</option>
              <option value="airline">Specific airline</option>
              <option value="route">Specific route</option>
              <option value="supplier">Specific supplier/API</option>
              <option value="hotel">Specific hotel/provider</option>
              <option value="hotel_category">Hotel category</option>
              <option value="agent">Specific agent</option>
            </select>
          </label>

          {scope !== 'global' && (
            <label className="space-y-1.5 text-sm font-medium">
              {scope === 'airline' ? 'Airline code' : scope === 'route' ? 'Route (e.g. ISB-DXB)' : 'Value'}
              <input value={scopeValue} onChange={e => setScopeValue(e.target.value)} placeholder={scope === 'airline' ? 'PK' : scope === 'route' ? 'ISB-DXB' : 'Enter value'} className="h-10 w-full rounded-md border bg-background px-3" required />
            </label>
          )}

          <label className="space-y-1.5 text-sm font-medium">
            {type === 'percentage_markup' ? 'Markup percentage' : 'Amount in PKR'}
            <input type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3" required />
          </label>

          <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
            Active
          </label>

          <div className="md:col-span-2 flex items-center gap-3">
            <button disabled={saving} className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {saving ? 'Saving…' : 'Save markup'}
            </button>
            {message && <span className="text-sm text-muted-foreground">{message}</span>}
          </div>
        </form>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Current markup rules</h2>
        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : rules.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No rules yet. Add your first markup above.</p>
        ) : (
          <div className="mt-4 divide-y">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{typeLabels[rule.rule_type] || rule.rule_type}</p>
                  <p className="text-sm text-muted-foreground">{describe(rule)}</p>
                </div>
                <button onClick={() => toggleRule(rule)} className="rounded-md border px-3 py-1.5 text-xs font-medium">
                  {rule.is_active ? 'Active — turn off' : 'Inactive — turn on'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
