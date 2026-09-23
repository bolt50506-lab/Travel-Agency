'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2, BedDouble, CreditCard, ShieldCheck, Star, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/lib/utils/api';
import type { HotelOffer, HotelRoom, HotelGuest } from '@/types/hotel';
import { cn } from '@/lib/utils';

type CheckoutStep = 'rooms' | 'guests' | 'revalidation' | 'payment' | 'confirmation';

export default function HotelCheckoutPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<CheckoutStep>('rooms');
  const [hotel, setHotel] = useState<HotelOffer | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');
  const [revalidation, setRevalidation] = useState<{ priceChanged: boolean; oldPrice?: number; newPrice?: number; valid: boolean } | null>(null);
  const [guests, setGuests] = useState<HotelGuest[]>([]);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [bookingResult, setBookingResult] = useState<{ reference: string; status: string } | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'raast' | 'jazzcash' | 'easypaisa' | 'bank_transfer'>('raast');
  const [paymentReference, setPaymentReference] = useState('');

  const hotelId = searchParams.get('hotelId') || '';
  const destination = searchParams.get('destination') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const numGuests = parseInt(searchParams.get('guests') || '2');
  const numRooms = parseInt(searchParams.get('rooms') || '1');

  const nights = useMemo(() => Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)), [checkIn, checkOut]);

  useEffect(() => {
    if (!hotelId) {
      setError('No hotel selected. Please search and select a hotel first.');
      setLoading(false);
      return;
    }

    fetch('/api/hotels/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, checkIn, checkOut, guests: numGuests, rooms: numRooms }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load hotel details');
        return res.json();
      })
      .then((data) => {
        const found = (data.offers as HotelOffer[]).find((h) => h.id === hotelId);
        if (!found) {
          setError('Selected hotel is no longer available. Please search again.');
        } else {
          setHotel(found);
          setSearchId(data.searchId);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [hotelId, destination, checkIn, checkOut, numGuests, numRooms]);

  const handleSelectRoom = (room: HotelRoom) => {
    setSelectedRoom(room);
    const guestList: HotelGuest[] = [];
    for (let i = 0; i < numGuests; i++) {
      guestList.push({ firstName: '', lastName: '' });
    }
    setGuests(guestList);
    setStep('guests');
  };

  const updateGuest = (index: number, field: keyof HotelGuest, value: string) => {
    setGuests((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleProceedToRevalidation = () => {
    const missing = guests.some((g) => !g.firstName || !g.lastName);
    if (missing || !contactEmail || !contactPhone) {
      setError('Please fill in all guest and contact details.');
      return;
    }
    setError(null);
    setStep('revalidation');
    doRevalidation();
  };

  const doRevalidation = async () => {
    try {
      const res = await fetch('/api/hotels/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, roomId: selectedRoom!.id, searchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revalidation failed');
      setRevalidation(data);
      if (data.priceChanged && data.newPrice && selectedRoom) {
        setSelectedRoom({ ...selectedRoom, totalPrice: { amount: data.newPrice.amount, currency: data.newPrice.currency } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revalidation failed');
    }
  };

  const handleConfirmPrice = () => setStep('payment');

  const handlePayment = async () => {
    setPaymentProcessing(true);
    setError(null);
    try {
      const bookRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'hotel',
          totalAmount: selectedRoom!.totalPrice,
          contactEmail,
          contactPhone,
          hotelDetails: { ...hotel!, room: selectedRoom!, guests },
        }),
      });
      const bookData = await bookRes.json();
      if (!bookRes.ok) throw new Error(bookData.error || 'Booking request failed');

      const paymentRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: bookData.reference,
          amount: selectedRoom!.totalPrice,
          method: paymentMethod,
          paymentReference,
        }),
      });
      const paymentData = await paymentRes.json();
      if (!paymentRes.ok) throw new Error(paymentData.error || 'Payment submission failed');

      setBookingResult({ reference: bookData.reference, status: paymentData.status || bookData.status });
      setStep('confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong during booking');
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container-page py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !hotel) {
    return (
      <div className="container-page py-12">
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 flex items-start gap-3 max-w-lg mx-auto">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = '/'}>
              Back to Search
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-6 max-w-4xl">
      <div className="mb-6 flex items-center gap-2">
        {(['rooms', 'guests', 'revalidation', 'payment', 'confirmation'] as CheckoutStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
              step === s ? 'bg-primary text-primary-foreground' :
              (['rooms', 'guests', 'revalidation', 'payment', 'confirmation'].indexOf(step) > i) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              {i + 1}
            </div>
            <span className={cn('text-sm hidden sm:block capitalize', step === s ? 'font-medium' : 'text-muted-foreground')}>
              {s === 'revalidation' ? 'Rate Check' : s}
            </span>
            {i < 4 && <div className="h-px w-6 sm:w-10 bg-border" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/5 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div>
          {/* Step: Rooms */}
          {step === 'rooms' && hotel && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="relative h-24 w-32 shrink-0 rounded-lg overflow-hidden">
                  <Image src={hotel.images[0]} alt={hotel.name} fill className="object-cover" sizes="128px" />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: hotel.starRating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                    ))}
                  </div>
                  <h2 className="text-xl font-bold">{hotel.name}</h2>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {hotel.city}, {hotel.country}
                  </p>
                </div>
              </div>

              <h3 className="text-lg font-semibold mt-4">Select a Room</h3>

              {hotel.rooms.map((room) => (
                <Card key={room.id} className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold">{room.type}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{room.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {room.amenities.slice(0, 4).map((a) => (
                          <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{room.bedType}</span>
                        <span>·</span>
                        <span>Max {room.maxOccupancy} guests</span>
                        {room.size && (<><span>·</span><span>{room.size}</span></>)}
                        <span>·</span>
                        <span className={room.refundable ? 'text-green-600' : 'text-amber-600'}>{room.cancellationPolicy}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{formatPrice(room.pricePerNight.amount)} / night</p>
                        <p className="text-lg font-bold">{formatPrice(room.totalPrice.amount, room.totalPrice.currency)}</p>
                        <p className="text-xs text-muted-foreground">{nights} nights, incl. taxes</p>
                      </div>
                      <Button size="sm" onClick={() => handleSelectRoom(room)} disabled={room.roomsAvailable === 0}>
                        {room.roomsAvailable === 0 ? 'Sold Out' : 'Select'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Step: Guests */}
          {step === 'guests' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Guest Information</h2>
              <p className="text-sm text-muted-foreground">Enter the names of all guests staying at the hotel.</p>

              {guests.map((g, i) => (
                <Card key={i} className="p-4">
                  <p className="text-sm font-medium mb-3">Guest {i + 1}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`gfn-${i}`}>First Name</Label>
                      <Input id={`gfn-${i}`} value={g.firstName} onChange={(e) => updateGuest(i, 'firstName', e.target.value)} placeholder="John" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`gln-${i}`}>Last Name</Label>
                      <Input id={`gln-${i}`} value={g.lastName} onChange={(e) => updateGuest(i, 'lastName', e.target.value)} placeholder="Smith" />
                    </div>
                  </div>
                </Card>
              ))}

              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="hemail">Email</Label>
                    <Input id="hemail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="john@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hphone">Phone</Label>
                    <Input id="hphone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 555 000 0000" />
                  </div>
                </div>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('rooms')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button size="lg" className="flex-1" onClick={handleProceedToRevalidation}>
                  Continue to Rate Check
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step: Revalidation */}
          {step === 'revalidation' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Rate Revalidation</h2>
              <p className="text-sm text-muted-foreground">We are checking the current rate and availability of your selected room.</p>

              {!revalidation && (
                <Card className="p-8 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Checking rate...</p>
                  </div>
                </Card>
              )}

              {revalidation && !revalidation.valid && (
                <Card className="p-6 border-destructive/50">
                  <AlertCircle className="h-8 w-8 text-destructive mb-3" />
                  <h3 className="text-lg font-semibold text-destructive">Room No Longer Available</h3>
                  <p className="text-sm text-muted-foreground mt-1">This room is no longer available. Please select a different room.</p>
                  <Button variant="outline" className="mt-4" onClick={() => { setStep('rooms'); setRevalidation(null); }}>
                    Back to Rooms
                  </Button>
                </Card>
              )}

              {revalidation && revalidation.valid && !revalidation.priceChanged && (
                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="text-lg font-semibold">Rate Confirmed</h3>
                      <p className="text-sm text-muted-foreground">The rate and availability have been confirmed. You can proceed to payment.</p>
                    </div>
                  </div>
                  <Button size="lg" className="w-full mt-4" onClick={handleConfirmPrice}>
                    Proceed to Payment
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Card>
              )}

              {revalidation && revalidation.valid && revalidation.priceChanged && (
                <Card className="p-6 border-amber-400/50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-8 w-8 text-amber-500 shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-amber-700">Rate Updated</h3>
                      <p className="text-sm text-muted-foreground mt-1">The rate for this room has changed since your search.</p>
                      <div className="mt-4 flex items-center gap-4">
                        {revalidation.oldPrice && (
                          <div>
                            <p className="text-xs text-muted-foreground">Previous Rate</p>
                            <p className="text-lg font-bold line-through text-muted-foreground">{formatPrice(revalidation.oldPrice)}</p>
                          </div>
                        )}
                        {revalidation.newPrice && (
                          <div>
                            <p className="text-xs text-muted-foreground">New Rate</p>
                            <p className="text-lg font-bold text-primary">{formatPrice(revalidation.newPrice)}</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button onClick={handleConfirmPrice}>Accept & Continue</Button>
                        <Button variant="outline" onClick={() => { setStep('rooms'); setRevalidation(null); }}>
                          Back to Rooms
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Step: Payment */}
          {step === 'payment' && selectedRoom && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Payment</h2>
              <p className="text-sm text-muted-foreground">Enter your payment details to complete the reservation.</p>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold">Pakistan Payment Method</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="hotelPaymentMethod">Choose payment method</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                      <SelectTrigger id="hotelPaymentMethod"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raast">Raast</SelectItem>
                        <SelectItem value="jazzcash">JazzCash</SelectItem>
                        <SelectItem value="easypaisa">Easypaisa</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="hotelPaymentReference">Payment reference</Label>
                    <Input id="hotelPaymentReference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Enter transaction/reference number after payment" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Payment is recorded in PKR and verified by the travel agency before ticketing or voucher issuance.</p>
              </Card>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                Your payment is secured with industry-standard encryption.
              </div>

              <Button size="lg" className="w-full" onClick={handlePayment} disabled={paymentProcessing}>
                {paymentProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>Pay {formatPrice(selectedRoom.totalPrice.amount, selectedRoom.totalPrice.currency)}</>
                )}
              </Button>
            </div>
          )}

          {/* Step: Confirmation */}
          {step === 'confirmation' && bookingResult && selectedRoom && hotel && (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                  <div>
                    <h2 className="text-xl font-bold">Booking Received</h2>
                    <p className="text-sm text-muted-foreground">Your booking request has been submitted and payment received.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Agency Booking Reference</p>
                    <p className="text-lg font-bold">{bookingResult.reference}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className="mt-1">PAYMENT_RECEIVED</Badge>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Hotel</p>
                    <p className="text-sm font-medium">{hotel.name}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Room Type</p>
                    <p className="text-sm font-medium">{selectedRoom.type}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Check-in</p>
                    <p className="text-sm font-medium">{new Date(checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Check-out</p>
                    <p className="text-sm font-medium">{new Date(checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Amount Paid</p>
                    <p className="text-lg font-bold">{formatPrice(selectedRoom.totalPrice.amount, selectedRoom.totalPrice.currency)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Next Step</p>
                    <p className="text-sm font-medium mt-1">Our travel team is processing your reservation</p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">
                    Your booking has been received by our travel team. We are now processing your request
                    through our authorized hotel suppliers. Once your voucher is issued, you will be able to download
                    it from the My Bookings page. This typically takes a few hours during business hours.
                  </p>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  A confirmation email has been sent to {contactEmail}.
                </p>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.href = '/bookings'}>
                  View My Bookings
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                  Back to Home
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        {hotel && selectedRoom && (
          <div className="md:sticky md:top-20 h-fit">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Booking Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{hotel.name}</span>
                </div>
                <div className="text-muted-foreground">
                  <p>{selectedRoom.type}</p>
                  <p>{new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  <p>{nights} night{nights > 1 ? 's' : ''}, {numGuests} guest{numGuests > 1 ? 's' : ''}</p>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{formatPrice(selectedRoom.pricePerNight.amount)} x {nights} nights</span>
                  <span>{formatPrice(selectedRoom.pricePerNight.amount * nights)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxes & Fees</span>
                  <span>{formatPrice(selectedRoom.taxesAndFees.amount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(selectedRoom.totalPrice.amount, selectedRoom.totalPrice.currency)}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
