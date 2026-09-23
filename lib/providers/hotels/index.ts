import type { IHotelProvider } from './hotel-provider';
import { MockHotelProvider } from './mock-hotel-provider';

let hotelProvider: IHotelProvider | null = null;

export function getHotelProvider(): IHotelProvider {
  if (!hotelProvider) {
    const providerName = process.env.HOTEL_PROVIDER || 'mock';

    switch (providerName.toLowerCase()) {
      case 'mock':
      default:
        hotelProvider = new MockHotelProvider();
        break;
    }
  }
  return hotelProvider;
}

export function resetHotelProvider() {
  hotelProvider = null;
}
