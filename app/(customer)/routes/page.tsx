import { InfoPage } from '@/components/shared/info-page';

export default function Page() {
  return <InfoPage title="Popular routes" intro="Explore flight and hotel search from the main Destino Travels booking experience." sections={[{"heading":"Search","body":"Use the Flights and Hotels sections to search current available inventory from the configured supplier provider."},{"heading":"Pricing","body":"Displayed prices use the agency pricing engine and PKR is the current supported transaction currency."}]} />;
}
