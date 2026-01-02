import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JSONBIN_API = 'https://api.jsonbin.io/v3';

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
    const res = await fetch(
      `${JSONBIN_API}/c/${process.env.JSONBIN_COLLECTION_ID}/bins`,
      { headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY! } }
    );
    const bins = await res.json();

    // Collection listing returns: { record: "binId", snippetMeta: { name: "email-projectName" }, ... }
    // Filter by bin name prefix (email-) since record is just the ID, not the content
    const myProjects = (Array.isArray(bins) ? bins : []).filter(
      (b: any) => b.snippetMeta?.name?.startsWith(`${email}-`)
    ).map((b: any) => ({
      metadata: { id: b.record },
      record: {
        project: { name: b.snippetMeta?.name?.replace(`${email}-`, '') || 'Untitled' },
        meta: { lastSaved: new Date(b.createdAt).getTime() }
      }
    }));

    return NextResponse.json(myProjects);
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

  // Create root Grid for the page (required for canvas to work)
  const rootGrid = {
    id: 'root-grid',
    type: 'Grid',
    props: {
      columns: 12,
      gap: 24,
      gridGuideColor: '#3858e9',
    },
    children: [],
    interactions: [],
  };

  const payload = {
    project: {
      id: `project-${Date.now()}`,
      name,
      pages: [{
        id: 'page-1',
        name: 'Home',
        tree: [rootGrid],
        theme: { primaryColor: '#3858e9', backgroundColor: '#ffffff' },
      }],
      currentPageId: 'page-1',
    },
    meta: {
      ownerEmail: email,
      createdAt: Date.now(),
      lastSaved: Date.now(),
      saveCount: 1,
    },
  };

  try {
    const apiKey = process.env.JSONBIN_API_KEY;
    console.log('JSONBin API Key (first 20 chars):', apiKey?.substring(0, 20));

    const res = await fetch(`${JSONBIN_API}/b`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': apiKey!,
        'X-Collection-Id': process.env.JSONBIN_COLLECTION_ID!,
        'X-Bin-Name': `${email}-${name}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error('JSONBin error:', data);
      return NextResponse.json({ error: data.message || 'Failed to create project' }, { status: res.status });
    }

    const binId = data.metadata?.id;
    if (!binId) {
      console.error('Unexpected JSONBin response:', data);
      return NextResponse.json({ error: 'Invalid response from storage' }, { status: 500 });
    }

    return NextResponse.json({ binId, ...payload });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
