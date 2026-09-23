'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function AdminModuleManager({
  module,
  title,
  description,
}: {
  module: string;
  title: string;
  description: string;
}) {
  const readOnly = module === 'bookings';
  const [data, setData] = useState<{ fields: string[]; rows: any[] }>({ fields: [], rows: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(
        '/api/admin/modules?module=' + encodeURIComponent(module) + '&search=' + encodeURIComponent(search)
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load');
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [module]);

  async function save() {
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const payload = editingId
        ? { module, id: editingId, data: form }
        : { module, data: form };
      const response = await fetch('/api/admin/modules', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save');
      toast.success(editingId ? 'Record updated' : 'Record created');
      setForm({});
      setEditingId(null);
      setShowForm(false);
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save');
    }
  }

  function edit(row: any) {
    const next: Record<string, string> = {};
    for (const field of data.fields) {
      if (row[field] !== undefined && row[field] !== null) next[field] = String(row[field]);
    }
    setForm(next);
    setEditingId(String(row.id));
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {!readOnly && (
            <Button
              onClick={() => {
                setEditingId(null);
                setForm({});
                setShowForm((value) => !value);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">
            {editingId ? 'Edit' : 'Create'} {title.replace(/s$/, '')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.fields
              .filter((field) => !['id', 'created_at', 'updated_at'].includes(field))
              .map((field) => (
                <div key={field} className="space-y-1.5">
                  <Label>{field.replaceAll('_', ' ')}</Label>
                  {field.includes('description') ||
                  field.includes('notes') ||
                  field.includes('reason') ||
                  field.includes('summary') ? (
                    <Textarea
                      value={form[field] || ''}
                      onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                    />
                  ) : (
                    <Input
                      value={form[field] || ''}
                      onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                    />
                  )}
                </div>
              ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => void save()}>{editingId ? 'Update' : 'Save'}</Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm({});
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void load();
              }}
            />
          </div>
          <Button variant="outline" onClick={() => void load()}>
            Search
          </Button>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>
        ) : data.rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  {data.fields.slice(0, 8).map((field) => (
                    <th key={field} className="px-3 py-2 font-medium capitalize">
                      {field.replaceAll('_', ' ')}
                    </th>
                  ))}
                  {!readOnly && <th className="px-3 py-2 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row: any) => (
                  <tr key={row.id} className="border-b last:border-0">
                    {data.fields.slice(0, 8).map((field) => (
                      <td key={field} className="max-w-[240px] truncate px-3 py-3">
                        {String(row[field] ?? '—')}
                      </td>
                    ))}
                    {!readOnly && (
                      <td className="px-3 py-3">
                        <Button size="sm" variant="outline" onClick={() => edit(row)}>
                          Edit
                        </Button>
                      </td>
                    )}
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
