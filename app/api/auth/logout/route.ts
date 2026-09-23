export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  cookies().delete('voyago_access_token');
  return NextResponse.redirect(new URL('/login', req.url));
}
