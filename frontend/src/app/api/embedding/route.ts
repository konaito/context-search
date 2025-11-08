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
    const { input } = body;

    if (!input) {
      return NextResponse.json(
        { error: 'input parameter is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const embedding = await openai.embeddings.create({
      model: "google/gemini-embedding-001",
      input: input, // 文字列または文字列の配列
      encoding_format: "float",
    });

    return NextResponse.json({
      embedding: embedding.data[0].embedding,
      usage: embedding.usage,
    });
  } catch (error) {
    console.error('Error creating embedding:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create embedding', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

