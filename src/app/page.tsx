import { db } from "@/lib/db";

async function getKGI() {
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

  return { totalAmount, lastUpdate };
}

export default async function Home() {
  const { totalAmount, lastUpdate } = await getKGI();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Somos Venezuela</h1>
        <p className="text-xl mb-6">
          あなたの関心が、ベネズエラへの架け橋になります。
        </p>

        {/* KGI Display */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            KGI（累計寄付金額）
          </h2>
          <p className="text-5xl font-bold text-blue-600 mb-2">
            ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {lastUpdate && (
            <p className="text-sm text-gray-500">
              最終更新: {new Date(lastUpdate).toLocaleString("ja-JP")}
            </p>
          )}
          {totalAmount === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              まだ寄付キャンペーンが登録されていません
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">寄付する</h2>
            <p className="text-gray-600 mb-4">
              信頼できる外部キャンペーンを通じて支援できます
            </p>
            <a
              href="/donations"
              className="text-blue-600 hover:underline"
            >
              キャンペーン一覧 →
            </a>
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">最新記事</h2>
            <p className="text-gray-600 mb-4">
              ベネズエラの状況を30秒で理解できます
            </p>
            <a
              href="/articles"
              className="text-blue-600 hover:underline"
            >
              記事一覧 →
            </a>
          </div>
        </div>

        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">このプロジェクトについて</h2>
          <p className="text-gray-600 mb-2">
            Somos Venezuelaは、ベネズエラの復興を世界中のチームで支えるためのオープンソース寄付プラットフォームです。
          </p>
          <p className="text-gray-600">
            私たちは集金せず、信頼できる外部団体への寄付を促進し、その金額（KGI）を可視化します。
          </p>
          <a
            href="/policy"
            className="text-blue-600 hover:underline mt-4 inline-block"
          >
            フィロソフィー・方針 →
          </a>
        </div>
      </div>
    </main>
  );
}
