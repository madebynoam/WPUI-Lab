import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getStorageProvider } from '@/lib/storage';

async function getCurrentEmail() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('wp-designer-auth');
  if (!authCookie?.value) return null;
  return JSON.parse(authCookie.value).email;
}

// GET - List MY projects only
export async function GET() {
  const email = await getCurrentEmail();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const storage = getStorageProvider();
    const projects = await storage.list(email);

    // Transform to match existing frontend expectations
    const response = projects.map(p => ({
      metadata: { id: p.id },
      record: {
        project: { name: p.name },
        meta: { lastSaved: p.lastSaved }
      }
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to list projects:', error);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
}

// POST - Create new project
export async function POST(request: Request) {
  const email = await getCurrentEmail();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await request.json();

  try {
    const storage = getStorageProvider();
    const result = await storage.create(email, name);

    return NextResponse.json({
      binId: result.projectId,
      project: result.project,
      meta: result.meta,
    });
  } catch (error) {
    console.error('Failed to create project:', error);
    const message = error instanceof Error ? error.message : 'Failed to create project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
