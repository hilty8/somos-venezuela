/**
 * LLM Client - Unified interface for OpenAI, Anthropic, Groq
 */

const LLM_PROVIDER = process.env.LLM_PROVIDER || "openai";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || "30000", 10);
const LLM_MAX_RETRIES = parseInt(process.env.LLM_MAX_RETRIES || "3", 10);

export type LLMTask =
  | "SUMMARIZE"
  | "DRAFT"
  | "CLASSIFY"
  | "REVIEW"
  | "REWRITE";

interface LLMConfig {
  model: string;
  temperature: number;
}

const getConfig = (task: LLMTask): LLMConfig => {
  const taskLower = task.toLowerCase();
  return {
    model: process.env[`LLM_MODEL_${task}`] || "gpt-4o-mini",
    temperature: parseFloat(
      process.env[`LLM_TEMPERATURE_${task}`] || "0.5"
    ),
  };
};

interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Call LLM with unified interface
 */
export async function callLLM(
  task: LLMTask,
  prompt: string,
  systemPrompt?: string
): Promise<LLMResponse> {
  const config = getConfig(task);

  // Retry logic
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= LLM_MAX_RETRIES; attempt++) {
    try {
      if (LLM_PROVIDER === "openai") {
        return await callOpenAI(prompt, systemPrompt, config);
      } else if (LLM_PROVIDER === "anthropic") {
        return await callAnthropic(prompt, systemPrompt, config);
      } else if (LLM_PROVIDER === "groq") {
        return await callGroq(prompt, systemPrompt, config);
      } else {
        throw new Error(`Unsupported LLM provider: ${LLM_PROVIDER}`);
      }
    } catch (error) {
      lastError = error as Error;
      if (attempt < LLM_MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `LLM call failed after ${LLM_MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

async function callOpenAI(
  prompt: string,
  systemPrompt: string | undefined,
  config: LLMConfig
): Promise<LLMResponse> {
  const messages: any[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

async function callAnthropic(
  prompt: string,
  systemPrompt: string | undefined,
  config: LLMConfig
): Promise<LLMResponse> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      temperature: config.temperature,
      system: systemPrompt || undefined,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    content: data.content[0].text,
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens:
        (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
  };
}

async function callGroq(
  prompt: string,
  systemPrompt: string | undefined,
  config: LLMConfig
): Promise<LLMResponse> {
  const messages: any[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}
