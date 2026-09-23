'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminPaymentsPage(){
 const [payments,setPayments]=useState<any[]>([]);const [loading,setLoading]=useState(true);
 async function load(){setLoading(true);try{const r=await fetch('/api/admin/payments');const d=await r.json();if(!r.ok)throw new Error(d.error);setPayments(d.payments||[]);}catch(e){toast.error(e instanceof Error?e.message:'Unable to load');}finally{setLoading(false);}}
 useEffect(()=>{load();},[]);
 async function verify(id:string,action:'verify'|'reject'){try{const r=await fetch('/api/payments/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentId:id,action,reason:action==='reject'?'Payment proof/details were not accepted.':undefined})});const d=await r.json();if(!r.ok)throw new Error(d.error);toast.success(action==='verify'?'Payment verified':'Payment rejected');load();}catch(e){toast.error(e instanceof Error?e.message:'Unable to update payment');}}
 return <div className="space-y-6"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Payments</h1><p className="text-sm text-muted-foreground mt-1">Verify Pakistani payment methods before fulfillment.</p></div><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div>
 <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Reference</th><th className="p-3">Booking</th><th className="p-3">Method</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr></thead><tbody>{loading?<tr><td colSpan={6} className="p-10 text-center">Loading...</td></tr>:payments.map(p=><tr key={p.id} className="border-b last:border-0"><td className="p-3 font-medium">{p.reference}</td><td className="p-3">{p.bookings?.reference||'—'}</td><td className="p-3 capitalize">{String(p.method).replaceAll('_',' ')}</td><td className="p-3">{p.currency} {Number(p.amount).toLocaleString()}</td><td className="p-3"><Badge variant={p.status==='verified'?'default':p.status==='rejected'?'destructive':'secondary'}>{p.status}</Badge></td><td className="p-3 text-right">{p.status==='pending_verification'?<div className="flex justify-end gap-2"><Button size="sm" onClick={()=>verify(p.id,'verify')}><CheckCircle2 className="mr-1 h-4 w-4"/>Verify</Button><Button size="sm" variant="outline" onClick={()=>verify(p.id,'reject')}><XCircle className="mr-1 h-4 w-4"/>Reject</Button></div>:<span className="text-muted-foreground">—</span>}</td></tr>)}</tbody></table></div></Card></div>;
}
