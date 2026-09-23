import { NextRequest } from 'next/server';
import { loginSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';

const mockUsers = [
  { id: 'user-1', email: 'john.smith@example.com', password: 'password123', role: 'customer', firstName: 'John', lastName: 'Smith', phone: '+1-555-0100', createdAt: '2025-09-01T10:00:00Z' },
  { id: 'agent-1', email: 'agent@travelportal.com', password: 'agent123', role: 'agent', firstName: 'Lisa', lastName: 'Anderson', phone: '+1-555-0200', createdAt: '2025-08-15T08:00:00Z' },
  { id: 'admin-1', email: 'admin@travelportal.com', password: 'admin123', role: 'admin', firstName: 'Admin', lastName: 'User', phone: '+1-555-0300', createdAt: '2025-08-01T08:00:00Z' },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(loginSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const user = mockUsers.find((u) => u.email === validation.data.email);

    if (!user || user.password !== validation.data.password) {
      return errorResponse('Invalid email or password', 'AUTH_INVALID_CREDENTIALS', 401);
    }

    const { password, ...userWithoutPassword } = user;
    return successResponse({
      user: userWithoutPassword,
      token: `mock-token-${user.id}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    console.error('Login error:', err);
    return errorResponse('Something went wrong during login', 'INTERNAL_ERROR', 500);
  }
}
