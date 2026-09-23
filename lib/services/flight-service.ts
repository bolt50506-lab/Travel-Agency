import { getFlightProvider } from '@/lib/providers/flights';
import type {
  FlightSearchQuery,
  FlightSearchResponse,
  RevalidateRequest,
  RevalidateResponse,
  FlightBookingRequest,
  FlightBookingResult,
} from '@/types/flight';

export class FlightService {
  async searchFlights(query: FlightSearchQuery): Promise<FlightSearchResponse> {
    const provider = getFlightProvider();
    return provider.search(query);
  }

  async revalidateOffer(request: RevalidateRequest): Promise<RevalidateResponse> {
    const provider = getFlightProvider();
    return provider.revalidate(request);
  }

  async bookFlight(request: FlightBookingRequest): Promise<FlightBookingResult> {
    const provider = getFlightProvider();
    return provider.book(request);
  }
}

export const flightService = new FlightService();
