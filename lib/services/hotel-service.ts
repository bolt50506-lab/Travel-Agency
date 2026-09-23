import { getHotelProvider } from '@/lib/providers/hotels';
import type {
  HotelSearchQuery,
  HotelSearchResponse,
  HotelRevalidateRequest,
  HotelRevalidateResponse,
  HotelBookingRequest,
  HotelBookingResult,
} from '@/types/hotel';

export class HotelService {
  async searchHotels(query: HotelSearchQuery): Promise<HotelSearchResponse> {
    const provider = getHotelProvider();
    return provider.search(query);
  }

  async revalidateRoom(request: HotelRevalidateRequest): Promise<HotelRevalidateResponse> {
    const provider = getHotelProvider();
    return provider.revalidate(request);
  }

  async bookHotel(request: HotelBookingRequest): Promise<HotelBookingResult> {
    const provider = getHotelProvider();
    return provider.book(request);
  }
}

export const hotelService = new HotelService();
