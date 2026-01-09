"use client";

import { useEffect, useState } from "react";

interface Source {
  id: string;
  name: string;
  isActive: boolean;
}

interface PipelineRun {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  stats: {
    total: number;
    published: number;
    hold: number;
    failed: number;
  };
}

export default function PipelinePage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [limit, setLimit] = useState<number>(10);
  const [logs, setLogs] = useState<string>("");

  useEffect(() => {
    fetchSources();
    fetchRuns();
  }, []);

  async function fetchSources() {
    try {
      const response = await fetch("/api/admin/sources");
      const data = await response.json();
      setSources(data.filter((s: Source) => s.isActive));
    } catch (error) {
      console.error("Error fetching sources:", error);
    }
  }

  async function fetchRuns() {
    try {
      const response = await fetch("/api/admin/pipeline/runs?limit=10");
      const data = await response.json();
      setRuns(data.runs || []);
    } catch (error) {
      console.error("Error fetching runs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRun() {
    if (
      !confirm(
        `パイプラインを実行しますか？\nSource: ${selectedSourceId || "全て"}\nLimit: ${limit}`
      )
    ) {
      return;
    }

    setRunning(true);
    setLogs("パイプライン実行中...\n");

    try {
      const response = await fetch("/api/admin/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: selectedSourceId || undefined,
          limit,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const logsText = data.logs
          .map(
            (log: any) =>
              `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level.toUpperCase()}] ${log.message}`
          )
          .join("\n");

        setLogs(
          `パイプライン完了 (Run ID: ${data.runId})\n\n` +
            `【結果】\n` +
            `- 処理数: ${data.stats.total}\n` +
            `- 公開: ${data.stats.published}\n` +
            `- 保留: ${data.stats.hold}\n` +
            `- 失敗: ${data.stats.failed}\n\n` +
            `【ログ】\n${logsText}`
        );

        // Refresh runs list
        fetchRuns();
      } else {
        setLogs(`エラー: ${data.error}\n${data.message || ""}`);
      }
    } catch (error) {
      console.error("Pipeline run error:", error);
      setLogs(`エラー: ${(error as Error).message}`);
    } finally {
      setRunning(false);
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            記事生成パイプライン (G0: 手動実行)
          </h1>
          <p className="text-gray-600">
            raw_items → 記事生成 → 分類 → レビュー → リライト → 公開/保留
          </p>
        </div>

        {/* Execution Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">パイプライン実行</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ソース (オプション)
              </label>
              <select
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={running}
              >
                <option value="">全てのソース</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                処理件数
              </label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
                min="1"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={running}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleRun}
                disabled={running}
                className={`w-full px-4 py-2 text-white rounded-md ${
                  running
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {running ? "実行中..." : "実行"}
              </button>
            </div>
          </div>

          {logs && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                実行ログ
              </h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-md overflow-x-auto text-xs font-mono whitespace-pre-wrap max-h-96">
                {logs}
              </pre>
            </div>
          )}
        </div>

        {/* Recent Runs */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">実行履歴</h2>

            {runs.length === 0 ? (
              <p className="text-gray-500">実行履歴はありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Run ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ステータス
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        開始日時
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        結果
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        アクション
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {runs.map((run) => (
                      <tr key={run.id}>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">
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
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(run.startedAt).toLocaleString("ja-JP")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {run.stats ? (
                            <div className="text-xs">
                              <span className="text-green-600">
                                公開: {run.stats.published}
                              </span>
                              {" / "}
                              <span className="text-yellow-600">
                                保留: {run.stats.hold}
                              </span>
                              {" / "}
                              <span className="text-red-600">
                                失敗: {run.stats.failed}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <a
                            href={`/admin/pipeline/runs/${run.id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            詳細
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Links */}
        <div className="mt-8 flex gap-4">
          <a
            href="/news"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            → 公開記事一覧を見る (/news)
          </a>
          <a
            href="/admin/dashboard"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← ダッシュボードに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
