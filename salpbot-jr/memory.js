(() => {
  "use strict";

  const STORAGE_KEY =
    "salpbot-jr.memory.v1";

  const CONNECTION_STORAGE_KEY =
    "salpbot-jr.connection.v1";

  const SCHEMA_VERSION =
    "1.0";


  function nowISO() {
    return new Date().toISOString();
  }


  function createDefaultMemory(
    personality = null
  ) {
    return {
      version:
        SCHEMA_VERSION,

      owner: {
        preferred_name:
          "カネちゃん"
      },

      bot: {
        name:
          "salpbot Jr.",

        system_name:
          "salpbot-jr",

        personality:
          personality || {
            summary:
              "独自人格・やさしく簡潔・日本語・カネちゃん専用の参謀"
          },

        language:
          "ja"
      },

      profile: {
        preferred_name:
          "カネちゃん",

        preferences: [],

        important_notes: []
      },

      memories: [],

      conversation_history: [],

      settings: {
        ai_provider: null,
        model: null,
        memory_enabled: true
      },

      metadata: {
        created_at:
          nowISO(),

        updated_at:
          nowISO()
      }
    };
  }


  function normalizeMemory(
    raw,
    fallbackPersonality = null
  ) {
    const base =
      createDefaultMemory(
        fallbackPersonality
      );

    if (
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw)
    ) {
      return base;
    }

    const normalized = {
      ...base,
      ...raw,

      owner: {
        ...base.owner,
        ...(raw.owner || {})
      },

      bot: {
        ...base.bot,
        ...(raw.bot || {})
      },

      profile: {
        ...base.profile,
        ...(raw.profile || {})
      },

      settings: {
        ...base.settings,
        ...(raw.settings || {})
      },

      metadata: {
        ...base.metadata,
        ...(raw.metadata || {})
      }
    };

    normalized.memories =
      Array.isArray(raw.memories)
        ? raw.memories
        : [];

    normalized.conversation_history =
      Array.isArray(
        raw.conversation_history
      )
        ? raw.conversation_history
            .filter((item) => {
              return (
                item &&
                typeof item ===
                  "object" &&
                [
                  "user",
                  "assistant"
                ].includes(
                  item.role
                ) &&
                typeof item.content ===
                  "string"
              );
            })
        : [];

    normalized.metadata.updated_at =
      nowISO();

    return normalized;
  }


  function loadMemory(
    fallbackPersonality = null
  ) {
    try {
      const text =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!text) {
        const memory =
          createDefaultMemory(
            fallbackPersonality
          );

        saveMemory(memory);

        return memory;
      }

      const parsed =
        JSON.parse(text);

      return normalizeMemory(
        parsed,
        fallbackPersonality
      );

    } catch (error) {
      console.error(
        "Memory load failed:",
        error
      );

      return createDefaultMemory(
        fallbackPersonality
      );
    }
  }


  function saveMemory(memory) {
    const normalized =
      normalizeMemory(memory);

    normalized.metadata.updated_at =
      nowISO();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        normalized
      )
    );

    return normalized;
  }


  function addMessage(
    memory,
    role,
    content
  ) {
    if (
      ![
        "user",
        "assistant"
      ].includes(role)
    ) {
      throw new Error(
        "Invalid message role."
      );
    }

    const cleanContent =
      String(
        content || ""
      ).trim();

    if (!cleanContent) {
      return memory;
    }

    const next =
      normalizeMemory(memory);

    next.conversation_history.push({
      id:
        createId("msg"),

      timestamp:
        nowISO(),

      role,

      content:
        cleanContent
    });

    return saveMemory(next);
  }


  function clearConversation(memory) {
    const next =
      normalizeMemory(memory);

    next.conversation_history = [];

    return saveMemory(next);
  }


  function createId(
    prefix = "item"
  ) {
    if (
      typeof crypto !==
        "undefined" &&
      typeof crypto.randomUUID ===
        "function"
    ) {
      return (
        `${prefix}-` +
        crypto.randomUUID()
      );
    }

    return (
      prefix +
      "-" +
      Date.now().toString(36) +
      "-" +
      Math.random()
        .toString(36)
        .slice(2)
    );
  }


  function exportMemory(memory) {
    // 接続情報は意図的に
    // このJSONへ含めない。

    const normalized =
      normalizeMemory(memory);

    const json =
      JSON.stringify(
        normalized,
        null,
        2
      );

    const blob =
      new Blob(
        [json],
        {
          type:
            "application/json;charset=utf-8"
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    link.href = url;

    link.download =
      `salpbot-jr-memory-${date}.json`;

    document.body
      .appendChild(link);

    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }


  async function importMemoryFile(
    file,
    fallbackPersonality = null
  ) {
    if (!file) {
      throw new Error(
        "ファイルがありません。"
      );
    }

    const text =
      await file.text();

    let parsed;

    try {
      parsed =
        JSON.parse(text);
    } catch {
      throw new Error(
        "JSONとして読み込めませんでした。"
      );
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "記憶JSONの形式が正しくありません。"
      );
    }

    const normalized =
      normalizeMemory(
        parsed,
        fallbackPersonality
      );

    saveMemory(normalized);

    return normalized;
  }


  // =========================================================
  // Worker接続設定
  // JSON Exportには含めない
  // =========================================================

  function loadConnectionSettings() {
    try {
      const raw =
        localStorage.getItem(
          CONNECTION_STORAGE_KEY
        );

      if (!raw) {
        return {
          workerUrl: "",
          token: ""
        };
      }

      const parsed =
        JSON.parse(raw);

      return {
        workerUrl:
          typeof parsed.workerUrl ===
            "string"
            ? parsed.workerUrl
            : "",

        token:
          typeof parsed.token ===
            "string"
            ? parsed.token
            : ""
      };

    } catch (error) {
      console.error(
        "Connection settings load failed:",
        error
      );

      return {
        workerUrl: "",
        token: ""
      };
    }
  }


  function saveConnectionSettings(
    settings
  ) {
    const workerUrl =
      String(
        settings?.workerUrl || ""
      ).trim();

    const token =
      String(
        settings?.token || ""
      ).trim();

    const value = {
      workerUrl,
      token
    };

    localStorage.setItem(
      CONNECTION_STORAGE_KEY,
      JSON.stringify(value)
    );

    return value;
  }


  function clearConnectionSettings() {
    localStorage.removeItem(
      CONNECTION_STORAGE_KEY
    );

    return {
      workerUrl: "",
      token: ""
    };
  }


  window.SalpbotMemory = {
    STORAGE_KEY,
    CONNECTION_STORAGE_KEY,
    SCHEMA_VERSION,

    createDefaultMemory,
    normalizeMemory,
    loadMemory,
    saveMemory,

    addMessage,
    clearConversation,

    exportMemory,
    importMemoryFile,

    loadConnectionSettings,
    saveConnectionSettings,
    clearConnectionSettings
  };

})();
