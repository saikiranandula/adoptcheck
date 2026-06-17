import type { LLMAnalysis, RepoReport } from "./types";

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

const defaultModel = "openai/gpt-4o-mini";

export async function generateLLMAnalysis(report: RepoReport): Promise<LLMAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { status: "not_configured" };
  }

  const model = process.env.OPENROUTER_MODEL || defaultModel;
  const generatedAt = new Date().toISOString();

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://adoptcheck.nullhype.tech",
        "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME || "AdoptCheck"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are the optional AdoptCheck analyst layer. The deterministic scanner is the source of truth. Do not change the verdict, confidence, scores, or risks. Interpret only the provided structured report. Every substantive claim must be grounded in the supplied evidence IDs. Keep the language concise, practical, and adoption-focused."
          },
          {
            role: "user",
            content: JSON.stringify(buildLLMPayload(report))
          }
        ],
        max_completion_tokens: 900,
        temperature: 0.2,
        provider: {
          require_parameters: true
        },
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "adoptcheck_llm_analysis",
            strict: true,
            schema: analysisSchema
          }
        }
      })
    });

    const body = (await response.json()) as OpenRouterResponse;
    if (!response.ok) {
      return {
        status: "failed",
        model,
        generatedAt,
        error: body.error?.message ?? `OpenRouter returned ${response.status}`
      };
    }

    const parsed = parseAnalysis(extractOutputText(body));
    return {
      status: "generated",
      model,
      generatedAt,
      ...parsed,
      evidenceIds: filterEvidenceIds(parsed.evidenceIds, report)
    };
  } catch (error) {
    return {
      status: "failed",
      model,
      generatedAt,
      error: error instanceof Error ? error.message : "Unknown LLM analysis error"
    };
  }
}

function buildLLMPayload(report: RepoReport) {
  return {
    repo: {
      fullName: report.repo.fullName,
      description: report.repo.description,
      language: report.repo.language,
      topics: report.repo.topics,
      stars: report.repo.stars,
      forks: report.repo.forks,
      openIssues: report.repo.openIssues,
      archived: report.repo.archived,
      pushedAt: report.repo.pushedAt,
      license: report.repo.license?.name ?? null
    },
    deterministicVerdict: report.verdict,
    confidence: report.confidence,
    deterministicBottomLine: report.bottomLine,
    deterministicRecommendedAction: report.recommendedAction,
    deterministicNullhypeAngle: report.nullhypeAngle,
    scores: report.scores.map((score) => ({
      category: score.category,
      name: score.name,
      score: score.score,
      label: score.label,
      evidenceIds: score.evidenceIds
    })),
    risks: report.risks,
    evidence: report.evidence.map((item) => ({
      id: item.id,
      type: item.type,
      source: item.source,
      claim: item.claim,
      confidence: item.confidence
    }))
  };
}

function extractOutputText(body: OpenRouterResponse) {
  const text = body.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("OpenRouter response did not include message content.");
  }

  return text;
}

function parseAnalysis(text: string): Omit<LLMAnalysis, "status" | "model" | "generatedAt" | "error"> {
  const parsed = JSON.parse(text) as Omit<LLMAnalysis, "status" | "model" | "generatedAt" | "error">;

  return {
    summary: limitText(parsed.summary, 700),
    readmeHonesty: limitText(parsed.readmeHonesty, 520),
    adoptionRisks: (parsed.adoptionRisks ?? []).slice(0, 4).map((risk) => limitRequiredText(risk, 240)),
    nextAction: limitText(parsed.nextAction, 360),
    nullhypeAngle: limitText(parsed.nullhypeAngle, 420),
    evidenceIds: parsed.evidenceIds ?? []
  };
}

function filterEvidenceIds(ids: string[] | undefined, report: RepoReport) {
  const valid = new Set(report.evidence.map((item) => item.id));
  return [...new Set((ids ?? []).filter((id) => valid.has(id)))].slice(0, 10);
}

function limitText(value: string | undefined, maxLength: number) {
  if (!value) {
    return undefined;
  }

  return limitRequiredText(value, maxLength);
}

function limitRequiredText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      description: "A concise bottom-line interpretation grounded in evidence IDs. Do not override the deterministic verdict."
    },
    readmeHonesty: {
      type: "string",
      description: "Whether README claims appear supported, weak, or incomplete based only on supplied evidence."
    },
    adoptionRisks: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "string"
      }
    },
    nextAction: {
      type: "string",
      description: "The practical next step for a builder considering adoption."
    },
    nullhypeAngle: {
      type: "string",
      description: "A market or workflow implication in a calm Nullhype-style voice."
    },
    evidenceIds: {
      type: "array",
      minItems: 3,
      maxItems: 10,
      items: {
        type: "string"
      }
    }
  },
  required: ["summary", "readmeHonesty", "adoptionRisks", "nextAction", "nullhypeAngle", "evidenceIds"]
};
