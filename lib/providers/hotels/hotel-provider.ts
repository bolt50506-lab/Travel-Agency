import type {
  HotelSearchQuery,
  HotelSearchResponse,
  HotelRevalidateRequest,
  HotelRevalidateResponse,
  HotelBookingRequest,
  HotelBookingResult,
} from '@/types/hotel';

export interface IHotelProvider {
  readonly name: string;
  readonly isMock: boolean;

  search(query: HotelSearchQuery): Promise<HotelSearchResponse>;
  revalidate(request: HotelRevalidateRequest): Promise<HotelRevalidateResponse>;
  book(request: HotelBookingRequest): Promise<HotelBookingResult>;
}
