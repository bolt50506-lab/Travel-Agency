'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Plane, BedDouble, AlertCircle, Loader2, Clock, FileText, Download,
  CheckCircle2, Phone, Mail, ArrowLeft, Calendar, Users as UsersIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/lib/utils/api';
import type { Booking, BookingStatus, BookingDocument } from '@/types/booking';

const statusLabel: Record<string, string> = {
  PAYMENT_RECEIVED: 'Payment Received',
  AGENCY_PROCESSING: 'Agency Processing',
  SUPPLIER_BOOKING_IN_PROGRESS: 'Supplier Booking',
  SUPPLIER_CONFIRMED: 'Supplier Confirmed',
  DOCUMENT_PENDING: 'Document Pending',
  DOCUMENT_UPLOADED: 'Document Uploaded',
  TICKETED: 'Ticketed',
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

export default function BookingDetailPage() {
  const params = useParams();
  const reference = params.id as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/bookings/${reference}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Booking not found');
        return res.json();
      })
      .then((data) => {
        setBooking(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [reference]);

  if (loading) {
    return (
      <div className="container-page py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container-page py-12">
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 flex items-start gap-3 max-w-lg mx-auto">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">{error || 'Booking not found'}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = '/bookings'}>
              Back to Bookings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const visibleDocs = (booking.documents || []).filter((d) => d.customerVisible);
  const isProcessing = !['TICKETED', 'VOUCHER_ISSUED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(booking.status);
  const isTicketed = booking.status === 'TICKETED' || booking.status === 'VOUCHER_ISSUED' || booking.status === 'COMPLETED';

  return (
    <div className="container-page py-8 max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => window.location.href = '/bookings'}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Bookings
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
          {booking.type === 'flight' ? <Plane className="h-6 w-6 text-primary" /> : <BedDouble className="h-6 w-6 text-primary" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{booking.reference}</h1>
          <Badge variant={statusBadgeVariant(booking.status)} className="mt-1">
            {statusLabel[booking.status] || booking.status}
          </Badge>
        </div>
      </div>

      {/* Status Banner */}
      {isProcessing && (
        <Card className="p-4 mb-6 border-amber-400/50 bg-amber-50">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Your booking is being processed</h3>
              <p className="text-sm text-amber-700 mt-1">
                Our travel team has received your booking and is processing it through our authorized suppliers.
                You will be notified once your {booking.type === 'flight' ? 'ticket' : 'voucher'} is ready for download.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isTicketed && visibleDocs.length > 0 && (
        <Card className="p-4 mb-6 border-green-500/50 bg-green-50">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-green-800">Your travel document is ready</h3>
              <p className="text-sm text-green-700 mt-1">
                Your {booking.type === 'flight' ? 'ticket' : 'voucher'} has been issued. Download it from the documents section below.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6">
        {/* Travel Details */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Travel Details</h2>
          {booking.type === 'flight' && booking.flightDetails && (
            <div className="space-y-3">
              {(booking.flightDetails.segments || []).map((seg, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{seg.origin.code}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{seg.destination.code}</span>
                  <span className="text-muted-foreground text-xs ml-auto">{seg.airline.name} {seg.flightNumber}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UsersIcon className="h-4 w-4" />
                {(booking.flightDetails.passengers || []).length} passenger(s):
                <span className="text-foreground">
                  {(booking.flightDetails.passengers || []).map((p) => `${p.firstName} ${p.lastName}`).join(', ')}
                </span>
              </div>
              {booking.fulfillment?.pnr && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">PNR:</span>
                  <span className="font-bold">{booking.fulfillment.pnr}</span>
                </div>
              )}
            </div>
          )}
          {booking.type === 'hotel' && booking.hotelDetails && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium text-base">{booking.hotelDetails.name}</span>
                <p className="text-muted-foreground">{booking.hotelDetails.city}, {booking.hotelDetails.country}</p>
              </div>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">Room: </span>
                <span className="font-medium">{booking.hotelDetails.room.type}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UsersIcon className="h-4 w-4" />
                {(booking.hotelDetails.guests || []).length} guest(s):
                <span className="text-foreground">
                  {(booking.hotelDetails.guests || []).map((g) => `${g.firstName} ${g.lastName}`).join(', ')}
                </span>
              </div>
              {booking.fulfillment?.hotelConfirmationNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Confirmation:</span>
                  <span className="font-bold">{booking.fulfillment.hotelConfirmationNumber}</span>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Contact & Payment */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-3">Contact Information</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {booking.contactEmail}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {booking.contactPhone}
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-3">Payment</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-bold">{formatPrice(booking.totalAmount.amount, booking.totalAmount.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="default">Paid</Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Documents */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Documents</h2>
          {visibleDocs.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {isProcessing
                  ? 'No documents available yet. Your document will appear here once issued by our travel team.'
                  : 'No documents available.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleDocs.map((doc: BookingDocument) => (
                <div key={doc.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type.replace(/_/g, ' ')} · {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => window.open(doc.storagePath, '_blank')}>
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Timeline */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Booking Timeline</h2>
          <div className="space-y-3">
            {(booking.timeline || []).map((evt, i) => (
              <div key={evt.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-3 w-3 rounded-full ${i === (booking.timeline || []).length - 1 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                  {i < booking.timeline.length - 1 && <div className="h-6 w-px bg-border" />}
                </div>
                <div className="pb-1">
                  <p className="text-sm font-medium">{evt.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(evt.timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
