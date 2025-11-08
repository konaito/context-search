'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Metadata {
  url: string;
  title: string;
  description: string;
  image?: string;
  siteName?: string;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-500 dark:text-zinc-400">読み込み中...</p>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [jsonData, setJsonData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadataCache, setMetadataCache] = useState<Record<string, Metadata>>({});
  const [fromHistory, setFromHistory] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [queryEmbedding, setQueryEmbedding] = useState<number[] | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // コサイン類似度を計算
  const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  // 入力のたびにembeddingを取得して類似検索
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setQueryEmbedding(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        // クエリのembeddingを取得
        const embeddingResponse = await fetch('/api/embedding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: query.trim(),
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const embedding = embeddingData.embedding;
          setQueryEmbedding(embedding);

          // 検索履歴から類似度の高い5件を取得
          try {
            const stored = localStorage.getItem('searchHistory');
            if (stored) {
              const history = JSON.parse(stored);
              const historyWithSimilarity = history
                .filter((item: any) => item.embedding && item.embedding.length > 0)
                .map((item: any) => ({
                  ...item,
                  similarity: cosineSimilarity(embedding, item.embedding),
                }))
                .filter((item: any) => item.similarity > 0.5) // 類似度が0.5以上のもののみ
                .sort((a: any, b: any) => b.similarity - a.similarity)
                .slice(0, 5); // 上位5件

              setSuggestions(historyWithSimilarity);
              setShowSuggestions(historyWithSimilarity.length > 0);
            }
          } catch (err) {
            console.error('Error reading history for suggestions:', err);
          }
        }
      } catch (err) {
        console.error('Error creating query embedding:', err);
      }
    }, 300); // 300msのdebounce

    return () => clearTimeout(timeoutId);
  }, [query]);

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

  const handleSearch = useCallback(async (e: React.FormEvent, searchQuery?: string) => {
    e.preventDefault();
    
    const queryToSearch = searchQuery || query;
    
    if (!queryToSearch.trim()) {
      setError('検索クエリを入力してください');
      return;
    }

    // 検索候補を閉じる
    setShowSuggestions(false);
    
    setLoading(true);
    setError(null);
    setResult(null);
    setJsonData(null);
    setFromHistory(false);

    try {
      // 履歴から同じクエリを検索
      let data: any = null;
      let foundInHistory = false;
      
      try {
        const stored = localStorage.getItem('searchHistory');
        if (stored) {
          const history = JSON.parse(stored);
          // 最新のものから検索（最新の結果を使用）
          const reversedHistory = [...history].reverse();
          const foundItem = reversedHistory.find((item: any) => item.query === queryToSearch.trim());
          if (foundItem) {
            data = foundItem;
            foundInHistory = true;
            setFromHistory(true);
          }
        }
      } catch (err) {
        console.error('Error reading history:', err);
      }

      // 履歴に見つからない場合のみAPIリクエスト
      if (!data) {
        // クエリのembeddingを取得して類似履歴を検索
        let similarHistory: any[] = [];
        try {
          const queryEmbeddingResponse = await fetch('/api/embedding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: queryToSearch.trim(),
            }),
          });

          if (queryEmbeddingResponse.ok) {
            const queryEmbeddingData = await queryEmbeddingResponse.json();
            const queryEmbedding = queryEmbeddingData.embedding;

            // 検索履歴から類似度90%以上の上位3件を取得
            try {
              const stored = localStorage.getItem('searchHistory');
              if (stored) {
                const history = JSON.parse(stored);
                const historyWithSimilarity = history
                  .filter((item: any) => item.embedding && item.embedding.length > 0)
                  .map((item: any) => ({
                    ...item,
                    similarity: cosineSimilarity(queryEmbedding, item.embedding),
                  }))
                  .filter((item: any) => item.similarity >= 0.9) // 類似度が90%以上のもののみ
                  .sort((a: any, b: any) => b.similarity - a.similarity)
                  .slice(0, 3); // 上位3件

                similarHistory = historyWithSimilarity;
              }
            } catch (err) {
              console.error('Error reading history for similar search:', err);
            }
          }
        } catch (err) {
          console.error('Error creating query embedding for history:', err);
        }

        // POSTリクエストで履歴を含めて送信
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: queryToSearch,
            history: similarHistory,
          }),
        });
        
        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '検索に失敗しました');
        }
      }

      const content = data.message?.content || '結果がありません';
      setResult(content);
      setJsonData(data);

      // 履歴から取得した場合はembeddingが既にあるか確認
      let embedding = data.embedding || null;
      
      // embeddingがない場合のみ作成
      if (!embedding) {
        try {
          const embeddingResponse = await fetch('/api/embedding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: content,
            }),
          });

          if (embeddingResponse.ok) {
            const embeddingData = await embeddingResponse.json();
            embedding = embeddingData.embedding;
          }
        } catch (err) {
          console.error('Error creating embedding:', err);
        }
      }

      // 履歴から取得した場合は保存しない（既に保存済み）
      if (!foundInHistory) {
        // JSON辞書に結果を追加（検索クエリ、embedding、タイムスタンプを含む）
        const resultData = {
          ...data,
          query: queryToSearch, // 検索したときのクエリ
          embedding: embedding, // contentのembeddingベクトル
          timestamp: new Date().toISOString(), // 検索実行時刻
        };

        // localStorageに保存
        try {
          const existingHistory = localStorage.getItem('searchHistory');
          const history = existingHistory ? JSON.parse(existingHistory) : [];
          history.push(resultData);
          // 最新100件を保持（オプション）
          const recentHistory = history.slice(-100);
          localStorage.setItem('searchHistory', JSON.stringify(recentHistory));
        } catch (err) {
          console.error('Error saving to localStorage:', err);
        }
      }

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
  }, [query]);

  // URLクエリパラメータから自動検索を実行
  useEffect(() => {
    if (hasInitialized) return;
    
    const urlQuery = searchParams.get('query');
    if (urlQuery) {
      const decodedQuery = decodeURIComponent(urlQuery);
      setQuery(decodedQuery);
      setHasInitialized(true);
      
      // 自動的に検索を実行
      const syntheticEvent = {
        preventDefault: () => {},
      } as React.FormEvent;
      handleSearch(syntheticEvent, decodedQuery);
    } else {
      setHasInitialized(true);
    }
  }, [searchParams, hasInitialized, handleSearch]);

  // 検索候補以外をクリックしたときに閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        showSuggestions
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        {/* 検索バー - Google風 */}
        <div className="mb-8">
          <div className="mb-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <Link href="/">
                <h1 className="text-4xl font-normal text-black dark:text-zinc-50 hover:opacity-80 cursor-pointer transition-opacity">
                  コンテキスト検索
                </h1>
              </Link>
              <div className="flex-1 flex justify-end">
                <Link
                  href="/history"
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  履歴
                </Link>
              </div>
            </div>
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
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // 少し遅延させてクリックイベントを処理できるようにする
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
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
          
          {/* 検索候補 - Google風 */}
          {showSuggestions && suggestions.length > 0 && (
            <div ref={suggestionsRef} className="mt-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-w-2xl mx-auto">
              <div className="py-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onMouseDown={(e) => {
                      // inputのblurを防ぐ
                      e.preventDefault();
                    }}
                    onClick={async () => {
                      setQuery(suggestion.query);
                      setShowSuggestions(false);
                      // 検索を実行
                      const syntheticEvent = {
                        preventDefault: () => {},
                      } as React.FormEvent;
                      await handleSearch(syntheticEvent, suggestion.query);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-3 group"
                  >
                    <svg
                      className="h-5 w-5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-black dark:text-zinc-50 truncate">
                        {suggestion.query}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        類似度: {(suggestion.similarity * 100).toFixed(1)}%
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        {fromHistory && result && (
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 text-sm">
            ✓ 履歴から取得しました
          </div>
        )}

        {result && (
          <>
            {/* 検索結果 - Google風 */}
            <div className="mb-8">
              <div className="prose prose-sm max-w-none text-zinc-700 dark:prose-invert dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
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
