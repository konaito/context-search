import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'node-html-parser';

// HTMLタグとエンティティを除去する関数
function stripHtml(html: string): string {
  if (!html) return '';
  
  // HTMLエンティティをデコード（&amp;を最初に処理する必要がある）
  let decoded = html;
  // 基本的なHTMLエンティティ
  decoded = decoded
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'");
  
  // 数値エンティティ（&#123;形式）をデコード
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  
  // 16進数エンティティ（&#x1F;形式）をデコード
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // HTMLタグを除去
  return decoded.replace(/<[^>]*>/g, '').trim();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'url parameter is required' },
        { status: 400 }
      );
    }

    // URLのバリデーション
    let targetUrl: string;
    try {
      const parsedUrl = new URL(url);
      targetUrl = parsedUrl.toString();
    } catch {
      // URLが不完全な場合はhttps://を追加
      targetUrl = url.startsWith('http') ? url : `https://${url}`;
    }

    // HTMLを取得
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const root = parse(html);

    // メタデータを抽出
    const metadata: any = {
      url: targetUrl,
      title: '',
      description: '',
      image: '',
      siteName: '',
    };

    // OGPタグを優先的に取得
    const ogTitle = root.querySelector('meta[property="og:title"]');
    const twitterTitle = root.querySelector('meta[name="twitter:title"]');
    const titleTag = root.querySelector('title');
    
    const rawTitle = 
      ogTitle?.getAttribute('content') ||
      twitterTitle?.getAttribute('content') ||
      titleTag?.text ||
      '';
    
    metadata.title = stripHtml(rawTitle);

    const ogDescription = root.querySelector('meta[property="og:description"]');
    const twitterDescription = root.querySelector('meta[name="twitter:description"]');
    const metaDescription = root.querySelector('meta[name="description"]');
    
    const rawDescription = 
      ogDescription?.getAttribute('content') ||
      twitterDescription?.getAttribute('content') ||
      metaDescription?.getAttribute('content') ||
      '';
    
    metadata.description = stripHtml(rawDescription);

    const ogImage = root.querySelector('meta[property="og:image"]');
    const twitterImage = root.querySelector('meta[name="twitter:image"]');
    
    metadata.image = 
      ogImage?.getAttribute('content') ||
      twitterImage?.getAttribute('content') ||
      '';

    const ogSiteName = root.querySelector('meta[property="og:site_name"]');
    
    metadata.siteName = ogSiteName?.getAttribute('content') || '';

    // 画像URLが相対パスの場合は絶対URLに変換
    if (metadata.image && !metadata.image.startsWith('http')) {
      const baseUrl = new URL(targetUrl);
      metadata.image = new URL(metadata.image, baseUrl.origin).toString();
    }

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch metadata', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

