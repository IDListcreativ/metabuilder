import { NextRequest, NextResponse } from 'next/server';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

function notionHeaders(apiKey: string) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY is not configured.' }, { status: 500 });
  }

  const { pageId } = await params;

  try {
    // Fetch page metadata and blocks in parallel
    const [pageRes, blocksRes] = await Promise.all([
      fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
        headers: notionHeaders(apiKey),
      }),
      fetch(`${NOTION_API_BASE}/blocks/${pageId}/children?page_size=50`, {
        headers: notionHeaders(apiKey),
      }),
    ]);

    const [pageData, blocksData] = await Promise.all([pageRes.json(), blocksRes.json()]);

    if (!pageRes.ok) {
      return NextResponse.json({ error: pageData.message || 'Failed to fetch page' }, { status: pageRes.status });
    }

    return NextResponse.json({ page: pageData, blocks: blocksData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
