import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

async function getDashboardStats() {
  // KGI
  const campaigns = await db.donationCampaign.findMany({
    where: { isActive: true },
    include: {
      snapshots: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
      },
    },
  });

  let totalAmount = 0;
  let lastUpdate: Date | null = null;

  for (const campaign of campaigns) {
    if (campaign.snapshots.length > 0) {
      const snapshot = campaign.snapshots[0];
      totalAmount += Number(snapshot.amount);

      if (!lastUpdate || snapshot.fetchedAt > lastUpdate) {
        lastUpdate = snapshot.fetchedAt;
      }
    }
  }

  // Campaign count
  const campaignCount = campaigns.length;

  // Click count (last 24 hours)
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);

  const clickCount = await db.clickEvent.count({
    where: {
      clickedAt: {
        gte: yesterday,
      },
    },
  });

  // Article count (published)
  const articleCount = await db.article.count({
    where: { status: "PUBLISHED" },
  });

  return {
    kgi: totalAmount,
    lastUpdate,
    campaignCount,
    clickCount,
    articleCount,
  };
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  const stats = await getDashboardStats();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Somos Venezuela - 管理画面</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{session.user?.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/admin/login" });
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* KGI Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">KGI（累計寄付金額）</h2>
            <p className="text-3xl font-bold text-blue-600">
              ${stats.kgi.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {stats.lastUpdate
                ? `最終更新: ${stats.lastUpdate.toLocaleString("ja-JP")}`
                : "最終更新: -"}
            </p>
            <p className="text-xs text-gray-400 mt-1">直近24h クリック: {stats.clickCount}</p>
          </div>

          {/* Campaigns Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">寄付キャンペーン</h2>
            <p className="text-3xl font-bold text-green-600">{stats.campaignCount}</p>
            <p className="text-sm text-gray-500 mt-2">登録済み</p>
            <a href="/admin/campaigns" className="text-sm text-blue-600 hover:underline mt-4 inline-block">
              管理 →
            </a>
          </div>

          {/* Articles Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">記事</h2>
            <p className="text-3xl font-bold text-purple-600">{stats.articleCount}</p>
            <p className="text-sm text-gray-500 mt-2">公開中</p>
            <a href="/admin/articles" className="text-sm text-blue-600 hover:underline mt-4 inline-block">
              管理 →
            </a>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">最近のバッチ実行</h2>
          <p className="text-gray-500">バッチ実行履歴はまだありません</p>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">クイックリンク</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/admin/campaigns" className="p-4 border rounded hover:bg-gray-50 text-center">
              <div className="font-medium">寄付キャンペーン</div>
              <div className="text-sm text-gray-500">CRUD</div>
            </a>
            <a href="/admin/sources" className="p-4 border rounded hover:bg-gray-50 text-center">
              <div className="font-medium">情報源</div>
              <div className="text-sm text-gray-500">ホワイトリスト</div>
            </a>
            <a href="/admin/articles" className="p-4 border rounded hover:bg-gray-50 text-center">
              <div className="font-medium">記事</div>
              <div className="text-sm text-gray-500">管理</div>
            </a>
            <a href="/admin/templates" className="p-4 border rounded hover:bg-gray-50 text-center">
              <div className="font-medium">テンプレート</div>
              <div className="text-sm text-gray-500">版管理</div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
