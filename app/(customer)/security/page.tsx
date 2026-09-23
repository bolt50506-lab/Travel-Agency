import { InfoPage } from '@/components/shared/info-page';

export default function Page() {
  return <InfoPage title="Security" intro="Destino Travels separates public, agent and employee operations and applies server-side authorization." sections={[{"heading":"Portal separation","body":"Customer, agent and admin routes have separate access checks; administrative APIs require admin authorization."},{"heading":"Booking protection","body":"Customer and agent booking records are scoped server-side so a user cannot access another user's operational booking by changing a URL."}]} />;
}
