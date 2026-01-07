"use client";

import { useEffect, useState } from "react";

interface Campaign {
  id: string;
  name: string;
  category: string;
  provider: string;
  isActive: boolean;
  lastFetchAt: string | null;
  lastError: string | null;
  errorCount: number;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const response = await fetch("/api/admin/campaigns");
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  }

  async function testFetch(id: string) {
    try {
      const response = await fetch(`/api/admin/campaigns/${id}/check`, {
        method: "POST",
      });
      const result = await response.json();

      if (result.success) {
        alert(`成功！\n金額: ${result.amount} ${result.currency}\n生データ: ${result.rawValue}`);
        fetchCampaigns();
      } else {
        alert(`失敗\nエラー: ${result.error}\n生データ: ${result.rawValue || "なし"}`);
      }
    } catch (error) {
      alert("エラーが発生しました");
      console.error(error);
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
              <a href="/admin/dashboard" className="text-gray-600 hover:text-gray-900 mr-4">
                ← ダッシュボード
              </a>
              <h1 className="text-xl font-bold">寄付キャンペーン管理</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <a
            href="/admin/campaigns/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + 新規キャンペーン
          </a>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            キャンペーンがまだ登録されていません
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名前
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    カテゴリ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    提供元
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最終取得
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {campaign.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{campaign.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{campaign.provider}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {campaign.isActive ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          有効
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          無効
                        </span>
                      )}
                      {campaign.errorCount > 0 && (
                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          エラー {campaign.errorCount}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.lastFetchAt
                        ? new Date(campaign.lastFetchAt).toLocaleString("ja-JP")
                        : "-"}
                      {campaign.lastError && (
                        <div className="text-xs text-red-600 mt-1">
                          {campaign.lastError}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => testFetch(campaign.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        テスト
                      </button>
                      <a
                        href={`/admin/campaigns/${campaign.id}`}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        編集
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
