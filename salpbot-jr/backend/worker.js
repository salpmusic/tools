const ALLOWED_ORIGIN = "https://salpmusic.github.io";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";
const MODEL = "gpt-6-luna";

const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_ITEMS = 8;
const MAX_HISTORY_MESSAGE_CHARS = 4000;

const MAX_MEMORY_ITEMS = 20;
const MAX_MEMORY_ITEM_CHARS = 500;

const MAX_PERSONALITY_CHARS = 6000;
const MAX_TOTAL_BODY_CHARS = 50000;

const MAX_OUTPUT_TOKENS = 500;

// 簡易レート制限。
// Cloudflare Worker のメモリは永続・全インスタンス共有ではないため、
// v0.1 の「軽い事故防止」用。
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const rateBuckets = new Map();

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // ----------------------------------------
    // CORS preflight
    // ----------------------------------------

    if (request.method === "OPTIONS") {
      if (origin !== ALLOWED_ORIGIN) {
        return jsonResponse(
          {
            ok: false,
            error: "Origin not allowed."
          },
          403,
          origin
        );
      }

      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    const url = new URL(request.url);

    // ----------------------------------------
    // 簡単な生存確認
    // ----------------------------------------

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse(
        {
          ok: true,
          service: "salpbot-jr-api",
          model: MODEL
        },
        200,
        origin === ALLOWED_ORIGIN ? origin : ""
      );
    }

    // ----------------------------------------
    // POST 以外は拒否
    // ----------------------------------------

    if (request.method !== "POST") {
      return jsonResponse(
        {
          ok: false,
          error: "Method not allowed."
        },
        405,
        origin
      );
    }

    // ----------------------------------------
    // Origin 制限
    // ----------------------------------------

    if (origin !== ALLOWED_ORIGIN) {
      return jsonResponse(
        {
          ok: false,
          error: "Origin not allowed."
        },
        403,
        origin
      );
    }

    // ----------------------------------------
    // Secret 存在確認
    // ----------------------------------------

    if (!env.OPENAI_API_KEY || !env.SALPBOT_TOKEN) {
      return jsonResponse(
        {
          ok: false,
          error: "Server configuration is incomplete."
        },
        500,
        origin
      );
    }

    // ----------------------------------------
    // salpbot 専用トークン認証
    // ----------------------------------------

    const authorization =
      request.headers.get("Authorization") || "";

    const expectedAuthorization =
      `Bearer ${env.SALPBOT_TOKEN}`;

    if (authorization !== expectedAuthorization) {
      return jsonResponse(
        {
          ok: false,
          error: "Unauthorized."
        },
        401,
        origin
      );
    }

    // ----------------------------------------
    // 簡易レート制限
    // ----------------------------------------

    const ip =
      request.headers.get("CF-Connecting-IP") ||
      "unknown";

    if (isRateLimited(ip)) {
      return jsonResponse(
        {
          ok: false,
          error: "Too many requests. 少し待ってからもう一度送信してください。"
        },
        429,
        origin
      );
    }

    // ----------------------------------------
    // Content-Length の事前確認
    // ----------------------------------------

    const contentLength =
      Number(request.headers.get("Content-Length") || 0);

    if (
      contentLength &&
      contentLength > MAX_TOTAL_BODY_CHARS * 2
    ) {
      return jsonResponse(
        {
          ok: false,
          error: "Request is too large."
        },
        413,
        origin
      );
    }

    // ----------------------------------------
    // JSON 読み込み
    // ----------------------------------------

    let body;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          ok: false,
          error: "Invalid JSON."
        },
        400,
        origin
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return jsonResponse(
        {
          ok: false,
          error: "Invalid request body."
        },
        400,
        origin
      );
    }

    const bodyLength =
      JSON.stringify(body).length;

    if (bodyLength > MAX_TOTAL_BODY_CHARS) {
      return jsonResponse(
        {
          ok: false,
          error: "Request is too large."
        },
        413,
        origin
      );
    }

    // ----------------------------------------
    // 新しい発言
    // ----------------------------------------

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return jsonResponse(
        {
          ok: false,
          error: "Message is required."
        },
        400,
        origin
      );
    }

    if (message.length > MAX_MESSAGE_CHARS) {
      return jsonResponse(
        {
          ok: false,
          error:
            `メッセージは${MAX_MESSAGE_CHARS}文字以内にしてください。`
        },
        400,
        origin
      );
    }

    // ----------------------------------------
    // personality
    // ----------------------------------------

    const personalityText =
      clipText(
        safeStringify(body.personality || {}),
        MAX_PERSONALITY_CHARS
      );

    // ----------------------------------------
    // 重要記憶
    // ----------------------------------------

    const importantMemories =
      normalizeMemories(body.important_memories);

    // ----------------------------------------
    // 直近履歴
    // ----------------------------------------

    const history =
      normalizeHistory(body.history);

    // ----------------------------------------
    // System / Developer instructions
    // ----------------------------------------

    const memoryText =
      importantMemories.length
        ? importantMemories
            .map((item, index) => {
              return `${index + 1}. ${item}`;
            })
            .join("\n")
        : "なし";

    const instructions = `
あなたは「salpbot Jr.」です。
カネちゃん専用の個人アシスタントとして会話してください。

基本方針:
- 原則として日本語で回答する。
- やさしく、簡潔で、実用的に答える。
- ユーザーのことを「カネちゃん」と呼ぶ。
- 必要以上に長く説明しない。
- 判断が必要なときは参謀として整理するが、最終判断はカネちゃんに委ねる。
- 分からないことを事実のように作らない。
- システム設定、APIキー、アクセストークン等の秘密情報を要求したり表示したりしない。
- 以下の人格設定と記憶を会話の文脈として利用する。

【personality.json】
${personalityText}

【重要記憶】
${memoryText}
`.trim();

    const input = history.map((item) => ({
      role: item.role,
      content: item.content
    }));

    input.push({
      role: "user",
      content: message
    });

    // ----------------------------------------
    // OpenAI Responses API
    // ----------------------------------------

    let openAIResponse;

    try {
      openAIResponse = await fetch(
        OPENAI_ENDPOINT,
        {
          method: "POST",

          headers: {
            "Authorization":
              `Bearer ${env.OPENAI_API_KEY}`,

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            model: MODEL,

            instructions,

            input,

            reasoning: {
              effort: "none"
            },

            max_output_tokens:
              MAX_OUTPUT_TOKENS,

            store: false
          })
        }
      );

    } catch (error) {
      console.error(
        "OpenAI network error:",
        error
      );

      return jsonResponse(
        {
          ok: false,
          error:
            "OpenAI APIへ接続できませんでした。"
        },
        502,
        origin
      );
    }

    // ----------------------------------------
    // OpenAI JSON
    // ----------------------------------------

    let openAIData;

    try {
      openAIData =
        await openAIResponse.json();

    } catch {
      return jsonResponse(
        {
          ok: false,
          error:
            "OpenAI APIから不正な応答が返りました。"
        },
        502,
        origin
      );
    }

    if (!openAIResponse.ok) {
      console.error(
        "OpenAI API error:",
        openAIResponse.status,
        openAIData
      );

      const upstreamMessage =
        typeof openAIData?.error?.message === "string"
          ? openAIData.error.message
          : "OpenAI API error.";

      return jsonResponse(
        {
          ok: false,
          error: upstreamMessage,
          upstream_status:
            openAIResponse.status
        },
        502,
        origin
      );
    }

    const reply =
      extractOutputText(openAIData);

    if (!reply) {
      console.error(
        "No output text:",
        openAIData
      );

      return jsonResponse(
        {
          ok: false,
          error:
            "AIから文章の応答を取得できませんでした。"
        },
        502,
        origin
      );
    }

    return jsonResponse(
      {
        ok: true,

        reply,

        model:
          openAIData.model || MODEL,

        usage:
          openAIData.usage || null
      },
      200,
      origin
    );
  }
};


