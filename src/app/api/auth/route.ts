import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email?.endsWith('@automattic.com')) {
    return NextResponse.json({ error: 'Automattic email required' }, { status: 400 });
  }

  if (password !== process.env.TEAM_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set('wp-designer-auth', JSON.stringify({ email }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return NextResponse.json({ success: true, email });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('wp-designer-auth');
  return NextResponse.json({ success: true });
}
