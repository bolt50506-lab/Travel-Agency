'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export type AgentModule = 'customers'|'travelers'|'quotations'|'bookings'|'payments'|'commissions';
type Field = { key: string; label: string; type?: 'text'|'date'|'number'|'select' };

const formFields: Record<AgentModule, Field[]> = {
  customers: [{key:'full_name',label:'Full name'},{key:'email',label:'Email'},{key:'phone',label:'Phone'},{key:'cnic',label:'CNIC'},{key:'passport_number',label:'Passport number'},{key:'passport_expiry',label:'Passport expiry',type:'date'},{key:'nationality',label:'Nationality'},{key:'city',label:'City'}],
  travelers: [{key:'customer_id',label:'Customer',type:'select'},{key:'first_name',label:'First name'},{key:'last_name',label:'Last name'},{key:'date_of_birth',label:'Date of birth',type:'date'},{key:'gender',label:'Gender'},{key:'nationality',label:'Nationality'},{key:'passport_number',label:'Passport number'},{key:'passport_expiry',label:'Passport expiry',type:'date'},{key:'relationship',label:'Relationship'}],
  quotations: [{key:'customer_id',label:'Customer',type:'select'},{key:'service_type',label:'Service',type:'select'},{key:'title',label:'Title'},{key:'supplier_cost',label:'Supplier cost (PKR)',type:'number'},{key:'subtotal',label:'Selling subtotal (PKR)',type:'number'},{key:'discount',label:'Discount (PKR)',type:'number'},{key:'taxes',label:'Taxes (PKR)',type:'number'},{key:'valid_until',label:'Valid until',type:'date'},{key:'notes',label:'Notes'}],
  bookings: [{key:'customer_id',label:'Customer',type:'select'},{key:'type',label:'Type',type:'select'},{key:'contact_email',label:'Contact email'},{key:'contact_phone',label:'Contact phone'},{key:'supplier_cost',label:'Supplier cost (PKR)',type:'number'},{key:'total_amount',label:'Selling price (PKR)',type:'number'},{key:'taxes',label:'Taxes (PKR)',type:'number'},{key:'fees',label:'Service fees (PKR)',type:'number'},{key:'discount',label:'Discount (PKR)',type:'number'},{key:'supplier_name',label:'Supplier'},{key:'notes',label:'Notes'}], payments: [{key:'booking_id',label:'Booking',type:'select'},{key:'method',label:'Payment method',type:'select'},{key:'amount',label:'Amount (PKR)',type:'number'},{key:'paymentReference',label:'Payment reference'}], commissions: []
};

const displayFields: Record<AgentModule,string[]> = {
  customers: ['full_name','email','phone','city','passport_number'],
  travelers: ['first_name','last_name','passport_number','passport_expiry','nationality'],
  quotations: ['reference','title','status','supplier_cost','total','agency_margin','currency','valid_until'],
  bookings: ['reference','type','status','customer_price','currency','created_at'],
  payments: ['reference','method','amount','currency','status','created_at'],
  commissions: ['booking_id','basis_amount','commission_rate','commission_amount','currency','status','created_at']
};

const titles: Record<AgentModule,string> = {customers:'Customers',travelers:'Travelers',quotations:'Quotations',bookings:'Bookings',payments:'Payments',commissions:'Commissions'};

