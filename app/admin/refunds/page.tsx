'use client';

import { useEffect,useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminRefundsPage(){
 const [rows,setRows]=useState<any[]>([]);const [loading,setLoading]=useState(true);
 async function load(){setLoading(true);try{const r=await fetch('/api/admin/refunds');const d=await r.json();if(!r.ok)throw new Error(d.error);setRows(d.refunds||[]);}catch(e){toast.error(e instanceof Error?e.message:'Unable to load');}finally{setLoading(false);}}
 useEffect(()=>{load();},[]);
 return <div className="space-y-6"><div className="flex justify-between items-end"><div><h1 className="text-2xl font-bold">Refunds</h1><p className="text-sm text-muted-foreground mt-1">Track cancellation and refund processing.</p></div><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div><Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Reference</th><th className="p-3">Booking</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Reason</th></tr></thead><tbody>{loading?<tr><td colSpan={5} className="p-10 text-center">Loading...</td></tr>:rows.map(r=><tr key={r.id} className="border-b last:border-0"><td className="p-3 font-medium">{r.reference}</td><td className="p-3">{r.bookings?.reference||'—'}</td><td className="p-3">{r.currency} {Number(r.amount).toLocaleString()}</td><td className="p-3"><Badge variant="secondary">{r.status}</Badge></td><td className="p-3 max-w-[320px] truncate">{r.reason||'—'}</td></tr>)}</tbody></table></div></Card></div>;
}
