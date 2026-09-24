import type { IFlightProvider } from './flight-provider';
import { DuffelFlightProvider } from './duffel-flight-provider';
import { MockFlightProvider } from './mock-flight-provider';

let flightProvider: IFlightProvider | null = null;

export function getFlightProvider(): IFlightProvider {
  if (!flightProvider) {
    const providerName = (process.env.FLIGHT_PROVIDER || 'duffel').toLowerCase();

    switch (providerName) {
      case 'duffel':
        flightProvider = new DuffelFlightProvider();
        break;
      case 'mock':
        if (process.env.ALLOW_MOCK_PROVIDERS !== 'true') {
          throw new Error('Mock flight provider is disabled. Configure FLIGHT_PROVIDER=duffel.');
        }
        flightProvider = new MockFlightProvider();
        break;
      default:
        throw new Error(`Unsupported flight provider: ${providerName}`);
    }
  }

  return flightProvider;
}

export function resetFlightProvider() {
  flightProvider = null;
}
