'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface SearchHistoryItem {
  query: string;
  timestamp: string;
  embedding?: number[] | null;
  message?: {
    content?: string;
    annotations?: any[];
    citations?: any[];
  };
  usage?: any;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('searchHistory');
      if (stored) {
        const parsed = JSON.parse(stored);
        // 最新のものから順に表示
        setHistory(parsed.reverse());
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = (index: number) => {
    try {
      const stored = localStorage.getItem('searchHistory');
      if (stored) {
        const parsed = JSON.parse(stored);
        const reversedIndex = history.length - 1 - index;
        parsed.splice(reversedIndex, 1);
        localStorage.setItem('searchHistory', JSON.stringify(parsed));
        loadHistory();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const clearHistory = () => {
    if (confirm('すべての検索履歴を削除しますか？')) {
      localStorage.removeItem('searchHistory');
      setHistory([]);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDateGroup = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisMonth = new Date(today);
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (itemDate.getTime() === today.getTime()) {
      return '今日';
    } else if (itemDate.getTime() === yesterday.getTime()) {
      return '昨日';
    } else if (date.getTime() >= thisWeek.getTime()) {
      return '先週';
    } else if (date.getTime() >= thisMonth.getTime()) {
      return '先月';
    } else {
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
      });
    }
  };

  // 検索フィルタリングと日付グループ化
  const groupedHistory = useMemo(() => {
    const filtered = history.filter((item) =>
      item.query.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, SearchHistoryItem[]> = {};
    filtered.forEach((item) => {
      const group = getDateGroup(item.timestamp);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
    });

    return groups;
  }, [history, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-500 dark:text-zinc-400">読み込み中...</p>
      </div>
    );
  }

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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="履歴を検索..."
                className="flex-1 bg-transparent text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="ml-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 履歴削除ボタン */}
        {history.length > 0 && (
          <div className="mb-6 text-center">
            <button
              onClick={clearHistory}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-4 py-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              すべての履歴を削除
            </button>
          </div>
        )}

        {history.length === 0 ? (
          <div className="text-center text-zinc-500 dark:text-zinc-400 py-16">
            <p className="text-lg mb-2">検索履歴がありません</p>
            <Link
              href="/"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              検索を開始する
            </Link>
          </div>
        ) : Object.keys(groupedHistory).length === 0 ? (
          <div className="text-center text-zinc-500 dark:text-zinc-400 py-16">
            <p className="text-lg">検索結果が見つかりませんでした</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedHistory)
              .sort((a, b) => {
                // 日付グループの順序を定義
                const order: Record<string, number> = {
                  今日: 0,
                  昨日: 1,
                  先週: 2,
                  先月: 3,
                };
                return (order[a[0]] ?? 999) - (order[b[0]] ?? 999);
              })
              .map(([group, items]) => (
                <div key={group}>
                  <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 px-2">
                    {group}
                  </h2>
                  <div className="space-y-1">
                    {items.map((item, index) => {
                      const originalIndex = history.findIndex((h) => h === item);
                      return (
                        <div
                          key={originalIndex}
                          className="group flex items-center justify-between px-3 py-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <Link
                            href={`/?query=${encodeURIComponent(item.query)}`}
                            className="flex-1 min-w-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <svg
                                  className="h-5 w-5 text-blue-600 dark:text-blue-400"
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
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-black dark:text-zinc-50 truncate">
                                  {item.query}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {formatTime(item.timestamp)}
                                  {item.embedding && (
                                    <span className="ml-2 text-green-600 dark:text-green-400">
                                      • Embeddingあり
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </Link>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              deleteItem(originalIndex);
                            }}
                            className="ml-2 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 p-1"
                            title="削除"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
