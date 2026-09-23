import { InfoPage } from '@/components/shared/info-page';

export default function Page() {
  return <InfoPage title="Cancellation policy" intro="Cancellation depends on the booking stage, supplier rules and whether payment has already been verified." sections={[{"heading":"Before payment","body":"Unpaid booking requests can normally be cancelled through the booking workflow, subject to the current booking status."},{"heading":"After payment","body":"A paid customer cancellation is recorded as a refund request for agency review. Supplier penalties or non-refundable terms may affect the final refund."}]} />;
}
