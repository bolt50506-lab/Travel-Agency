import type { IFlightProvider } from './flight-provider';
import { DuffelFlightProvider } from './duffel-flight-provider';
import { LetsFGFlightProvider } from './letsfg-flight-provider';
import { MockFlightProvider } from './mock-flight-provider';
import type { FlightSearchQuery, FlightSearchResponse, FlightOffer, RevalidateRequest, RevalidateResponse, FlightBookingRequest, FlightBookingResult } from '@/types/flight';

type ProviderEntry = { key: string; provider: IFlightProvider };

function entries(): ProviderEntry[] {
  const names = (process.env.FLIGHT_PROVIDERS || process.env.FLIGHT_PROVIDER || 'duffel')
    .split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
  return names.map((key) => {
    switch (key) {
      case 'duffel': return { key, provider: new DuffelFlightProvider() };
      case 'letsfg': return { key, provider: new LetsFGFlightProvider() };
      case 'mock':
        if (process.env.ALLOW_MOCK_PROVIDERS !== 'true') throw new Error('Mock flight provider is disabled.');
        return { key, provider: new MockFlightProvider() };
      default: throw new Error(`Unsupported flight provider: ${key}`);
    }
  });
}

function wrapId(provider: string, id: string) { return `${provider}::${id}`; }
function unwrapId(value: string) {
  const index = value.indexOf('::');
  return index > 0 ? { provider: value.slice(0, index), id: value.slice(index + 2) } : { provider: '', id: value };
}
function prefixOffer(offer: FlightOffer, provider: string): FlightOffer {
  return { ...offer, id: wrapId(provider, offer.id), provider: offer.provider || provider };
}
function prefixResponse(result: FlightSearchResponse, provider: string): FlightSearchResponse {
  return { ...result, searchId: wrapId(provider, result.searchId), offers: result.offers.map((offer) => prefixOffer(offer, provider)) };
}

export class MultiFlightProvider implements IFlightProvider {
  readonly name = 'Multi-provider';
  readonly isMock = false;

  async search(query: FlightSearchQuery): Promise<FlightSearchResponse> {
    const configured = entries();
    const results = await Promise.allSettled(configured.map((entry) => entry.provider.search(query)));
    const offers: FlightOffer[] = [];
    const searchIds: string[] = [];
    const expiryTimes: number[] = [];

    results.forEach((result, index) => {
      const entry = configured[index];
      if (result.status === 'fulfilled') {
        const normalized = prefixResponse(result.value, entry.key);
        offers.push(...normalized.offers);
        searchIds.push(normalized.searchId);
        expiryTimes.push(new Date(normalized.expiresAt).getTime());
      } else {
        console.error(`Flight provider ${entry.key} search failed:`, result.reason);
      }
    });

    if (!offers.length) throw new Error('ALL_FLIGHT_PROVIDERS_FAILED');
    offers.sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);
    const finiteExpiry = expiryTimes.filter(Number.isFinite);
    return {
      offers,
      searchId: searchIds.join('|'),
      expiresAt: new Date(finiteExpiry.length ? Math.min(...finiteExpiry) : Date.now() + 15 * 60000).toISOString(),
    };
  }

  private getProvider(providerKey: string) {
    const entry = entries().find((item) => item.key === providerKey);
    if (!entry) throw new Error(`Flight provider is not configured: ${providerKey}`);
    return entry.provider;
  }

  private providerSearchId(searchId: string, providerKey: string) {
    const match = searchId.split('|').find((part) => part.startsWith(`${providerKey}::`));
    return match ? unwrapId(match).id : unwrapId(searchId).id;
  }

  async revalidate(request: RevalidateRequest): Promise<RevalidateResponse> {
    const offer = unwrapId(request.offerId);
    const search = unwrapId(request.searchId);
    const providerKey = offer.provider || search.provider;
    return this.getProvider(providerKey).revalidate({
      offerId: offer.id,
      searchId: this.providerSearchId(request.searchId, providerKey),
    });
  }

  async book(request: FlightBookingRequest): Promise<FlightBookingResult> {
    const offer = unwrapId(request.offerId);
    const search = unwrapId(request.searchId);
    const providerKey = offer.provider || search.provider;
    return this.getProvider(providerKey).book({
      ...request,
      offerId: offer.id,
      searchId: this.providerSearchId(request.searchId, providerKey),
    });
  }
}
