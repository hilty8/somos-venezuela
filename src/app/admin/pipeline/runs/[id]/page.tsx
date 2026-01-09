"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface PipelineRun {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  sourceId: string | null;
  limit: number | null;
  stats: {
    total: number;
    published: number;
    hold: number;
    failed: number;
  };
  logs: string;
}

export default function PipelineRunDetailPage() {
  const params = useParams();
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRun();
  }, [params.id]);

  async function fetchRun() {
    try {
      const response = await fetch(`/api/admin/pipeline/runs/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setRun(data);
      }
    } catch (error) {
      console.error("Error fetching run:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-red-600">Pipeline run not found</p>
          <a
            href="/admin/pipeline"
            className="text-blue-600 hover:text-blue-800 underline mt-4 inline-block"
          >
            ← パイプライン一覧に戻る
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            パイプライン実行詳細
          </h1>
          <p className="text-gray-600 font-mono">Run ID: {run.id}</p>
        </div>

        {/* Status Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">実行情報</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">ステータス</p>
              <p className="text-lg font-semibold">
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
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">開始日時</p>
              <p className="text-sm font-medium">
                {new Date(run.startedAt).toLocaleString("ja-JP")}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">終了日時</p>
              <p className="text-sm font-medium">
                {run.finishedAt
                  ? new Date(run.finishedAt).toLocaleString("ja-JP")
                  : "実行中"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">処理時間</p>
              <p className="text-sm font-medium">
                {run.finishedAt
                  ? `${Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}秒`
                  : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">実行結果</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">処理総数</p>
              <p className="text-3xl font-bold text-gray-900">
                {run.stats.total}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">公開</p>
              <p className="text-3xl font-bold text-green-700">
                {run.stats.published}
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-600">保留</p>
              <p className="text-3xl font-bold text-yellow-700">
                {run.stats.hold}
              </p>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-600">失敗</p>
              <p className="text-3xl font-bold text-red-700">
                {run.stats.failed}
              </p>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">実行ログ</h2>

          <pre className="bg-gray-900 text-green-400 p-4 rounded-md overflow-x-auto text-xs font-mono whitespace-pre-wrap max-h-[600px]">
            {run.logs || "ログがありません"}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <a
            href="/admin/pipeline"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← パイプライン一覧に戻る
          </a>
          <a
            href="/news"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            → 公開記事一覧を見る
          </a>
        </div>
      </div>
    </div>
  );
}
