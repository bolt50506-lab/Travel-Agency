'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2, Plane, CreditCard, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/lib/utils/api';
import type { FlightOffer, FlightPassenger, PassengerType } from '@/types/flight';
import { cn } from '@/lib/utils';

type CheckoutStep = 'passengers' | 'revalidation' | 'payment' | 'confirmation';

export default function FlightCheckoutPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<CheckoutStep>('passengers');
  const [offer, setOffer] = useState<FlightOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');
  const [revalidation, setRevalidation] = useState<{ priceChanged: boolean; oldPrice?: number; newPrice?: number; valid: boolean } | null>(null);
  const [passengers, setPassengers] = useState<FlightPassenger[]>([]);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [bookingResult, setBookingResult] = useState<{ reference: string; status: string } | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'raast' | 'jazzcash' | 'easypaisa' | 'bank_transfer'>('raast');
  const [paymentReference, setPaymentReference] = useState('');

  const offerId = searchParams.get('offerId') || '';
  const origin = searchParams.get('origin') || '';
  const destination = searchParams.get('destination') || '';
  const departDate = searchParams.get('departDate') || '';
  const adults = parseInt(searchParams.get('adults') || '1');
  const children = parseInt(searchParams.get('children') || '0');
  const infants = parseInt(searchParams.get('infants') || '0');
  const cabinClass = searchParams.get('cabinClass') || 'economy';

  const totalPassengers = adults + children + infants;

  useEffect(() => {
    if (!offerId) {
      setError('No flight selected. Please search and select a flight first.');
      setLoading(false);
      return;
    }

    const sid = searchParams.get('searchId') || '';
    setSearchId(sid);

    // Do not perform a new flight search here. Duffel offer IDs are tied to
    // the original offer and a fresh offer request produces different IDs.
    // Load the selected offer directly from Duffel through revalidation.
    fetch('/api/flights/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId, searchId: sid }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load selected flight');

        if (!data.valid || !data.offer) {
          throw new Error('Selected flight is no longer available. Please search again.');
        }

        setOffer(data.offer as FlightOffer);
        initPassengers();
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load selected flight');
        setLoading(false);
      });
  }, [offerId]);



  const initPassengers = () => {
    const psngs: FlightPassenger[] = [];
    for (let i = 0; i < adults; i++) {
      psngs.push({ type: 'adult', firstName: '', lastName: '', dateOfBirth: '', gender: undefined });
    }
    for (let i = 0; i < children; i++) {
      psngs.push({ type: 'child', firstName: '', lastName: '', dateOfBirth: '', gender: undefined });
    }
    for (let i = 0; i < infants; i++) {
      psngs.push({ type: 'infant', firstName: '', lastName: '', dateOfBirth: '', gender: undefined });
    }
    setPassengers(psngs);
  };

  const updatePassenger = (index: number, field: keyof FlightPassenger, value: string) => {
    setPassengers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleProceedToRevalidation = () => {
    const missing = passengers.some((p) => !p.firstName || !p.lastName || !p.dateOfBirth);
    if (missing || !contactEmail || !contactPhone) {
      setError('Please fill in all passenger and contact details.');
      return;
    }
    setError(null);
    setStep('revalidation');
    doRevalidation();
  };

  const doRevalidation = async () => {
    try {
      const res = await fetch('/api/flights/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, searchId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Revalidation failed');

      setRevalidation(data);

      if (data.priceChanged && data.newPrice && offer) {
        setOffer({ ...offer, totalPrice: { amount: data.newPrice.amount, currency: data.newPrice.currency }, pricingToken: data.pricingToken });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revalidation failed');
    }
  };

  const handleConfirmPrice = () => {
    setStep('payment');
  };

  const handlePayment = async () => {
    setPaymentProcessing(true);
    setError(null);
    try {
      const bookRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'flight',
          totalAmount: offer!.totalPrice,
          contactEmail,
          contactPhone,
          flightDetails: { ...offer!, passengers },
        }),
      });
      const bookData = await bookRes.json();
      if (!bookRes.ok) throw new Error(bookData.error || 'Booking request failed');

      const paymentRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: bookData.reference,
          amount: offer!.totalPrice,
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

  if (error && step === 'passengers' && !offer) {
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
      {/* Stepper */}
      <div className="mb-6 flex items-center gap-2">
        {(['passengers', 'revalidation', 'payment', 'confirmation'] as CheckoutStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
              step === s ? 'bg-primary text-primary-foreground' :
              (['passengers', 'revalidation', 'payment', 'confirmation'].indexOf(step) > i) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              {i + 1}
            </div>
            <span className={cn('text-sm hidden sm:block', step === s ? 'font-medium' : 'text-muted-foreground')}>
              {s === 'passengers' ? 'Passengers' : s === 'revalidation' ? 'Fare Check' : s === 'payment' ? 'Payment' : 'Confirmation'}
            </span>
            {i < 3 && <div className="h-px w-6 sm:w-12 bg-border" />}
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
          {/* Step: Passengers */}
          {step === 'passengers' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Passenger Information</h2>
              <p className="text-sm text-muted-foreground">Enter details exactly as they appear on your travel documents.</p>

              {passengers.map((p, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="capitalize">{p.type}</Badge>
                    <span className="text-sm font-medium">Passenger {i + 1}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`fn-${i}`}>First Name</Label>
                      <Input id={`fn-${i}`} value={p.firstName} onChange={(e) => updatePassenger(i, 'firstName', e.target.value)} placeholder="John" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`ln-${i}`}>Last Name</Label>
                      <Input id={`ln-${i}`} value={p.lastName} onChange={(e) => updatePassenger(i, 'lastName', e.target.value)} placeholder="Smith" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`dob-${i}`}>Date of Birth</Label>
                      <Input id={`dob-${i}`} type="date" value={p.dateOfBirth} onChange={(e) => updatePassenger(i, 'dateOfBirth', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`gender-${i}`}>Gender</Label>
                      <Select value={p.gender || ''} onValueChange={(v) => updatePassenger(i, 'gender', v)}>
                        <SelectTrigger id={`gender-${i}`}>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}

              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="john@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 555 000 0000" />
                  </div>
                </div>
              </Card>

              <Button size="lg" className="w-full" onClick={handleProceedToRevalidation}>
                Continue to Fare Check
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step: Revalidation */}
          {step === 'revalidation' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Fare Revalidation</h2>
              <p className="text-sm text-muted-foreground">We are checking the current price and availability of your selected flight.</p>

              {!revalidation && (
                <Card className="p-8 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Checking fare...</p>
                  </div>
                </Card>
              )}

              {revalidation && !revalidation.valid && (
                <Card className="p-6 border-destructive/50">
                  <AlertCircle className="h-8 w-8 text-destructive mb-3" />
                  <h3 className="text-lg font-semibold text-destructive">Flight No Longer Available</h3>
                  <p className="text-sm text-muted-foreground mt-1">The seats on this flight are no longer available. Please select a different flight.</p>
                  <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/'}>
                    Search Again
                  </Button>
                </Card>
              )}

              {revalidation && revalidation.valid && !revalidation.priceChanged && (
                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="text-lg font-semibold">Fare Confirmed</h3>
                      <p className="text-sm text-muted-foreground">The price and availability have been confirmed. You can proceed to payment.</p>
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
                      <h3 className="text-lg font-semibold text-amber-700">Fare Updated</h3>
                      <p className="text-sm text-muted-foreground mt-1">The fare for this flight has changed since your search.</p>
                      <div className="mt-4 flex items-center gap-4">
                        {revalidation.oldPrice && (
                          <div>
                            <p className="text-xs text-muted-foreground">Previous Fare</p>
                            <p className="text-lg font-bold line-through text-muted-foreground">{formatPrice(revalidation.oldPrice)}</p>
                          </div>
                        )}
                        {revalidation.newPrice && (
                          <div>
                            <p className="text-xs text-muted-foreground">New Fare</p>
                            <p className="text-lg font-bold text-primary">{formatPrice(revalidation.newPrice)}</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button onClick={handleConfirmPrice}>Accept & Continue</Button>
                        <Button variant="outline" onClick={() => window.location.href = '/'}>
                          Search Again
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Step: Payment */}
          {step === 'payment' && offer && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Payment</h2>
              <p className="text-sm text-muted-foreground">Choose a payment method. Bank transfer is submitted for agency verification before ticketing.</p>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold">Pakistan Payment Method</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="flightPaymentMethod">Choose payment method</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                      <SelectTrigger id="flightPaymentMethod"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raast">Raast</SelectItem>
                        <SelectItem value="jazzcash">JazzCash</SelectItem>
                        <SelectItem value="easypaisa">Easypaisa</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="flightPaymentReference">Payment reference</Label>
                    <Input id="flightPaymentReference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Enter transaction/reference number after payment" />
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
                  <>
                    Pay {formatPrice(offer.totalPrice.amount, offer.totalPrice.currency)}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step: Confirmation */}
          {step === 'confirmation' && bookingResult && offer && (
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
                    <p className="text-xs text-muted-foreground">Amount Paid</p>
                    <p className="text-lg font-bold">{formatPrice(offer.totalPrice.amount, offer.totalPrice.currency)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Next Step</p>
                    <p className="text-sm font-medium mt-1">Our travel team is processing your booking</p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">
                    Your booking has been received by our travel team. We are now processing your request
                    through our authorized suppliers. Once your ticket is issued, you will be able to download
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
        {offer && (
          <div className="md:sticky md:top-20 h-fit">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Flight Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{origin} → {destination}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(departDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Fare ({totalPassengers} pax)</span>
                  <span>{formatPrice(offer.basePrice.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxes & Fees</span>
                  <span>{formatPrice(offer.taxesAndFees.amount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(offer.totalPrice.amount, offer.totalPrice.currency)}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
