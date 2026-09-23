import { InfoPage } from '@/components/shared/info-page';

export default function Page() {
  return <InfoPage title="Terms of service" intro="Use of Destino Travels services is subject to booking, payment and supplier conditions." sections={[{"heading":"Bookings","body":"A booking request is not the same as supplier confirmation. The agency may need to verify payment and complete supplier fulfillment before issuing tickets or vouchers."},{"heading":"Customer information","body":"Customers are responsible for providing accurate passenger and guest information, including travel-document details."}]} />;
}
