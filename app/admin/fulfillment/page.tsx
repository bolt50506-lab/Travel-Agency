'use client';

import { useEffect, useState } from 'react';
import {
  ClipboardList, Plane, BedDouble, Loader2, AlertCircle, Clock,
  CheckCircle2, FileText, Phone, Mail, DollarSign, ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatPrice } from '@/lib/utils/api';
import { cn } from '@/lib/utils';

interface QueueItem {
  id: string;
  reference: string;
  type: 'flight' | 'hotel';
  status: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: { amount: number; currency: string };
  supplierCost?: { amount: number; currency: string };
  margin?: { amount: number; currency: string };
  fulfillmentStatus: string;
  assignedTo?: string;
  supplierName?: string;
  supplierReference?: string;
  pnr?: string;
  ticketNumber?: string;
  hotelConfirmationNumber?: string;
  hasDocuments: boolean;
  createdAt: string;
  updatedAt: string;
  waitingTime: string;
  summary: string;
}

interface BookingDetail {
  id: string;
  reference: string;
  type: 'flight' | 'hotel';
  status: string;
  contactEmail: string;
  contactPhone: string;
  totalAmount: { amount: number; currency: string };
  supplierCost?: { amount: number; currency: string };
  margin?: { amount: number; currency: string };
  flightDetails?: { passengers: { type: string; firstName: string; lastName: string; dateOfBirth: string }[]; segments: { origin: string; destination: string; airline: string; flightNumber: string }[] };
  hotelDetails?: { name: string; city: string; country: string; room: { type: string }; guests: { firstName: string; lastName: string }[] };
  fulfillment?: {
    id: string;
    status: string;
    assignedTo?: string;
    supplierName?: string;
    supplierReference?: string;
    pnr?: string;
    ticketNumber?: string;
    hotelConfirmationNumber?: string;
    notes: { id: string; author: string; text: string; createdAt: string }[];
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;
  };
  documents: { id: string; type: string; filename: string; customerVisible: boolean; createdAt: string }[];
  payments?: { id: string; amount: number; currency: string; status: string; reference: string }[];
  timeline: { id: string; status: string; description: string; timestamp: string }[];
}

function normalizeBookingDetail(raw: any): BookingDetail {
  const money = (amount: unknown, currency: unknown) => ({
    amount: Number(amount ?? 0),
    currency: String(currency || 'PKR'),
  });

  const fulfillment = Array.isArray(raw.fulfillment_tasks)
    ? raw.fulfillment_tasks[0]
    : raw.fulfillment_tasks || raw.fulfillment;

  const fulfillmentDetails = fulfillment ? {
    id: fulfillment.id,
    status: String(fulfillment.status || '').toUpperCase(),
    assignedTo: fulfillment.assigned_to ?? fulfillment.assignedTo,
    supplierName: fulfillment.supplier_name ?? fulfillment.supplierName,
    supplierReference: fulfillment.supplier_reference ?? fulfillment.supplierReference,
    pnr: fulfillment.pnr,
    ticketNumber: fulfillment.ticket_number ?? fulfillment.ticketNumber,
    hotelConfirmationNumber: fulfillment.hotel_confirmation_number ?? fulfillment.hotelConfirmationNumber,
    notes: (fulfillment.notes || []).map((n: any) => ({
      id: n.id,
      author: n.author ?? n.author_name ?? n.author_id ?? 'Agency',
      text: n.text ?? n.note ?? '',
      createdAt: n.created_at ?? n.createdAt,
    })),
    createdAt: fulfillment.created_at ?? fulfillment.createdAt,
    updatedAt: fulfillment.updated_at ?? fulfillment.updatedAt,
    startedAt: fulfillment.started_at ?? fulfillment.startedAt,
    completedAt: fulfillment.completed_at ?? fulfillment.completedAt,
  } : undefined;

  return {
    id: raw.id,
    reference: raw.reference,
    type: raw.type,
    status: raw.status,
    contactEmail: raw.contact_email ?? raw.contactEmail ?? raw.customers?.email ?? '',
    contactPhone: raw.contact_phone ?? raw.contactPhone ?? raw.customers?.phone ?? '',
    totalAmount: raw.totalAmount
      ? money(raw.totalAmount.amount, raw.totalAmount.currency)
      : money(raw.customer_price ?? raw.total_amount, raw.currency),
    supplierCost: raw.supplierCost
      ? money(raw.supplierCost.amount, raw.supplierCost.currency)
      : raw.supplier_cost != null
        ? money(raw.supplier_cost, raw.currency)
        : undefined,
    margin: raw.margin
      ? money(raw.margin.amount, raw.margin.currency)
      : raw.agency_margin != null
        ? money(raw.agency_margin, raw.currency)
        : undefined,
    flightDetails: raw.flightDetails ?? raw.flight_details,
    hotelDetails: raw.hotelDetails ?? raw.hotel_details,
    fulfillment: fulfillmentDetails,
    documents: (raw.documents || []).map((doc: any) => ({
      id: doc.id,
      type: doc.type ?? doc.document_type ?? 'DOCUMENT',
      filename: doc.filename ?? doc.file_name ?? 'Document',
      customerVisible: Boolean(doc.customer_visible ?? doc.customerVisible),
      createdAt: doc.created_at ?? doc.createdAt,
    })),
    payments: (raw.payments || []).map((payment: any) => ({
      id: payment.id,
      amount: Number(payment.amount ?? 0),
      currency: payment.currency ?? raw.currency ?? 'PKR',
      status: payment.status,
      reference: payment.reference ?? payment.transaction_reference ?? '',
    })),
    timeline: (raw.booking_status_history || raw.timeline || []).map((evt: any) => ({
      id: evt.id,
      status: evt.status,
      description: evt.description ?? evt.status ?? '',
      timestamp: evt.timestamp ?? evt.created_at ?? evt.createdAt,
    })),
  };
}

