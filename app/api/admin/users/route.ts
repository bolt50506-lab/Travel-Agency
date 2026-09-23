import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';

const mockUsers = [
  { id: 'user-1', email: 'john.smith@example.com', role: 'customer', firstName: 'John', lastName: 'Smith', createdAt: '2025-09-01T10:00:00Z' },
  { id: 'user-2', email: 'sarah.johnson@example.com', role: 'customer', firstName: 'Sarah', lastName: 'Johnson', createdAt: '2025-09-05T12:00:00Z' },
  { id: 'user-3', email: 'michael.brown@example.com', role: 'customer', firstName: 'Michael', lastName: 'Brown', createdAt: '2025-09-10T09:00:00Z' },
  { id: 'agent-1', email: 'agent@travelportal.com', role: 'agent', firstName: 'Lisa', lastName: 'Anderson', createdAt: '2025-08-15T08:00:00Z' },
  { id: 'admin-1', email: 'admin@travelportal.com', role: 'admin', firstName: 'Admin', lastName: 'User', createdAt: '2025-08-01T08:00:00Z' },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search')?.toLowerCase();

    let users = [...mockUsers];

    if (role) users = users.filter((u) => u.role === role);
    if (search) {
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          u.firstName.toLowerCase().includes(search) ||
          u.lastName.toLowerCase().includes(search)
      );
    }

    return successResponse({ users, total: users.length });
  } catch (err) {
    console.error('Admin users error:', err);
    return errorResponse('Something went wrong', 'INTERNAL_ERROR', 500);
  }
}
