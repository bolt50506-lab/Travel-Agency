import { InfoPage } from '@/components/shared/info-page';

export default function Page() {
  return <InfoPage title="Refund policy" intro="Refunds are handled through the agency after a cancellation or supplier decision." sections={[{"heading":"Processing","body":"The agency records the refund amount and status and finalizes it after the applicable refund has actually been processed."},{"heading":"Records","body":"Keep your booking and payment references until the refund is confirmed."}]} />;
}
