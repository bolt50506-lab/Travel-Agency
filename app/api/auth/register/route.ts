import { NextRequest } from 'next/server';
import { registerSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';

const existingEmails = [
  'john.smith@example.com',
  'agent@travelportal.com',
  'admin@travelportal.com',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(registerSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    if (existingEmails.includes(validation.data.email)) {
      return errorResponse('An account with this email already exists', 'AUTH_EMAIL_EXISTS', 409);
    }

    const newUser = {
      id: `user-${Date.now()}`,
      email: validation.data.email,
      role: 'customer' as const,
      firstName: validation.data.firstName,
      lastName: validation.data.lastName,
      phone: validation.data.phone,
      createdAt: new Date().toISOString(),
    };

    return successResponse({
      user: newUser,
      token: `mock-token-${newUser.id}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, 201);
  } catch (err) {
    console.error('Register error:', err);
    return errorResponse('Something went wrong during registration', 'INTERNAL_ERROR', 500);
  }
}
