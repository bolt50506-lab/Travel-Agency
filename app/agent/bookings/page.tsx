import { Card } from '@/components/ui/card';

export default function AgentBookingsPage() {
  return <div className="mx-auto max-w-6xl space-y-6"><div><p className="text-sm font-medium text-primary">Agent portal</p><h1 className="text-2xl font-bold">Bookings</h1><p className="mt-1 text-sm text-muted-foreground">This module is reserved for agent booking workflows and will use the shared travel booking components.</p></div><Card className="p-6"><p className="font-medium">Booking workspace ready</p><p className="mt-1 text-sm text-muted-foreground">The agent route is isolated from employee administration and protected server-side.</p></Card></div>;
}
