"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";

export default function TemplateDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);

  useEffect(() => {
    fetchTemplateVersions();
  }, [name]);

  async function fetchTemplateVersions() {
    try {
      const response = await fetch(`/api/admin/templates/${encodeURIComponent(name)}`);
      const result = await response.json();
      setData(result);
      if (result.versions && result.versions.length > 0) {
        setSelectedVersion(result.versions[0]);
      }
    } catch (error) {
      console.error("Error fetching template versions:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(versionId: string) {
    if (!confirm("このバージョンをActiveにしますか？")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/templates/${encodeURIComponent(name)}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });

      if (response.ok) {
        alert("Activeバージョンを更新しました");
        fetchTemplateVersions();
      } else {
        alert("更新に失敗しました");
      }
    } catch (error) {
      console.error("Error activating version:", error);
      alert("エラーが発生しました");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <p>テンプレートが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin/templates" className="text-gray-600 hover:text-gray-900 mr-4">
                ← テンプレート一覧
              </Link>
              <h1 className="text-xl font-bold">{data.name}</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Version List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">バージョン一覧</h2>
              <div className="space-y-2">
                {data.versions.map((version: any) => (
                  <div
                    key={version.id}
                    onClick={() => setSelectedVersion(version)}
                    className={`p-3 border rounded cursor-pointer ${
                      selectedVersion?.id === version.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{version.version}</span>
                      {version.isActive && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {version.sourceType === "FILE" ? "📁 File" : "👤 Admin"}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(version.createdAt).toLocaleString("ja-JP")}
                    </div>
                    {!version.isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivate(version.id);
                        }}
                        className="mt-2 w-full text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Activeにする
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Version Content */}
          <div className="lg:col-span-2">
            {selectedVersion && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">
                    {selectedVersion.version}
                    {selectedVersion.isActive && (
                      <span className="ml-2 px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {selectedVersion.sourceType === "FILE" ? "📁 File" : "👤 Admin"}
                  </span>
                </div>

                {selectedVersion.description && (
                  <p className="text-sm text-gray-600 mb-4">{selectedVersion.description}</p>
                )}

                {selectedVersion.filePath && (
                  <div className="mb-4 text-sm">
                    <span className="text-gray-500">ファイルパス: </span>
                    <code className="bg-gray-100 px-2 py-1 rounded">{selectedVersion.filePath}</code>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">テンプレート内容 (JSON):</h3>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                    <pre className="text-sm">{JSON.stringify(selectedVersion.content, null, 2)}</pre>
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  <p>作成日時: {new Date(selectedVersion.createdAt).toLocaleString("ja-JP")}</p>
                  {selectedVersion.createdByAdmin && (
                    <p>作成者: {selectedVersion.createdByAdmin.name || selectedVersion.createdByAdmin.email}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
