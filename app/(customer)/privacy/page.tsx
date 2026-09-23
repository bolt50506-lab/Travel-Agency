import { InfoPage } from '@/components/shared/info-page';

export default function Page() {
  return <InfoPage title="Privacy policy" intro="Destino Travels uses customer information to operate bookings, payments, fulfillment and support." sections={[{"heading":"Operational use","body":"Information may be used to create customer and traveler records, communicate booking updates, process payments and prepare travel documents."},{"heading":"Access","body":"Access to operational records is restricted by portal role and booking ownership."}]} />;
}
