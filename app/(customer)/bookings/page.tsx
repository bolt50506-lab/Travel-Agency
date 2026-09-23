'use client';

import { useEffect, useState } from 'react';
import { Plane, BedDouble, Calendar, AlertCircle, Loader2, Search, Clock, FileText, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/utils/api';
import type { Booking, BookingStatus } from '@/types/booking';

const statusLabel: Record<string, string> = {
  PAYMENT_RECEIVED: 'Payment Received',
  AGENCY_PROCESSING: 'Agency Processing',
  SUPPLIER_BOOKING_IN_PROGRESS: 'Supplier Booking',
  SUPPLIER_CONFIRMED: 'Supplier Confirmed',
  DOCUMENT_PENDING: 'Document Pending',
  DOCUMENT_UPLOADED: 'Document Uploaded',
  TICKET_PENDING: 'Ticket Pending',
  TICKETED: 'Ticketed',
  VOUCHER_PENDING: 'Voucher Pending',
  VOUCHER_ISSUED: 'Voucher Issued',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUND_REQUESTED: 'Refund Requested',
  REFUND_PROCESSING: 'Refund Processing',
  REFUNDED: 'Refunded',
  FAILED: 'Failed',
  CUSTOMER_ACTION_REQUIRED: 'Action Required',
  PRICE_CHANGE_REVIEW: 'Price Change Review',
};

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (['TICKETED', 'VOUCHER_ISSUED', 'COMPLETED'].includes(status)) return 'default';
  if (['CANCELLED', 'FAILED', 'REFUND_PROCESSING'].includes(status)) return 'destructive';
  return 'secondary';
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/bookings')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load bookings');
        return res.json();
      })
      .then((data) => {
        setBookings(data.bookings || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filtered = bookings.filter((b) =>
    b.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold mb-1">My Bookings</h1>
      <p className="text-sm text-muted-foreground mb-6">View and manage your flight and hotel bookings with our travel agency.</p>

      <div className="mb-6 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by agency reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold">No bookings found</h3>
          <p className="text-sm text-muted-foreground mt-1">You haven&apos;t made any bookings yet. Start by searching for flights or hotels.</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button onClick={() => window.location.href = '/flights'}>Search Flights</Button>
            <Button variant="outline" onClick={() => window.location.href = '/hotels'}>Search Hotels</Button>
          </div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((booking) => {
            const hasVisibleDocs = booking.documents.some((d) => d.customerVisible);
            const isProcessing = !['TICKETED', 'VOUCHER_ISSUED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(booking.status);
            return (
              <Card key={booking.id} className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 shrink-0">
                      {booking.type === 'flight' ? (
                        <Plane className="h-5 w-5 text-primary" />
                      ) : (
                        <BedDouble className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold">{booking.reference}</span>
                        <Badge variant={statusBadgeVariant(booking.status)}>
                          {statusLabel[booking.status] || booking.status}
                        </Badge>
                        {hasVisibleDocs && (
                          <Badge variant="outline" className="gap-1">
                            <FileText className="h-3 w-3" /> Document Ready
                          </Badge>
                        )}
                      </div>
                      {booking.type === 'flight' && booking.flightDetails && (
                        <div className="text-sm text-muted-foreground">
                          {booking.flightDetails.passengers.length} passenger(s)
                          {booking.fulfillment?.pnr && <span> · PNR: {booking.fulfillment.pnr}</span>}
                        </div>
                      )}
                      {booking.type === 'hotel' && booking.hotelDetails && (
                        <div className="text-sm text-muted-foreground">
                          {booking.hotelDetails.name} · {booking.hotelDetails.room.type}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Booked on {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {isProcessing && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Our travel team is processing your booking
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatPrice(booking.totalAmount.amount, booking.totalAmount.currency)}</p>
                    <Button variant="outline" size="sm" className="mt-1" onClick={() => window.location.href = `/bookings/${booking.reference}`}>
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
