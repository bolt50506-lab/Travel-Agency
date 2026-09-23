import type {
  FlightSearchQuery,
  FlightSearchResponse,
  RevalidateRequest,
  RevalidateResponse,
  FlightBookingRequest,
  FlightBookingResult,
} from '@/types/flight';

export interface IFlightProvider {
  readonly name: string;
  readonly isMock: boolean;

  search(query: FlightSearchQuery): Promise<FlightSearchResponse>;
  revalidate(request: RevalidateRequest): Promise<RevalidateResponse>;
  book(request: FlightBookingRequest): Promise<FlightBookingResult>;
}
