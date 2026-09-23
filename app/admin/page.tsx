'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Plane, BedDouble, Banknote, CreditCard, RefreshCw, Calendar, TrendingUp, ClipboardList, Percent } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/utils/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

interface DashboardData {
  cards: {
    totalBookings: number;
    todayBookings: number;
    flightBookings: number;
    hotelBookings: number;
    revenue: number;
    grossMargin: number;
    pendingPayments: number;
    fulfillmentPending: number;
    refundRequests: number;
  };
  recent?: Array<{ id:string; reference:string; type:string; status:string; customer_price:number; currency:string; created_at:string }>;
  charts: {
    bookingsOverTime: Array<{ date: string; bookings: number }>;
    revenueOverTime: Array<{ date: string; revenue: number }>;
    flightVsHotel: Array<{ name: string; value: number }>;
  };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Total Bookings', value: data.cards.totalBookings, icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
    { label: "Today's Bookings", value: data.cards.todayBookings, icon: Calendar, color: 'text-green-600 bg-green-50' },
    { label: 'Flight Bookings', value: data.cards.flightBookings, icon: Plane, color: 'text-cyan-600 bg-cyan-50' },
    { label: 'Hotel Bookings', value: data.cards.hotelBookings, icon: BedDouble, color: 'text-amber-600 bg-amber-50' },
    { label: 'Revenue', value: formatPrice(data.cards.revenue), icon: Banknote, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Gross Margin', value: formatPrice(data.cards.grossMargin), icon: Percent, color: 'text-violet-600 bg-violet-50' },
    { label: 'Fulfillment Pending', value: data.cards.fulfillmentPending, icon: ClipboardList, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Pending Payments', value: data.cards.pendingPayments, icon: CreditCard, color: 'text-orange-600 bg-orange-50' },
    { label: 'Refund Requests', value: data.cards.refundRequests, icon: RefreshCw, color: 'text-red-600 bg-red-50' },
  ];

  const pieColors = ['#0ea5e9', '#f59e0b'];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Bookings Over Time
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.charts.bookingsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="bookings" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Revenue Over Time
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.charts.revenueOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatPrice(value)} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4">Flight vs Hotel Bookings</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data.charts.flightVsHotel}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {data.charts.flightVsHotel.map((_, i) => (
                  <Cell key={i} fill={pieColors[i % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Recent Bookings</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {(data.recent || []).map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">{booking.reference}</TableCell>
                <TableCell className="capitalize">{booking.type}</TableCell>
                <TableCell><Badge variant="secondary">{booking.status}</Badge></TableCell>
                <TableCell className="text-right font-medium">{formatPrice(Number(booking.customer_price || 0), booking.currency || 'PKR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