export default function FulfillmentPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const [noteText, setNoteText] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierRef, setSupplierRef] = useState('');
  const [pnr, setPnr] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [hotelConf, setHotelConf] = useState('');
  const [docFilename, setDocFilename] = useState('');
  const [docType, setDocType] = useState('AIRLINE_TICKET');
  const [docVisible, setDocVisible] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  const fetchQueue = () => {
    setLoading(true);
    fetch(`/api/admin/fulfillment?status=${statusFilter}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load fulfillment queue');
        return res.json();
      })
      .then((data) => {
        setQueue(data.queue || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const openBooking = (id: string) => {
    setDetailLoading(true);
    setActionResult(null);
    setNoteText('');
    setSupplierName('');
    setSupplierRef('');
    setPnr('');
    setTicketNumber('');
    setHotelConf('');
    setDocFilename('');
    setDocType('AIRLINE_TICKET');
    setDocVisible(false);
    setDocFile(null);

    fetch(`/api/admin/fulfillment/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load booking');
        return res.json();
      })
      .then((data) => {
        const booking = normalizeBookingDetail(data);
        setSelectedBooking(booking);
        if (booking.fulfillment?.supplierName) setSupplierName(booking.fulfillment.supplierName);
        if (booking.fulfillment?.supplierReference) setSupplierRef(booking.fulfillment.supplierReference);
        if (booking.fulfillment?.pnr) setPnr(booking.fulfillment.pnr);
        if (booking.fulfillment?.ticketNumber) setTicketNumber(booking.fulfillment.ticketNumber);
        if (booking.fulfillment?.hotelConfirmationNumber) setHotelConf(booking.fulfillment.hotelConfirmationNumber);
        setDetailLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setDetailLoading(false);
      });
  };

  const doAction = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!selectedBooking) return;
    setActionLoading(true);
    setActionResult(null);

    try {
      const res = await fetch(`/api/admin/fulfillment/${selectedBooking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      setSelectedBooking(normalizeBookingDetail(data));
      setActionResult('Action completed successfully');
      fetchQueue();
    } catch (err) {
      setActionResult(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const requestRefund = async () => {
    if (!selectedBooking) return;
    const payment = (selectedBooking.payments || []).find((item) => item.status === 'verified');
    if (!payment) {
      setActionResult('No verified payment is available for refund.');
      return;
    }
    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payment.id, amount: Number(payment.amount), reason: 'Refund initiated from fulfillment queue' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund request failed');
      setActionResult('Refund processing has been initiated.');
      await openBooking(selectedBooking.id);
      fetchQueue();
    } catch (err) {
      setActionResult(err instanceof Error ? err.message : 'Refund request failed');
    } finally {
      setActionLoading(false);
    }
  };

  const uploadDocument = async () => {
    if (!selectedBooking || !docFile) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      const form = new FormData();
      form.set('bookingId', selectedBooking.id);
      form.set('documentType', docType);
      form.set('customerVisible', String(docVisible));
      form.set('file', docFile);
      const res = await fetch('/api/admin/documents', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Document upload failed');
      setActionResult('Document uploaded successfully');
      setDocFile(null);
      await openBooking(selectedBooking.id);
    } catch (err) {
      setActionResult(err instanceof Error ? err.message : 'Document upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    if (['TICKETED', 'VOUCHER_ISSUED', 'COMPLETED'].includes(status)) return 'default';
    if (['CANCELLED', 'FAILED', 'REFUND_PROCESSING'].includes(status)) return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fulfillment Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">Process customer bookings through your authorized suppliers and upload final documents.</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
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

      {!loading && !error && queue.length === 0 && (
        <Card className="p-12 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold">No bookings in queue</h3>
          <p className="text-sm text-muted-foreground mt-1">All bookings have been processed.</p>
        </Card>
      )}

      {!loading && !error && queue.length > 0 && (
        <div className="space-y-3">
          {queue.map((item) => (
            <Card key={item.id} className="p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openBooking(item.id)}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 shrink-0">
                    {item.type === 'flight' ? <Plane className="h-5 w-5 text-primary" /> : <BedDouble className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold">{item.reference}</span>
                      <Badge variant={statusBadgeVariant(item.fulfillmentStatus)}>{item.fulfillmentStatus}</Badge>
                      {item.hasDocuments && <Badge variant="outline"><FileText className="h-3 w-3 mr-1" />Doc</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.summary}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{item.customerEmail}</span>
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{item.customerPhone}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Waiting {item.waitingTime}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Customer Price</p>
                    <p className="text-sm font-bold">{formatPrice(item.totalAmount.amount, item.totalAmount.currency)}</p>
                  </div>
                  {item.supplierCost && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Supplier Cost</p>
                      <p className="text-sm text-muted-foreground">{formatPrice(item.supplierCost.amount, item.supplierCost.currency)}</p>
                    </div>
                  )}
                  {item.margin && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Margin</p>
                      <p className="text-sm font-medium text-green-600">{formatPrice(item.margin.amount, item.margin.currency)}</p>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openBooking(item.id); }}>
                    Open <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedBooking ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedBooking.type === 'flight' ? <Plane className="h-5 w-5" /> : <BedDouble className="h-5 w-5" />}
                  {selectedBooking.reference}
                  <Badge variant={statusBadgeVariant(selectedBooking.status)}>{selectedBooking.status}</Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Customer & Travel Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="p-3">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Customer</h4>
                    <p className="text-sm font-medium">{selectedBooking.contactEmail}</p>
                    <p className="text-sm text-muted-foreground">{selectedBooking.contactPhone}</p>
                  </Card>
                  <Card className="p-3">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Pricing</h4>
                    <div className="flex justify-between text-sm">
                      <span>Customer Price</span>
                      <span className="font-bold">{formatPrice(selectedBooking.totalAmount.amount, selectedBooking.totalAmount.currency)}</span>
                    </div>
                    {selectedBooking.supplierCost && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Supplier Cost</span>
                        <span>{formatPrice(selectedBooking.supplierCost.amount, selectedBooking.supplierCost.currency)}</span>
                      </div>
                    )}
                    {selectedBooking.margin && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Margin</span>
                        <span className="font-medium text-green-600">{formatPrice(selectedBooking.margin.amount, selectedBooking.margin.currency)}</span>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Travel Details */}
                {selectedBooking.type === 'flight' && selectedBooking.flightDetails && (
                  <Card className="p-3">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Flight Details</h4>
                    <div className="space-y-1 text-sm">
                      {selectedBooking.flightDetails.passengers.map((p, i) => (
                        <div key={i}>{p.firstName} {p.lastName} ({p.type})</div>
                      ))}
                    </div>
                  </Card>
                )}
                {selectedBooking.type === 'hotel' && selectedBooking.hotelDetails && (
                  <Card className="p-3">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Hotel Details</h4>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{selectedBooking.hotelDetails.name}</p>
                      <p className="text-muted-foreground">{selectedBooking.hotelDetails.room.type}</p>
                      {selectedBooking.hotelDetails.guests.map((g, i) => (
                        <div key={i}>{g.firstName} {g.lastName}</div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Supplier Info */}
                <Card className="p-3">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-3">Supplier Information</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Supplier Name</Label>
                      <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="e.g. Amadeus" className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Supplier Reference</Label>
                      <Input value={supplierRef} onChange={(e) => setSupplierRef(e.target.value)} placeholder="Supplier ref" className="mt-1 h-8 text-sm" />
                    </div>
                    {selectedBooking.type === 'flight' ? (
                      <>
                        <div>
                          <Label className="text-xs">PNR</Label>
                          <Input value={pnr} onChange={(e) => setPnr(e.target.value)} placeholder="e.g. QX4J2K" className="mt-1 h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Ticket Number</Label>
                          <Input value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} placeholder="Ticket number" className="mt-1 h-8 text-sm" />
                        </div>
                      </>
                    ) : (
                      <div>
                        <Label className="text-xs">Hotel Confirmation #</Label>
                        <Input value={hotelConf} onChange={(e) => setHotelConf(e.target.value)} placeholder="Confirmation number" className="mt-1 h-8 text-sm" />
                      </div>
                    )}
                  </div>
                  <Button size="sm" className="mt-3" disabled={actionLoading} onClick={() => doAction('supplier_confirmed', { supplierName, supplierReference: supplierRef, pnr, ticketNumber, hotelConfirmationNumber: hotelConf })}>
                    Save Supplier Details & Confirm
                  </Button>
                </Card>

                {/* Document Upload */}
                <Card className="p-3">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Upload Document</h4>
                  <p className="text-xs text-muted-foreground mb-3">PDF, JPG, PNG or WEBP · maximum 15 MB. Stored on the agency server.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Document Type</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AGENCY_CONFIRMATION">Agency Confirmation</SelectItem>
                          <SelectItem value="AIRLINE_TICKET">Airline Ticket</SelectItem>
                          <SelectItem value="AIRLINE_ITINERARY">Airline Itinerary</SelectItem>
                          <SelectItem value="HOTEL_CONFIRMATION">Hotel Confirmation</SelectItem>
                          <SelectItem value="HOTEL_VOUCHER">Hotel Voucher</SelectItem>
                          <SelectItem value="PAYMENT_RECEIPT">Payment Receipt</SelectItem>
                          <SelectItem value="REFUND_DOCUMENT">Refund Document</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">File</Label>
                      <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="mt-1 h-8 text-xs" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input type="checkbox" id="docVisible" checked={docVisible} onChange={(e) => setDocVisible(e.target.checked)} className="h-4 w-4 rounded border-border" />
                    <Label htmlFor="docVisible" className="text-sm">Make visible to customer immediately</Label>
                  </div>
                  <Button size="sm" variant="outline" className="mt-3" disabled={actionLoading || !docFile} onClick={() => void uploadDocument()}>
                    <FileText className="h-4 w-4 mr-1" /> Upload Document
                  </Button>
                </Card>

                {/* Existing Documents */}
                {selectedBooking.documents.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Uploaded Documents</h4>
                    <div className="space-y-1">
                      {selectedBooking.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <a href={`/api/documents/${doc.id}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">{doc.filename}</a>
                            <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                          </div>
                          <Badge variant={doc.customerVisible ? 'default' : 'secondary'}>
                            {doc.customerVisible ? 'Visible' : 'Hidden'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Timeline</h4>
                  <div className="space-y-2">
                    {selectedBooking.timeline.map((evt) => (
                      <div key={evt.id} className="flex items-start gap-2 text-sm">
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <span className="text-muted-foreground text-xs">{new Date(evt.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          <p>{evt.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {selectedBooking.fulfillment && selectedBooking.fulfillment.notes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Internal Notes</h4>
                    <div className="space-y-1">
                      {selectedBooking.fulfillment.notes.map((note) => (
                        <div key={note.id} className="rounded-md bg-muted/50 p-2 text-sm">
                          <p>{note.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">{note.author} — {new Date(note.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Note */}
                <div>
                  <Label className="text-xs">Add Internal Note</Label>
                  <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note about this booking..." className="mt-1 text-sm" rows={2} />
                  <Button size="sm" variant="outline" className="mt-2" disabled={actionLoading || !noteText} onClick={() => { doAction('add_note', { text: noteText }); setNoteText(''); }}>
                    Add Note
                  </Button>
                </div>

                {/* Action Buttons */}
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {selectedBooking.fulfillment?.status === 'PENDING' && (
                    <Button size="sm" disabled={actionLoading} onClick={() => doAction('start_processing')}>
                      Start Processing
                    </Button>
                  )}
                  {selectedBooking.type === 'flight' && (
                    <Button size="sm" disabled={actionLoading} onClick={() => doAction('mark_ticketed', { supplierName, supplierReference: supplierRef, pnr, ticketNumber })}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Ticketed
                    </Button>
                  )}
                  {selectedBooking.type === 'hotel' && (
                    <Button size="sm" disabled={actionLoading} onClick={() => doAction('mark_voucher_issued', { supplierName, supplierReference: supplierRef, hotelConfirmationNumber: hotelConf })}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Voucher Issued
                    </Button>
                  )}
                  <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => doAction('send_to_customer')}>
                    Send to Customer
                  </Button>
                  <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => doAction('request_customer_action', { message: 'Additional information required from customer' })}>
                    Request Customer Action
                  </Button>
                  <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => doAction('cancel', { reason: 'Cancelled by agency' })}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => void requestRefund()}>
                    <DollarSign className="h-4 w-4 mr-1" /> Refund
                  </Button>
                </div>

                {actionResult && (
                  <div className={cn('rounded-md p-2 text-sm', actionResult.includes('failed') ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-700')}>
                    {actionResult}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
