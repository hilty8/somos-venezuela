"use client";

import { useEffect, useState } from "react";

interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string | null;
  publishedAt: string | null;
  blockCount: number;
}

export default function NewsListPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles() {
    try {
      const response = await fetch("/api/news?limit=50");
      const data = await response.json();
      setArticles(data.articles || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ベネズエラ人道支援 - 記事一覧
          </h1>
          <p className="text-gray-600">
            {total}件の記事が公開されています
          </p>
        </div>

        {/* Articles List */}
        {articles.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">まだ記事が公開されていません</p>
          </div>
        ) : (
          <div className="space-y-6">
            {articles.map((article) => (
              <a
                key={article.id}
                href={`/news/${article.slug}`}
                className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-2xl font-semibold text-gray-900 hover:text-blue-600">
                    {article.title}
                  </h2>
                  {article.category && (
                    <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full whitespace-nowrap">
                      {article.category}
                    </span>
                  )}
                </div>

                {article.summary && (
                  <p className="text-gray-600 mb-3">{article.summary}</p>
                )}

                <div className="flex items-center text-sm text-gray-500">
                  <span>
                    {article.publishedAt
                      ? new Date(article.publishedAt).toLocaleDateString(
                          "ja-JP",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )
                      : "公開日不明"}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{article.blockCount}ブロック</span>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← トップページに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
