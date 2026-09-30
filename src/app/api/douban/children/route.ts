import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { getChildrenShelf } from '@/lib/children';
import { DoubanItem, DoubanResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const group = new URL(request.url).searchParams.get('group') || '全部';

  try {
    const { items, missing } = await getChildrenShelf(group);
    const list: DoubanItem[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      // 浏览器直连豆瓣图床会因防盗链失败，改由已有图片代理带上豆瓣 Referer。
      poster: item.poster
        ? `/api/image-proxy?url=${encodeURIComponent(item.poster)}`
        : '',
      rate: item.rate,
      year: item.year,
    }));

    const response: DoubanResult & { missing: string[] } = {
      code: 200,
      message: '获取成功',
      list,
      missing,
    };

    const cacheTime = await getCacheTime();
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Netlify-Vary': 'query',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取儿童片单失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
