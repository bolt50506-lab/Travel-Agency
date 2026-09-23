'use client';

import { useEffect, useState } from 'react';
import { Calculator, RefreshCw, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Agent = {
  id: string;
  agent_code?: string;
  user_id?: string;
  commission_rate?: number | string;
  is_active?: boolean;
};

type Commission = {
  id: string;
  booking_id: string;
  agent_id: string;
  basis_amount: number;
  commission_type: string;
  commission_rate: number;
  commission_amount: number;
  currency: string;
  status: string;
  paid_at?: string | null;
};

export default function AdminCommissionsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingAgent, setSavingAgent] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [agentsResponse, commissionsResponse] = await Promise.all([
        fetch('/api/admin/modules?module=agents'),
        fetch('/api/admin/modules?module=agent_commissions'),
      ]);
      const agentsResult = await agentsResponse.json();
      const commissionsResult = await commissionsResponse.json();
      if (!agentsResponse.ok) throw new Error(agentsResult.error || 'Unable to load agents');
      if (!commissionsResponse.ok) throw new Error(commissionsResult.error || 'Unable to load commissions');

      const nextAgents = (agentsResult.rows || []) as Agent[];
      setAgents(nextAgents);
      setCommissions((commissionsResult.rows || []) as Commission[]);
      const nextRates: Record<string, string> = {};
      nextAgents.forEach((agent) => {
        nextRates[String(agent.id)] = String(agent.commission_rate ?? 0);
      });
      setRates(nextRates);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load commissions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveRate(agentId: string) {
    const rate = Number(rates[agentId]);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error('Commission percentage must be between 0% and 100%.');
      return;
    }

    setSavingAgent(agentId);
    try {
      const response = await fetch('/api/admin/modules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'agents',
          id: agentId,
          data: { commission_rate: rate },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save commission rate');
      toast.success('Agent commission percentage saved.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save commission rate');
    } finally {
      setSavingAgent(null);
    }
  }

  function agentLabel(agentId: string) {
    const agent = agents.find((item) => String(item.id) === String(agentId));
    return agent?.agent_code || agent?.user_id || agentId;
  }

  function money(value: number, currency = 'PKR') {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Commissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define each agent&apos;s percentage. New agent bookings calculate commission automatically.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/5 p-5">
        <div className="flex gap-3">
          <Calculator className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h2 className="font-semibold">How the automatic calculation works</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Commission is calculated from the agency margin, not from the customer&apos;s full booking price.
            </p>
            <div className="mt-3 rounded-lg bg-background p-3 font-mono text-sm">
              Agent Commission = Agency Margin × Agent % ÷ 100
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Example: supplier cost PKR 80,000 + taxes/fees, customer price PKR 100,000, and the resulting
              agency margin is PKR 20,000. At 25%, the agent earns PKR 5,000. The percentage used is saved
              with the commission record, so changing the agent&apos;s rate later does not change old bookings.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Agent commission percentages</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Set the percentage once. It will be used automatically whenever that agent creates a booking.
        </p>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : agents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No agents found.</p>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end"
              >
                <div>
                  <p className="font-medium">{agent.agent_code || 'Agent'}</p>
                  <p className="text-xs text-muted-foreground">
                    {agent.is_active === false ? 'Inactive' : 'Active'} · ID {agent.id}
                  </p>
                </div>
                <div>
                  <Label htmlFor={'rate-' + agent.id}>Commission %</Label>
                  <Input
                    id={'rate-' + agent.id}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={rates[agent.id] ?? '0'}
                    onChange={(event) => setRates({ ...rates, [agent.id]: event.target.value })}
                  />
                </div>
                <Button onClick={() => void saveRate(String(agent.id))} disabled={savingAgent === String(agent.id)}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingAgent === String(agent.id) ? 'Saving...' : 'Save %'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Calculated commission records</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          These records are created automatically when an agent booking is submitted.
        </p>
        {commissions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No commission records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2">Agent</th>
                  <th className="px-3 py-2">Booking</th>
                  <th className="px-3 py-2">Agency Margin</th>
                  <th className="px-3 py-2">Rate</th>
                  <th className="px-3 py-2">Commission</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((commission) => (
                  <tr key={commission.id} className="border-b last:border-0">
                    <td className="px-3 py-3">{agentLabel(commission.agent_id)}</td>
                    <td className="px-3 py-3 font-mono">{commission.booking_id}</td>
                    <td className="px-3 py-3">{money(commission.basis_amount, commission.currency)}</td>
                    <td className="px-3 py-3">{Number(commission.commission_rate || 0)}%</td>
                    <td className="px-3 py-3 font-semibold">
                      {money(commission.commission_amount, commission.currency)}
                    </td>
                    <td className="px-3 py-3">{commission.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
