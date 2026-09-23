export type Currency = 'PKR';

export interface Money {
  amount: number;
  currency: Currency;
}

export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ProviderType = 'flight' | 'hotel' | 'payment' | 'notification';

export interface ProviderInfo {
  name: string;
  type: ProviderType;
  isMock: boolean;
}
