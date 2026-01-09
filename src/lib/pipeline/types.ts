/**
 * Pipeline Types
 */

export interface RawItemData {
  id: string;
  sourceId: string;
  url: string;
  title: string | null;
  content: string | null;
  publishedAt: Date | null;
}

export interface ArticleBlockData {
  type: "FACT" | "INFERENCE" | "UNVERIFIED";
  content: string;
  evidenceUrls: string[];
  order: number;
}

export interface GeneratedArticle {
  title: string;
  summary: string;
  blocks: ArticleBlockData[];
}

export interface ClassificationResult {
  category: string;
  confidence: number; // 0.0 - 1.0
  reasoning?: string;
}

export interface ReviewScores {
  evidence: number; // 0-100
  neutrality: number; // 0-100
  overclaim: number; // 0-100
  dignity: number; // 0-100
  scope: number; // 0-100
}

export interface ReviewResult {
  passed: boolean;
  scoreTotal: number; // 0-100 average
  scoresByCategory: ReviewScores;
  feedback: string;
  hardFailReasons: string[];
  suggestions: string[];
}

export interface PipelineRunStats {
  total: number;
  published: number;
  hold: number;
  failed: number;
  llm_calls?: number; // Total LLM API calls made during pipeline execution
  duration_ms?: number; // Duration of pipeline execution in milliseconds
}

export interface PipelineLog {
  timestamp: Date;
  level: "info" | "warn" | "error";
  message: string;
  rawItemId?: string;
  articleId?: string;
}
