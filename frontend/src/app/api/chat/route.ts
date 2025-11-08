import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.YOUR_SITE_URL || "",
    "X-Title": process.env.YOUR_SITE_NAME || "",
  },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, history } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'query parameter is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // 履歴を含むmessages配列を構築
    const messages: any[] = [];
    
    // 履歴がある場合、userとassistantのペアとして追加
    if (history && Array.isArray(history) && history.length > 0) {
      history.forEach((item: any) => {
        if (item.query) {
          // userのクエリを追加
          messages.push({
            role: "user",
            content: item.query
          });
          
          // assistantの応答を追加（message.contentまたは直接content）
          const assistantContent = item.message?.content || item.content;
          if (assistantContent) {
            messages.push({
              role: "assistant",
              content: assistantContent
            });
          }
        }
      });
    }
    
    // 現在のクエリを追加
    messages.push({
      role: "user",
      content: query
    });

    const completion = await openai.chat.completions.create({
      model: "perplexity/sonar",
      messages: messages
    });

    return NextResponse.json({
      message: completion.choices[0].message,
      usage: completion.usage
    });
  } catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json(
      { error: 'Failed to process query', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GETリクエストも後方互換性のために残す
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'query parameter is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "perplexity/sonar",
      messages: [
        {
          "role": "user",
          "content": query
        }
      ]
    });

    return NextResponse.json({
      message: completion.choices[0].message,
      usage: completion.usage
    });
  } catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json(
      { error: 'Failed to process query', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

