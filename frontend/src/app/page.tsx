'use client';

import { useState, useEffect } from 'react';

interface Metadata {
  url: string;
  title: string;
  description: string;
  image?: string;
  siteName?: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [jsonData, setJsonData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadataCache, setMetadataCache] = useState<Record<string, Metadata>>({});

  const fetchMetadata = async (url: string): Promise<Metadata | null> => {
    if (metadataCache[url]) {
      return metadataCache[url];
    }

    try {
      const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      setMetadataCache((prev) => ({ ...prev, [url]: data }));
      return data;
    } catch {
      return null;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('検索クエリを入力してください');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setJsonData(null);

    try {
      const response = await fetch(`/api/analyze-image?query=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '検索に失敗しました');
      }

      setResult(data.message?.content || '結果がありません');
      setJsonData(data);

      // annotationsのメタデータを非同期で取得
      const annotations = 
        data?.message?.annotations || 
        data?.message?.citations || 
        data?.annotations || 
        [];
      
      annotations.forEach(async (annotation: any) => {
        const urlCitation = annotation.url_citation || annotation;
        const url = urlCitation.url || annotation.url;
        if (url && url !== '#') {
          await fetchMetadata(url);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        {/* 検索バー - Google風 */}
        <div className="mb-8">
          <div className="mb-6 text-center">
            <h1 className="text-4xl font-normal text-black dark:text-zinc-50 mb-2">
              コンテキスト検索
            </h1>
          </div>
          <form onSubmit={handleSearch}>
            <div className="flex items-center rounded-full border border-zinc-300 shadow-sm hover:shadow-md transition-shadow dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex-1 flex items-center px-5 py-3">
                <svg
                  className="h-5 w-5 text-zinc-400 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="検索..."
                  className="flex-1 bg-transparent text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none"
                  disabled={loading}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="ml-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 text-zinc-600 hover:bg-zinc-100 rounded-r-full dark:text-zinc-400 dark:hover:bg-zinc-700 disabled:opacity-50"
              >
                {loading ? '検索中...' : '検索'}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        {result && (
          <>
            {/* 検索結果 - Google風 */}
            <div className="mb-8">
              <div className="prose prose-sm max-w-none text-zinc-700 dark:prose-invert dark:text-zinc-300">
                <div className="whitespace-pre-wrap leading-relaxed">{result}</div>
              </div>
            </div>

            {/* 参考ソース - Google検索風 */}
            {(() => {
              const annotations = 
                jsonData?.message?.annotations || 
                jsonData?.message?.citations || 
                jsonData?.annotations || 
                [];
              
              return annotations.length > 0 ? (
                <div className="mb-8">
                  <div className="space-y-6">
                    {annotations.map((annotation: any, index: number) => {
                      const urlCitation = annotation.url_citation || annotation;
                      const url = urlCitation.url || annotation.url || '#';
                      const title = urlCitation.title || annotation.title;
                      const metadata = metadataCache[url];

                      return (
                        <div key={index} className="max-w-2xl">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block group"
                          >
                            {/* URL */}
                            <div className="mb-1">
                              <p className="text-xs text-green-700 dark:text-green-400">
                                {url !== '#' ? new URL(url).hostname.replace('www.', '') : 'URL不明'}
                              </p>
                            </div>
                            
                            {/* タイトル */}
                            <h3 className="mb-1 text-xl text-blue-600 dark:text-blue-400 group-hover:underline leading-snug">
                              {metadata?.title || title || url}
                            </h3>
                            
                            {/* 説明 */}
                            {(metadata?.description || annotation.text || annotation.description) && (
                              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                                {metadata?.description || annotation.text || annotation.description}
                              </p>
                            )}
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}

            {/* JSON レスポンス */}
            {jsonData && (
              <div className="mt-12 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
                  JSON レスポンス
                </h2>
                <pre className="overflow-auto text-xs text-zinc-800 dark:text-zinc-200">
                  {JSON.stringify(jsonData, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}

        {!result && !error && !loading && (
          <div className="text-center text-zinc-500 dark:text-zinc-400 py-16">
            <p className="text-lg">検索クエリを入力して検索を開始してください</p>
          </div>
        )}
      </main>
    </div>
  );
}
