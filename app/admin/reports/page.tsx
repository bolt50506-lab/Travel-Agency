'use client';

import { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, TrendingUp, Plane, BedDouble, Clock, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/api';

type Dashboard = {
  cards: { totalBookings:number; todayBookings:number; flightBookings:number; hotelBookings:number; revenue:number; grossMargin:number; pendingPayments:number; fulfillmentPending:number; refundRequests:number };
  recent: Array<{ id:string; type:string; status:string; customer_price:number; currency:string; created_at:string }>;
};

export default function AdminReportsPage() {
  const [data,setData]=useState<Dashboard|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  async function load(){setLoading(true);setError('');try{const r=await fetch('/api/admin/dashboard');const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load reports');setData(d);}catch(e){setError(e instanceof Error?e.message:'Unable to load reports');}finally{setLoading(false);}}
  useEffect(()=>{load();},[]);
  const c=data?.cards;
  return <div className="space-y-6">
    <div className="flex items-end justify-between gap-4"><div><h1 className="text-2xl font-bold">Reports & Analytics</h1><p className="mt-1 text-sm text-muted-foreground">Live operational view of bookings, PKR revenue, margin and workload.</p></div><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div>
    {error&&<Card className="p-4 text-sm text-destructive">{error}</Card>}
    {loading?<Card className="p-10 text-center text-sm text-muted-foreground">Loading live reports…</Card>:c&&<><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ['Total bookings',c.totalBookings,BarChart3],['Today's bookings',c.todayBookings,Clock],['PKR revenue',formatPrice(c.revenue,'PKR'),Wallet],['PKR gross margin',formatPrice(c.grossMargin,'PKR'),TrendingUp]
      ].map(([label,value,Icon])=><Card key={String(label)} className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className="h-4 w-4"/></div><div className="mt-3 text-2xl font-bold">{value}</div></Card>)}</div>
      <div className="grid gap-4 md:grid-cols-3"><Card className="p-5"><div className="flex gap-3"><Plane className="h-5 w-5"/><div><p className="text-sm text-muted-foreground">Flight bookings</p><p className="text-2xl font-bold">{c.flightBookings}</p></div></div></Card><Card className="p-5"><div className="flex gap-3"><BedDouble className="h-5 w-5"/><div><p className="text-sm text-muted-foreground">Hotel bookings</p><p className="text-2xl font-bold">{c.hotelBookings}</p></div></div></Card><Card className="p-5"><div className="flex gap-3"><Clock className="h-5 w-5"/><div><p className="text-sm text-muted-foreground">Awaiting payment</p><p className="text-2xl font-bold">{c.pendingPayments}</p></div></div></Card></div>
      <Card className="overflow-hidden"><div className="p-5"><h2 className="font-semibold">Recent bookings</h2><p className="text-sm text-muted-foreground">Latest agency activity from the self-hosted database.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y text-left"><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Customer price</th><th className="p-3">Created</th></tr></thead><tbody>{data.recent.map(row=><tr key={row.id} className="border-b last:border-0"><td className="p-3 capitalize">{row.type}</td><td className="p-3">{row.status.replaceAll('_',' ')}</td><td className="p-3 font-medium">PKR {Number(row.customer_price||0).toLocaleString()}</td><td className="p-3">{new Date(row.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></Card>
    </>}
  </div>;
}