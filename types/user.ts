export type UserRole = 'customer' | 'agent' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface Profile {
  id: string;
  userId: string;
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  address?: {
    line1: string;
    city: string;
    country: string;
    postalCode: string;
  };
  preferences?: {
    preferredCurrency: string;
    preferredLanguage: string;
  };
}
