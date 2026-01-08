"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PromptGroup {
  type: string;
  name: string;
  activeVersion: any | null;
  totalVersions: number;
  latestUpdate: string;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Record<string, Record<string, PromptGroup>>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncOutput, setSyncOutput] = useState("");

  useEffect(() => {
    fetchPrompts();
  }, []);

  async function fetchPrompts() {
    try {
      const response = await fetch("/api/admin/prompts");
      const data = await response.json();
      setPrompts(data);
    } catch (error) {
      console.error("Error fetching prompts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncOutput("");

    try {
      const response = await fetch("/api/admin/prompts/sync", {
        method: "POST",
      });
      const result = await response.json();

      if (result.success) {
        setSyncOutput(result.output);
        alert("同期が完了しました");
        fetchPrompts();
      } else {
        alert(`同期に失敗しました: ${result.error}`);
        setSyncOutput(result.errors || result.error);
      }
    } catch (error) {
      console.error("Error syncing prompts:", error);
      alert("同期中にエラーが発生しました");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-900 mr-4">
                ← ダッシュボード
              </Link>
              <h1 className="text-xl font-bold">プロンプト管理（Prompt as Code）</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex gap-4">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {syncing ? "同期中..." : "📁 prompts/ から同期"}
          </button>
          <Link
            href="/admin/templates"
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 inline-block"
          >
            テンプレート管理 →
          </Link>
        </div>

        {syncOutput && (
          <div className="mb-6 bg-gray-800 text-green-400 p-4 rounded font-mono text-sm whitespace-pre-wrap">
            {syncOutput}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-2">Prompt as Code について</h2>
          <p className="text-sm text-gray-600 mb-2">
            プロンプトの正本は <code className="bg-gray-100 px-1">prompts/</code>{" "}
            ディレクトリ内のMarkdownファイルです。
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside">
            <li>
              変更方法: PRで <code className="bg-gray-100 px-1">prompts/*.md</code>{" "}
              を編集 → 「同期」ボタンでDBに反映
            </li>
            <li>
              Active切替: 複数バージョンがある場合、下のリストから「Active切替」で運用バージョンを変更
            </li>
            <li>Rollback: 過去バージョンをActiveにすることで実現</li>
          </ul>
        </div>

        {Object.keys(prompts).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            プロンプトがまだ登録されていません。「同期」ボタンで prompts/ から読み込んでください。
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(prompts).map(([type, group]) => (
              <div key={type} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b">
                  <h3 className="font-bold">{type}</h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        名前
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Active Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total Versions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        最終更新
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(group).map(([name, prompt]) => (
                      <tr key={name}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{prompt.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {prompt.activeVersion ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                              {prompt.activeVersion.version}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">なし</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {prompt.activeVersion?.sourceType === "FILE" ? "📁 File" : "👤 Admin"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {prompt.totalVersions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(prompt.latestUpdate).toLocaleString("ja-JP")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/admin/prompts/${prompt.name}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            詳細 →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
