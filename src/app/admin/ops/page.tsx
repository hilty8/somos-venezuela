"use client";

import { useEffect, useState } from "react";

interface OpsStats {
  rawItems: Record<string, number>;
  articles: Record<string, number>;
  staleProcessing: number;
  retryableFailed: number;
  todayRuns: Array<{
    id: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    stats: any;
  }>;
}

interface FailedItem {
  id: string;
  url: string;
  title: string | null;
  source: { id: string; name: string };
  errorReason: string | null;
  retryCount: number;
  lastAttemptAt: string | null;
  canRetry: boolean;
}

interface HoldArticle {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  createdAt: string;
  rawItemStatus: string[];
  lastReview: {
    scoreTotal: number | null;
    hardFailReasons: string[];
    suggestions: string[];
    attemptNumber: number;
  } | null;
}

export default function AdminOpsPage() {
  const [stats, setStats] = useState<OpsStats | null>(null);
  const [failedItems, setFailedItems] = useState<FailedItem[]>([]);
  const [holdArticles, setHoldArticles] = useState<HoldArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFailed, setSelectedFailed] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, failedRes, holdRes] = await Promise.all([
        fetch("/api/admin/ops/stats"),
        fetch("/api/admin/ops/failed?limit=50"),
        fetch("/api/admin/ops/hold?limit=50"),
      ]);

      const statsData = await statsRes.json();
      const failedData = await failedRes.json();
      const holdData = await holdRes.json();

      setStats(statsData);
      setFailedItems(failedData.items || []);
      setHoldArticles(holdData.articles || []);
    } catch (error) {
      console.error("Failed to fetch ops data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryFailed() {
    if (selectedFailed.length === 0) {
      alert("No items selected");
      return;
    }

    if (!confirm(`Retry ${selectedFailed.length} failed items?`)) {
      return;
    }

    try {
      const response = await fetch("/api/admin/ops/retry-failed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selectedFailed }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        setSelectedFailed([]);
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to retry items:", error);
      alert("Failed to retry items");
    }
  }

  async function handleRecoverStale(action: "NEW" | "FAILED") {
    if (
      !confirm(
        `Recover stale PROCESSING items to ${action}?\nThis will affect ${stats?.staleProcessing || 0} items.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/admin/ops/recover-stale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to recover stale items:", error);
      alert("Failed to recover stale items");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            運用ダッシュボード (Operations)
          </h1>
          <p className="text-gray-600">
            パイプライン状態監視・失敗/保留管理・Stale回収
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500 mb-1">Raw Items (NEW)</p>
            <p className="text-3xl font-bold text-blue-600">
              {stats?.rawItems.NEW || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500 mb-1">PROCESSING (Active)</p>
            <p className="text-3xl font-bold text-yellow-600">
              {stats?.rawItems.PROCESSING || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500 mb-1">FAILED (Retryable)</p>
            <p className="text-3xl font-bold text-red-600">
              {stats?.retryableFailed || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500 mb-1">Stale PROCESSING</p>
            <p className="text-3xl font-bold text-orange-600">
              {stats?.staleProcessing || 0}
            </p>
          </div>
        </div>

        {/* Article Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-green-50 rounded-lg shadow p-6">
            <p className="text-sm text-green-700 mb-1">Published Articles</p>
            <p className="text-3xl font-bold text-green-800">
              {stats?.articles.PUBLISHED || 0}
            </p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-6">
            <p className="text-sm text-yellow-700 mb-1">Hold Articles</p>
            <p className="text-3xl font-bold text-yellow-800">
              {stats?.articles.HOLD || 0}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg shadow p-6">
            <p className="text-sm text-gray-700 mb-1">Draft Articles</p>
            <p className="text-3xl font-bold text-gray-800">
              {stats?.articles.DRAFT || 0}
            </p>
          </div>
        </div>

        {/* Today's Pipeline Runs */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">今日のパイプライン実行</h2>
          {stats?.todayRuns && stats.todayRuns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Run ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Started
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Results
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.todayRuns.map((run) => (
                    <tr key={run.id}>
                      <td className="px-4 py-3 text-sm font-mono">
                        {run.id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            run.status === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : run.status === "FAILED"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(run.startedAt).toLocaleTimeString("ja-JP")}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {run.stats && (
                          <span className="text-xs">
                            公開: {run.stats.published} / 保留:{" "}
                            {run.stats.hold} / 失敗: {run.stats.failed}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">今日の実行はありません</p>
          )}
        </div>

        {/* Stale PROCESSING Recovery */}
        {stats && stats.staleProcessing > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-orange-900 mb-4">
              ⚠️ Stale PROCESSING 検出
            </h2>
            <p className="text-orange-800 mb-4">
              {stats.staleProcessing} 件のアイテムが長時間 PROCESSING
              状態です。回収してください。
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleRecoverStale("NEW")}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                NEW に戻す（再試行）
              </button>
              <button
                onClick={() => handleRecoverStale("FAILED")}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                FAILED にする
              </button>
            </div>
          </div>
        )}

        {/* Failed Items */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">失敗アイテム (FAILED)</h2>
            <button
              onClick={handleRetryFailed}
              disabled={selectedFailed.length === 0}
              className={`px-4 py-2 rounded-md ${
                selectedFailed.length === 0
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              選択を再試行 ({selectedFailed.length})
            </button>
          </div>
          {failedItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFailed(
                              failedItems
                                .filter((item) => item.canRetry)
                                .map((item) => item.id)
                            );
                          } else {
                            setSelectedFailed([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Error
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Retry
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {failedItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        {item.canRetry && (
                          <input
                            type="checkbox"
                            checked={selectedFailed.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFailed([...selectedFailed, item.id]);
                              } else {
                                setSelectedFailed(
                                  selectedFailed.filter((id) => id !== item.id)
                                );
                              }
                            }}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{item.source.name}</td>
                      <td className="px-4 py-3 text-sm">
                        {item.title || "（タイトルなし）"}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600">
                        {item.errorReason?.substring(0, 100) || "Unknown error"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.retryCount} 回
                        {!item.canRetry && (
                          <span className="text-red-600 ml-2">(上限)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">失敗アイテムはありません</p>
          )}
        </div>

        {/* Hold Articles */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">保留記事 (HOLD)</h2>
          {holdArticles.length > 0 ? (
            <div className="space-y-4">
              {holdArticles.map((article) => (
                <div
                  key={article.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold">{article.title}</h3>
                    {article.category && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {article.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    作成日:{" "}
                    {new Date(article.createdAt).toLocaleString("ja-JP")}
                  </p>
                  {article.lastReview && (
                    <div className="bg-gray-50 p-3 rounded-md mb-2">
                      <p className="text-sm font-medium mb-1">
                        レビュー結果 (試行 {article.lastReview.attemptNumber})
                      </p>
                      {article.lastReview.scoreTotal !== null && (
                        <p className="text-sm text-gray-700 mb-1">
                          スコア: {article.lastReview.scoreTotal.toFixed(1)}/100
                        </p>
                      )}
                      {article.lastReview.hardFailReasons.length > 0 && (
                        <div className="text-sm text-red-600 mb-1">
                          Hard Fail:
                          <ul className="list-disc list-inside ml-2">
                            {article.lastReview.hardFailReasons.map(
                              (reason, idx) => (
                                <li key={idx}>{reason}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                      {article.lastReview.suggestions.length > 0 && (
                        <div className="text-sm text-gray-600">
                          改善案:
                          <ul className="list-disc list-inside ml-2">
                            {article.lastReview.suggestions
                              .slice(0, 3)
                              .map((suggestion, idx) => (
                                <li key={idx}>{suggestion}</li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <a
                      href={`/admin/articles/${article.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      詳細を見る
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">保留記事はありません</p>
          )}
        </div>
      </div>
    </div>
  );
}
