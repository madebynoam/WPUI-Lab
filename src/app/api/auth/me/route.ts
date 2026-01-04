import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('wp-designer-auth');
  if (!authCookie?.value) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { email } = JSON.parse(authCookie.value);
  return NextResponse.json({ email });
}
