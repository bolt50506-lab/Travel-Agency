import type { IFlightProvider } from './flight-provider';
import { MockFlightProvider } from './mock-flight-provider';

let flightProvider: IFlightProvider | null = null;

export function getFlightProvider(): IFlightProvider {
  if (!flightProvider) {
    const providerName = process.env.FLIGHT_PROVIDER || 'mock';

    switch (providerName.toLowerCase()) {
      case 'mock':
      default:
        flightProvider = new MockFlightProvider();
        break;
    }
  }
  return flightProvider;
}

export function resetFlightProvider() {
  flightProvider = null;
}
