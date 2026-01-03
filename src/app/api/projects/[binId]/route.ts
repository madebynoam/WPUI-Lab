import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getStorageProvider } from '@/lib/storage';

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
    const storage = getStorageProvider();
    const data = await storage.get(binId);
    return NextResponse.json({ binId, ...data });
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

  try {
    const storage = getStorageProvider();
    const updatedMeta = await storage.update(binId, { project, meta }, email || undefined);
    return NextResponse.json({ success: true, ...updatedMeta });
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
    const storage = getStorageProvider();
    await storage.delete(binId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
