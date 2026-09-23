import { InfoPage } from '@/components/shared/info-page';

export default function Page() {
  return <InfoPage title="Contact Destino Travels" intro="Need help with a booking, payment, cancellation or travel document?" sections={[{"heading":"Customer support","body":"Use the Help Center for booking support. Keep your booking reference ready so the agency can locate the correct record."},{"heading":"Payment support","body":"For manual Pakistani payment methods, retain your payment reference and proof until the agency confirms receipt."}]} />;
}
