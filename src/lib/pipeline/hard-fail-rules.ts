/**
 * Hard Fail Rules - PHILOSOPHY compliance checks
 *
 * These rules enforce strict neutrality and dignity requirements.
 * Any violation results in immediate failure.
 */

export interface HardFailCheck {
  passed: boolean;
  reasons: string[];
}

/**
 * Political evaluation keywords (Japanese)
 * Words that imply political judgment or condemnation
 */
const POLITICAL_EVALUATION_PATTERNS = [
  /独裁/,
  /圧政/,
  /抑圧/,
  /弾圧/,
  /腐敗/,
  /暴君/,
  /専制/,
  /悪政/,
  /暴政/,
  /圧制/,
];

/**
 * Condemnation keywords (Japanese)
 * Words that condemn or harshly judge
 */
const CONDEMNATION_PATTERNS = [
  /非難すべき/,
  /許されない/,
  /糾弾/,
  /断罪/,
  /批判すべき/,
  /責めるべき/,
  /罪深い/,
  /悪質/,
];

/**
 * Incitement keywords (Japanese)
 * Words that incite or agitate
 */
const INCITEMENT_PATTERNS = [
  /戦うべき/,
  /立ち上がるべき/,
  /打倒/,
  /革命/,
  /蜂起/,
  /闘争/,
  /抵抗すべき/,
  /反旗/,
];

/**
 * Emotional/subjective language that should be avoided
 */
const SUBJECTIVE_PATTERNS = [
  /悲劇的な/,
  /恐ろしい/,
  /ひどい/,
  /酷い/,
  /残虐な/,
  /衝撃的な/,
  /悲惨な/,
];

/**
 * Check article content against Hard Fail rules
 */
export function checkHardFailRules(
  title: string,
  blocks: Array<{ content: string }>
): HardFailCheck {
  const fullText = [title, ...blocks.map((b) => b.content)].join("\n");
  const reasons: string[] = [];

  // Check for political evaluation
  for (const pattern of POLITICAL_EVALUATION_PATTERNS) {
    if (pattern.test(fullText)) {
      const match = fullText.match(pattern)?.[0];
      reasons.push(
        `政治的評価語を含む: "${match}" (PHILOSOPHY: 評価・判断を避ける)`
      );
    }
  }

  // Check for condemnation
  for (const pattern of CONDEMNATION_PATTERNS) {
    if (pattern.test(fullText)) {
      const match = fullText.match(pattern)?.[0];
      reasons.push(
        `断罪表現を含む: "${match}" (PHILOSOPHY: 断罪・糾弾を避ける)`
      );
    }
  }

  // Check for incitement
  for (const pattern of INCITEMENT_PATTERNS) {
    if (pattern.test(fullText)) {
      const match = fullText.match(pattern)?.[0];
      reasons.push(
        `煽動表現を含む: "${match}" (PHILOSOPHY: 煽動・行動要求を避ける)`
      );
    }
  }

  // Check for overly subjective/emotional language
  let subjectiveCount = 0;
  for (const pattern of SUBJECTIVE_PATTERNS) {
    if (pattern.test(fullText)) {
      subjectiveCount++;
    }
  }

  if (subjectiveCount >= 3) {
    reasons.push(
      `過度な主観的表現 (${subjectiveCount}箇所検出) - 中立性を保つこと`
    );
  }

  // Check title for clickbait patterns
  const clickbaitPatterns = [/！{2,}/, /衝撃/, /驚愕/, /必見/, /緊急/];
  for (const pattern of clickbaitPatterns) {
    if (pattern.test(title)) {
      const match = title.match(pattern)?.[0];
      reasons.push(
        `タイトルに煽情的表現: "${match}" (クリックベイト回避)`
      );
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

/**
 * Check if FACT blocks have required evidence URLs
 */
export function checkFactEvidence(
  blocks: Array<{ type: string; evidenceUrls?: string[] }>
): HardFailCheck {
  const reasons: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === "FACT") {
      if (!block.evidenceUrls || block.evidenceUrls.length === 0) {
        reasons.push(
          `FACT block #${i + 1} has no evidence URLs (required for FACT blocks)`
        );
      }
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}