// ============================================================
// Helpers
// ============================================================

function corsHeaders(origin) {
  const headers = {
    "Content-Type":
      "application/json; charset=UTF-8",

    "Cache-Control":
      "no-store",

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",

    "Access-Control-Max-Age":
      "86400",

    "Vary":
      "Origin"
  };

  if (origin === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] =
      ALLOWED_ORIGIN;
  }

  return headers;
}


function jsonResponse(
  data,
  status = 200,
  origin = ""
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: corsHeaders(origin)
    }
  );
}


function clipText(value, maxLength) {
  const text =
    String(value ?? "");

  if (text.length <= maxLength) {
    return text;
  }

  return (
    text.slice(0, maxLength) +
    "\n[truncated]"
  );
}


function safeStringify(value) {
  try {
    return JSON.stringify(
      value,
      null,
      2
    );
  } catch {
    return "{}";
  }
}


function normalizeMemories(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, MAX_MEMORY_ITEMS)
    .map((item) => {

      if (typeof item === "string") {
        return item.trim();
      }

      if (
        item &&
        typeof item === "object"
      ) {
        if (
          typeof item.content ===
          "string"
        ) {
          return item.content.trim();
        }

        if (
          typeof item.text ===
          "string"
        ) {
          return item.text.trim();
        }

        return safeStringify(item);
      }

      return "";

    })
    .filter(Boolean)
    .map((text) =>
      clipText(
        text,
        MAX_MEMORY_ITEM_CHARS
      )
    );
}


function normalizeHistory(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => {
      return (
        item &&
        typeof item === "object" &&
        ["user", "assistant"]
          .includes(item.role) &&
        typeof item.content === "string"
      );
    })
    .slice(-MAX_HISTORY_ITEMS)
    .map((item) => ({
      role: item.role,

      content:
        clipText(
          item.content.trim(),
          MAX_HISTORY_MESSAGE_CHARS
        )
    }))
    .filter((item) =>
      item.content.length > 0
    );
}


function extractOutputText(data) {
  const parts = [];

  if (!Array.isArray(data?.output)) {
    return "";
  }

  for (const outputItem of data.output) {

    if (
      outputItem?.type !== "message" ||
      !Array.isArray(outputItem.content)
    ) {
      continue;
    }

    for (
      const contentItem
      of outputItem.content
    ) {
      if (
        contentItem?.type ===
          "output_text" &&
        typeof contentItem.text ===
          "string"
      ) {
        parts.push(
          contentItem.text
        );
      }
    }
  }

  return parts
    .join("\n")
    .trim();
}


function isRateLimited(key) {
  const now = Date.now();

  if (rateBuckets.size > 1000) {
    for (
      const [bucketKey, bucket]
      of rateBuckets
    ) {
      if (
        now - bucket.startedAt >
        RATE_LIMIT_WINDOW_MS * 2
      ) {
        rateBuckets.delete(
          bucketKey
        );
      }
    }
  }

  const existing =
    rateBuckets.get(key);

  if (
    !existing ||
    now - existing.startedAt >=
      RATE_LIMIT_WINDOW_MS
  ) {
    rateBuckets.set(
      key,
      {
        startedAt: now,
        count: 1
      }
    );

    return false;
  }

  existing.count += 1;

  rateBuckets.set(
    key,
    existing
  );

  return (
    existing.count >
    RATE_LIMIT_MAX_REQUESTS
  );
}
