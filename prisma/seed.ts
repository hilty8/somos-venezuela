import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.adminUser.upsert({
    where: { email: "admin@somos-venezuela.org" },
    update: {},
    create: {
      email: "admin@somos-venezuela.org",
      password: hashedPassword,
      name: "Admin User",
    },
  });

  console.log("✅ Created admin user:", admin.email);

  // Create initial template version (daily_v1)
  const template = await prisma.templateVersion.upsert({
    where: { id: "daily_v1" },
    update: {},
    create: {
      id: "daily_v1",
      name: "daily_v1",
      isActive: true,
      content: {
        template_id: "daily_v1",
        sections: [
          {
            section_id: "headline_3points",
            title: "今日わかったこと（3点）",
            prompt_hint: "30秒で理解できる要点を3つ。政治評価語は禁止。Fact/推測/未確認を明示。",
            required: true,
          },
          {
            section_id: "impact_life",
            title: "生活への影響（事実中心）",
            prompt_hint: "医療/食料/教育/移動など生活項目で整理。Factには出典必須。",
            required: true,
          },
          {
            section_id: "numbers",
            title: "数字で見る（時点つき）",
            prompt_hint: "数字は時点/対象期間/単位/出典URLをセットで提示。",
            required: false,
          },
          {
            section_id: "unknowns",
            title: "未確認・わからないこと",
            prompt_hint: "推測で埋めず、Unverifiedとして理由を添える。",
            required: true,
          },
          {
            section_id: "donate",
            title: "支援する（寄付）",
            prompt_hint: "目的別に寄付キャンペーンを提示。過剰な煽りは禁止。",
            required: true,
          },
        ],
      },
    },
  });

  console.log("✅ Created template version:", template.name);

  // Create initial prompt versions (placeholders)
  const prompts = [
    {
      type: "REVIEW" as const,
      name: "review_v1",
      content: `You are a content reviewer for Somos Venezuela.
Review the article for:
- Evidence: Facts must have sources
- Neutrality: No political opinions or judgmental language
- Overclaim: No exaggeration or unsupported conclusions
- Dignity: No discrimination, contempt, or excessive tragic descriptions
- Scope: Avoid topics like diplomacy, sanctions, or regime evaluation

Return JSON with:
{
  "passed": boolean,
  "score": {
    "evidence": 0-10,
    "neutrality": 0-10,
    "overclaim": 0-10,
    "dignity": 0-10,
    "scope": 0-10
  },
  "feedback": "Detailed feedback"
}`,
    },
  ];

  for (const prompt of prompts) {
    const created = await prisma.promptVersion.upsert({
      where: { id: `${prompt.name}_seed` },
      update: {},
      create: {
        id: `${prompt.name}_seed`,
        type: prompt.type,
        name: prompt.name,
        content: prompt.content,
        isActive: true,
      },
    });
    console.log("✅ Created prompt version:", created.name);
  }

  console.log("🎉 Seed complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
