'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function AdminModuleManager({ module, title, description }: { module: string; title: string; description: string }) {
  const readOnly = ['bookings'].includes(module);
  const [data,setData]=useState<{fields:string[];rows:any[]}>({fields:[],rows:[]});
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [showForm,setShowForm]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [form,setForm]=useState<Record<string,string>>({});

  async function load(){
    setLoading(true);
    try{const r=await fetch('/api/admin/modules?module='+encodeURIComponent(module)+'&search='+encodeURIComponent(search));const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load');setData(d);}catch(e){toast.error(e instanceof Error?e.message:'Unable to load');}finally{setLoading(false);}
  }
  useEffect(()=>{load();},[module]);

  async function save(){
    try{
      const method=editingId?'PATCH':'POST';
      const body=editingId?{module,id:editingId,data:form}:{module,data:form};
      const r=await fetch('/api/admin/modules',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const d=await r.json();if(!r.ok)throw new Error(d.error||(editingId?'Unable to update':'Unable to create'));
      toast.success(editingId?'Record updated':'Record created');setForm({});setEditingId(null);setShowForm(false);load();
    }catch(e){toast.error(e instanceof Error?e.message:(editingId?'Unable to update':'Unable to create'));}
  }
  function edit(row:any){
    const next:Record<string,string>={};
    for(const field of data.fields) if(row[field]!==undefined&&row[field]!==null) next[field]=String(row[field]);
    setForm(next);setEditingId(String(row.id));setShowForm(true);
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-bold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>{!readOnly && <Button onClick={()=>setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4"/>New</Button>}</div>
    </div>

    {showForm && <Card className="p-5">
      <h2 className="font-semibold mb-4">{editingId?'Edit':'Create'} {title.replace(/s$/,'')}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.fields.filter(f=>!['id','created_at','updated_at'].includes(f)).map(field=><div key={field} className="space-y-1.5">
          <Label>{field.replaceAll('_',' ')}</Label>
          {field.includes('description')||field.includes('notes')||field.includes('reason')||field.includes('summary')?<Textarea value={form[field]||''} onChange={e=>setForm({...form,[field]:e.target.value})}/>:<Input value={form[field]||''} onChange={e=>setForm({...form,[field]:e.target.value})}/>}
        </div>)}
      </div>
      <div className="mt-4 flex gap-2"><Button onClick={save}>{editingId?'Update':'Save'}</Button><Button variant="outline" onClick={()=>{setShowForm(false);setEditingId(null);setForm({});}}>Cancel</Button></div>
    </Card>}

    <Card className="p-4">
      <div className="flex gap-2 mb-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')load();}}/></div><Button variant="outline" onClick={load}>Search</Button></div>
      {loading?<p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>:data.rows.length===0?<p className="py-10 text-center text-sm text-muted-foreground">No records found.</p>:
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left">{data.fields.slice(0,8).map(f=><th key={f} className="px-3 py-2 font-medium capitalize">{f.replaceAll('_',' ')}</th>)}<th className="px-3 py-2 font-medium">Actions</th></tr></thead><tbody>{data.rows.map((row:any)=><tr key={row.id} className="border-b last:border-0"><>{data.fields.slice(0,8).map(f=><td key={f} className="px-3 py-3 max-w-[240px] truncate">{String(row[f]??'—')}</td>)}<td className="px-3 py-3"><Button size="sm" variant="outline" onClick={()=>edit(row)}>Edit</Button></td></tr>)}</tbody></table></div>}
    </Card>
  </div>;
}
