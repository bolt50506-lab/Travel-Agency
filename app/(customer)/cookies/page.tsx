import { InfoPage } from '@/components/shared/info-page';

export default function Page() {
  return <InfoPage title="Cookie policy" intro="The portal may use browser storage or cookies needed for authentication and normal site operation." sections={[{"heading":"Authentication","body":"Secure session cookies are used for signed-in customer, agent and admin portals."},{"heading":"Essential operation","body":"Essential technical state may be stored to keep searches and booking workflows working correctly."}]} />;
}
