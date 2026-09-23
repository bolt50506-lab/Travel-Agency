'use client';

import { Phone, Mail, MessageSquare, ChevronDown } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';

const faqs = [
  {
    q: 'How do I search for flights?',
    a: 'Navigate to the Flights tab on the home page, enter your departure and arrival cities, select your dates and passenger count, then click Search Flights. You will see a list of available flights that you can filter and sort.',
  },
  {
    q: 'Can I book a round trip?',
    a: 'Yes. Select "Round Trip" in the search form, enter your departure and return dates, then search. You will see flights for both legs of your journey.',
  },
  {
    q: 'How do I book a hotel?',
    a: 'Switch to the Hotels tab on the home page, enter your destination, check-in and check-out dates, number of guests and rooms, then click Search Hotels. Browse the results, select a room, and proceed through checkout.',
  },
  {
    q: 'What happens if the fare changes after I select a flight?',
    a: 'Before payment, we revalidate the fare with the provider. If the price has changed, you will see the old and new prices and can choose to accept the new fare or search again.',
  },
  {
    q: 'How do I cancel a booking?',
    a: 'Go to My Bookings, find the booking you want to cancel, click View Details, and use the Cancel Booking button. Refund eligibility depends on the fare type and cancellation policy.',
  },
  {
    q: 'Is my payment information secure?',
    a: 'Yes. All payments are processed through a secure payment gateway. Your card details are encrypted and never stored on our servers.',
  },
  {
    q: 'What is a PNR?',
    a: 'PNR stands for Passenger Name Record. It is a unique 6-character code assigned to your flight booking by the airline. You can use it to check in online or at the airport.',
  },
  {
    q: 'Do I need an account to book?',
    a: 'You can search without an account, but you need to create an account to complete a booking and manage your reservations.',
  },
];

export default function HelpPage() {
  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold mb-1">Help Center</h1>
      <p className="text-sm text-muted-foreground mb-8">Find answers to common questions and ways to contact us.</p>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card className="p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <h3 className="mt-3 text-sm font-semibold">Phone Support</h3>
          <p className="text-xs text-muted-foreground mt-1">Available 24/7</p>
          <p className="text-sm font-medium mt-2">+1 (800) 555-0199</p>
        </Card>
        <Card className="p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <h3 className="mt-3 text-sm font-semibold">Email Support</h3>
          <p className="text-xs text-muted-foreground mt-1">Response within 24h</p>
          <p className="text-sm font-medium mt-2">support@voyago.com</p>
        </Card>
        <Card className="p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <h3 className="mt-3 text-sm font-semibold">Live Chat</h3>
          <p className="text-xs text-muted-foreground mt-1">Mon-Fri, 9am-6pm</p>
          <p className="text-sm font-medium mt-2">Start a conversation</p>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
      <Accordion type="single" collapsible className="space-y-2">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="rounded-lg border border-border px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
