import { Phone, Mail, MessageSquare } from 'lucide-react';

export function CustomerSupport() {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Phone className="h-5 w-5 text-primary" />
        </div>
        <h3 className="mt-3 text-sm font-semibold">Call Us</h3>
        <p className="text-xs text-muted-foreground mt-1">Available 24/7</p>
        <p className="text-sm font-medium mt-2">+1 (800) 555-0199</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <h3 className="mt-3 text-sm font-semibold">Email Support</h3>
        <p className="text-xs text-muted-foreground mt-1">Response within 24h</p>
        <p className="text-sm font-medium mt-2">support@voyago.com</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <h3 className="mt-3 text-sm font-semibold">Live Chat</h3>
        <p className="text-xs text-muted-foreground mt-1">Chat with an agent</p>
        <p className="text-sm font-medium mt-2">Start a conversation</p>
      </div>
    </section>
  );
}