export default function AgentRecords({ module }: { module: AgentModule }) {
  const [rows,setRows]=useState<any[]>([]);
  const [customers,setCustomers]=useState<any[]>([]);
  const [bookings,setBookings]=useState<any[]>([]);
  const [form,setForm]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const response=await fetch('/api/agent/modules?module='+encodeURIComponent(module));
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||'Unable to load module');
      setRows(result.rows||[]); setCustomers(result.meta?.customers||[]); setBookings(result.meta?.bookings||[]);
    } catch(e) { setError(e instanceof Error?e.message:'Unable to load module'); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ void load(); },[module]);

  async function save() {
    setSaving(true); setError('');
    try {
      const payload = module === 'bookings'
        ? { module, data: { ...form, totalAmount: { amount: Number(form.total_amount || 0), currency: 'PKR' }, supplierCost: Number(form.supplier_cost || 0), taxes: Number(form.taxes || 0), fees: Number(form.fees || 0), discount: Number(form.discount || 0) } }
        : module === 'payments'
          ? { bookingReference: bookings.find((booking) => booking.id === form.booking_id)?.reference, amount: { amount: Number(form.amount || 0), currency: 'PKR' }, method: form.method, paymentReference: form.paymentReference }
          : { module, data: form };
      const endpoint = module === 'bookings' ? '/api/bookings' : module === 'payments' ? '/api/payments/create' : '/api/agent/modules';
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||'Unable to save');
      setForm({}); await load();
    } catch(e) { setError(e instanceof Error?e.message:'Unable to save'); }
    finally { setSaving(false); }
  }

  const fields=formFields[module];
  const columns=displayFields[module];

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-medium text-primary">Destino Travels · Agent Portal</p><h1 className="text-2xl font-bold">{titles[module]}</h1><p className="mt-1 text-sm text-muted-foreground">Agent-owned operational data. Employee administration is isolated from this portal.</p></div>
      <Button variant="outline" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>
    </div>
    {error&&<Card className="p-4 text-sm text-destructive">{error}</Card>}
    {fields.length>0&&<Card className="p-5">
      <div className="mb-4 flex items-center gap-2"><Plus className="h-4 w-4"/><h2 className="font-semibold">Add record</h2></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(field=><label key={field.key} className="text-sm"><span className="mb-1 block text-muted-foreground">{field.label}</span>
          {field.type==='select'?<select className="h-10 w-full rounded-md border bg-background px-3" value={form[field.key]||''} onChange={e=>setForm({...form,[field.key]:e.target.value})}><option value="">{field.key==='type'||field.key==='service_type'||field.key==='method'?'Select option':'Select customer'}</option>{field.key==='type'?<><option value="flight">Flight</option><option value="hotel">Hotel</option></>:field.key==='service_type'?<><option value="flight">Flight</option><option value="hotel">Hotel</option><option value="package">Package</option><option value="visa">Visa</option><option value="insurance">Insurance</option></>:field.key==='method'?<><option value="bank_transfer">Bank transfer</option><option value="raast">Raast</option><option value="jazzcash">JazzCash</option><option value="easypaisa">Easypaisa</option><option value="manual">Manual</option></>:field.key==='booking_id'?bookings.map(b=><option key={b.id} value={b.id}>{b.reference} · PKR {Number(b.customer_price||0).toLocaleString()}</option>):customers.map(c=><option key={c.id} value={c.id}>{c.full_name}</option>)}</select>
          :<input className="h-10 w-full rounded-md border bg-background px-3" type={field.type||'text'} value={form[field.key]||''} onChange={e=>setForm({...form,[field.key]:e.target.value})}/>}
        </label>)}
      </div>
      <Button className="mt-4" disabled={saving} onClick={()=>void save()}><Save className="mr-2 h-4 w-4"/>{saving?'Saving…':'Save record'}</Button>
    </Card>}
    {loading?<Card className="p-10 text-center text-sm text-muted-foreground">Loading…</Card>:<Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left">{columns.map(k=><th key={k} className="p-3 font-medium capitalize">{k.replaceAll('_',' ')}</th>)}{module==='quotations'&&<th className="p-3 font-medium">Actions</th>}</tr></thead><tbody>
      {rows.length===0?<tr><td colSpan={columns.length} className="p-8 text-center text-muted-foreground">No records found.</td></tr>:rows.map(row=><tr key={row.id} className="border-b last:border-0">{columns.map(k=><td key={k} className="max-w-[260px] truncate p-3">{String(row[k]??'—')}</td>)}{module==='quotations'&&<td className="p-3"><div className="flex flex-wrap gap-2">{!['SENT','VIEWED','APPROVED','CONVERTED'].includes(String(row.status))&&<Button size="sm" variant="outline" onClick={async()=>{setError('');try{const r=await fetch('/api/agent/modules',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({module:'quotations',id:row.id,status:'SENT'})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to send quote');await load();}catch(e){setError(e instanceof Error?e.message:'Unable to send quote');}}}>Mark sent</Button>}{['SENT','VIEWED'].includes(String(row.status))&&<Button size="sm" variant="outline" onClick={async()=>{setError('');try{const r=await fetch('/api/agent/modules',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({module:'quotations',id:row.id,status:'APPROVED'})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to approve quote');await load();}catch(e){setError(e instanceof Error?e.message:'Unable to approve quote');}}}>Approve</Button>}{['APPROVED','SENT','VIEWED'].includes(String(row.status))&&<Button size="sm" onClick={async()=>{setError('');try{const r=await fetch('/api/agent/quotations/'+row.id+'/convert',{method:'POST'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Conversion failed');await load();}catch(e){setError(e instanceof Error?e.message:'Conversion failed');}}}>Convert</Button>}</div></td>}</tr>)}
    </tbody></table></div></Card>}
  </div>;
}
