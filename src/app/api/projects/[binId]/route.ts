import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JSONBIN_API = 'https://api.jsonbin.io/v3';

async function getCurrentEmail() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('wp-designer-auth');
  if (!authCookie?.value) return null;
  return JSON.parse(authCookie.value).email;
}

// GET - Load project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ binId: string }> }
) {
  const { binId } = await params;
  try {
    const res = await fetch(`${JSONBIN_API}/b/${binId}/latest`, {
      headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY! },
    });
    const data = await res.json();
    return NextResponse.json({ binId, ...data.record });
  } catch (error) {
    console.error('Failed to load project:', error);
    return NextResponse.json({ error: 'Failed to load project' }, { status: 500 });
  }
}

// PUT - Save project
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ binId: string }> }
) {
  const { binId } = await params;
  const email = await getCurrentEmail();
  const { project, meta } = await request.json();

  const payload = {
    project,
    meta: {
      ...meta,
      lastSaved: Date.now(),
      lastSavedBy: email,
      saveCount: (meta?.saveCount || 0) + 1,
    },
  };

  try {
    await fetch(`${JSONBIN_API}/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': process.env.JSONBIN_API_KEY!,
      },
      body: JSON.stringify(payload),
    });
    return NextResponse.json({ success: true, ...payload.meta });
  } catch (error) {
    console.error('Failed to save project:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

// DELETE - Delete project
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ binId: string }> }
) {
  const { binId } = await params;
  try {
    await fetch(`${JSONBIN_API}/b/${binId}`, {
      method: 'DELETE',
      headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY! },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
