"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ArticleBlock {
  id: string;
  type: "FACT" | "INFERENCE" | "UNVERIFIED";
  content: string;
  evidenceUrls: string[];
  order: number;
}

interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string | null;
  publishedAt: string | null;
  blocks: ArticleBlock[];
}

interface Campaign {
  id: string;
  name: string;
  category: string;
  provider: string;
}

export default function NewsDetailPage() {
  const params = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [topCampaign, setTopCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticle();
    fetchTopCampaign();
  }, [params.slug]);

  async function fetchArticle() {
    try {
      const response = await fetch(`/api/news/${params.slug}`);
      if (response.ok) {
        const data = await response.json();
        setArticle(data);
      }
    } catch (error) {
      console.error("Error fetching article:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTopCampaign() {
    try {
      const response = await fetch("/api/public/campaigns/top-priority");
      if (response.ok) {
        const data = await response.json();
        setTopCampaign(data.campaign);
      }
    } catch (error) {
      console.error("Error fetching top priority campaign:", error);
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

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8">
            <p className="text-red-600 mb-4">記事が見つかりません</p>
            <a
              href="/news"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← 記事一覧に戻る
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Article Header */}
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <div className="mb-4">
            {article.category && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {article.category}
              </span>
            )}
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {article.title}
          </h1>

          {article.summary && (
            <p className="text-xl text-gray-600 mb-4">{article.summary}</p>
          )}

          <div className="text-sm text-gray-500">
            公開日:{" "}
            {article.publishedAt
              ? new Date(article.publishedAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "不明"}
          </div>
        </div>

        {/* Article Blocks */}
        <div className="space-y-4 mb-8">
          {article.blocks.map((block, index) => (
            <div
              key={block.id}
              className={`rounded-lg shadow p-6 ${getBlockColor(block.type)}`}
            >
              {/* Block Label */}
              <div className="flex items-center mb-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getLabelStyle(block.type)}`}
                  title={getBlockTypeDescription(block.type)}
                >
                  {getBlockTypeLabel(block.type)}
                </span>
              </div>

              {/* Block Content */}
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {block.content}
                </p>
              </div>

              {/* Evidence URLs (for FACT blocks) */}
              {block.type === "FACT" && block.evidenceUrls && block.evidenceUrls.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    出典・根拠:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {block.evidenceUrls.map((url, idx) => (
                      <li key={idx} className="text-sm">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Support Button */}
        {topCampaign && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-8 mb-6 text-white text-center">
            <h2 className="text-2xl font-bold mb-3">
              ベネズエラの人々を支援する
            </h2>
            <p className="text-blue-100 mb-6">
              あなたの寄付が、ベネズエラの復興を支える力になります
            </p>
            <a
              href={`/go/${topCampaign.id}`}
              className="inline-block px-8 py-4 bg-white text-blue-600 font-bold text-lg rounded-lg hover:bg-blue-50 transition-colors shadow-md"
            >
              {topCampaign.provider} に寄付する →
            </a>
            <p className="text-sm text-blue-100 mt-4">
              {topCampaign.name}
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">情報の信頼性について</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold mr-3">
                FACT
              </span>
              <p className="text-gray-700">
                出典が明示された事実情報。信頼できる情報源（国連機関、政府機関、報道機関など）による裏付けがあります。
              </p>
            </div>
            <div className="flex items-start">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mr-3">
                INFERENCE
              </span>
              <p className="text-gray-700">
                事実に基づく推論や解釈。専門家の分析や統計からの推定を含みます。
              </p>
            </div>
            <div className="flex items-start">
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold mr-3">
                UNVERIFIED
              </span>
              <p className="text-gray-700">
                未確認情報。出典が不明確、または検証が困難な情報です。参考程度にお読みください。
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center">
          <a
            href="/news"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← 記事一覧に戻る
          </a>
        </div>
      </div>
    </div>
  );
}

function getBlockColor(type: string): string {
  switch (type) {
    case "FACT":
      return "bg-green-50 border-l-4 border-green-500";
    case "INFERENCE":
      return "bg-blue-50 border-l-4 border-blue-500";
    case "UNVERIFIED":
      return "bg-gray-50 border-l-4 border-gray-400";
    default:
      return "bg-white";
  }
}

function getLabelStyle(type: string): string {
  switch (type) {
    case "FACT":
      return "bg-green-100 text-green-800";
    case "INFERENCE":
      return "bg-blue-100 text-blue-800";
    case "UNVERIFIED":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getBlockTypeLabel(type: string): string {
  switch (type) {
    case "FACT":
      return "事実 (FACT)";
    case "INFERENCE":
      return "推論 (INFERENCE)";
    case "UNVERIFIED":
      return "未確認 (UNVERIFIED)";
    default:
      return type;
  }
}

function getBlockTypeDescription(type: string): string {
  switch (type) {
    case "FACT":
      return "出典が明示された事実情報";
    case "INFERENCE":
      return "事実に基づく推論・解釈";
    case "UNVERIFIED":
      return "未確認情報（出典不明・検証困難）";
    default:
      return "";
  }
}
