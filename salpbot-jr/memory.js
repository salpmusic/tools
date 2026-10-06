(() => {
  "use strict";

  const STORAGE_KEY =
    "salpbot-jr.memory.v1";

  const CONNECTION_STORAGE_KEY =
    "salpbot-jr.connection.v1";

  const PERSONALITY_OVERRIDE_KEY =
    "salpbot-jr.personality.override.v1";

  const TEMP_BACKUP_KEY =
    "salpbot-jr.backup.temp.v1";

  const LAST_BACKUP_KEY =
    "salpbot-jr.backup.last.v1";

  const SCHEMA_VERSION =
    "1.0";

  const BACKUP_FORMAT =
    "salpbot-jr-backup";

  const BACKUP_FORMAT_VERSION =
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

      return normalizeMemory(
        JSON.parse(text),
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


  // =========================================================
  // 接続設定
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

    } catch {
      return {
        workerUrl: "",
        token: ""
      };
    }
  }


  function saveConnectionSettings(
    settings
  ) {
    const value = {
      workerUrl:
        String(
          settings?.workerUrl || ""
        ).trim(),

      token:
        String(
          settings?.token || ""
        ).trim()
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


  // =========================================================
  // Personality override
  // =========================================================

  function loadPersonalityOverride() {
    try {
      const raw =
        localStorage.getItem(
          PERSONALITY_OVERRIDE_KEY
        );

      return raw
        ? JSON.parse(raw)
        : null;

    } catch {
      return null;
    }
  }


  function savePersonalityOverride(
    personality
  ) {
    if (
      !personality ||
      typeof personality !==
        "object"
    ) {
      localStorage.removeItem(
        PERSONALITY_OVERRIDE_KEY
      );

      return null;
    }

    localStorage.setItem(
      PERSONALITY_OVERRIDE_KEY,
      JSON.stringify(
        personality
      )
    );

    return personality;
  }


  // =========================================================
  // Merge helpers
  // =========================================================

  function mergeById(
    current,
    incoming
  ) {
    const result =
      Array.isArray(current)
        ? [...current]
        : [];

    const ids =
      new Set(
        result
          .map((item) =>
            item?.id
          )
          .filter(Boolean)
      );

    for (
      const item
      of (
        Array.isArray(incoming)
          ? incoming
          : []
      )
    ) {
      if (
        item?.id &&
        ids.has(item.id)
      ) {
        continue;
      }

      result.push(item);

      if (item?.id) {
        ids.add(item.id);
      }
    }

    return result;
  }


  function mergeSimpleArray(
    current,
    incoming
  ) {
    const result = [];
    const seen = new Set();

    for (
      const item
      of [
        ...(
          Array.isArray(current)
            ? current
            : []
        ),
        ...(
          Array.isArray(incoming)
            ? incoming
            : []
        )
      ]
    ) {
      let key;

      try {
        key =
          JSON.stringify(item);
      } catch {
        key =
          String(item);
      }

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(item);
    }

    return result;
  }


  // 古いバックアップをマージした時に会話が末尾へ並ばないよう時刻順に整列
  // (時刻が読めないものは元の並び順を維持)
  function sortByTimestamp(items) {
    return items
      .map((item, index) => ({
        item,
        index,
        time:
          new Date(
            item?.timestamp
          ).getTime()
      }))
      .sort((x, y) => {
        if (
          Number.isFinite(x.time) &&
          Number.isFinite(y.time) &&
          x.time !== y.time
        ) {
          return x.time - y.time;
        }

        return x.index - y.index;
      })
      .map((entry) => entry.item);
  }


  function mergeMemory(
    current,
    incoming,
    fallbackPersonality = null
  ) {
    const a =
      normalizeMemory(
        current,
        fallbackPersonality
      );

    const b =
      normalizeMemory(
        incoming,
        fallbackPersonality
      );

    const merged = {
      ...a,

      owner: {
        ...a.owner,
        ...b.owner
      },

      bot: {
        ...a.bot,
        ...b.bot
      },

      profile: {
        ...a.profile,
        ...b.profile,

        preferences:
          mergeSimpleArray(
            a.profile.preferences,
            b.profile.preferences
          ),

        important_notes:
          mergeSimpleArray(
            a.profile.important_notes,
            b.profile.important_notes
          )
      },

      settings: {
        ...a.settings,
        ...b.settings
      },

      memories:
        mergeById(
          a.memories,
          b.memories
        ),

      conversation_history:
        sortByTimestamp(
          mergeById(
            a.conversation_history,
            b.conversation_history
          )
        ),

      metadata: {
        ...a.metadata,

        created_at:
          a.metadata.created_at ||
          b.metadata.created_at ||
          nowISO(),

        updated_at:
          nowISO()
      }
    };

    return normalizeMemory(
      merged,
      fallbackPersonality
    );
  }


  // =========================================================
  // 完全バックアップ
  // =========================================================

  function buildFullBackup({
    memory,
    personality,
    activeProvider
  }) {
    const connection =
      loadConnectionSettings();

    return {
      format:
        BACKUP_FORMAT,

      format_version:
        BACKUP_FORMAT_VERSION,

      exported_at:
        nowISO(),

      personality:
        personality || null,

      memory:
        normalizeMemory(
          memory,
          personality
        ),

      settings: {
        active_provider:
          activeProvider ||
          "local",

        worker_url:
          connection.workerUrl ||
          ""

        // token は絶対に含めない
      }
    };
  }


  function downloadJSON(
    object,
    filename
  ) {
    const blob =
      new Blob(
        [
          JSON.stringify(
            object,
            null,
            2
          )
        ],
        {
          type:
            "application/json;charset=utf-8"
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;
    link.download = filename;

    document.body
      .appendChild(link);

    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }


  function exportFullBackup({
    memory,
    personality,
    activeProvider
  }) {
    const backup =
      buildFullBackup({
        memory,
        personality,
        activeProvider
      });

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    downloadJSON(
      backup,
      `salpbot-jr-backup-${date}.json`
    );

    localStorage.setItem(
      LAST_BACKUP_KEY,
      backup.exported_at
    );

    return backup;
  }


  // Step1/2互換用
  function exportMemory(memory) {
    const normalized =
      normalizeMemory(memory);

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    downloadJSON(
      normalized,
      `salpbot-jr-memory-${date}.json`
    );
  }


  function createTemporaryBackup({
    memory,
    personality,
    activeProvider
  }) {
    const backup =
      buildFullBackup({
        memory,
        personality,
        activeProvider
      });

    localStorage.setItem(
      TEMP_BACKUP_KEY,
      JSON.stringify(
        backup
      )
    );

    return backup;
  }


  function hasTemporaryBackup() {
    return Boolean(
      localStorage.getItem(
        TEMP_BACKUP_KEY
      )
    );
  }


  function readTemporaryBackup() {
    try {
      const raw =
        localStorage.getItem(
          TEMP_BACKUP_KEY
        );

      return raw
        ? JSON.parse(raw)
        : null;

    } catch {
      return null;
    }
  }


  function clearTemporaryBackup() {
    localStorage.removeItem(
      TEMP_BACKUP_KEY
    );
  }


  function getLastBackupAt() {
    return (
      localStorage.getItem(
        LAST_BACKUP_KEY
      ) || ""
    );
  }


  function isBackupOld(
    days = 7
  ) {
    const value =
      getLastBackupAt();

    if (!value) {
      return true;
    }

    const time =
      new Date(value)
        .getTime();

    if (!Number.isFinite(time)) {
      return true;
    }

    return (
      Date.now() - time >=
      days *
        24 *
        60 *
        60 *
        1000
    );
  }


  // =========================================================
  // Import
  // =========================================================

  function identifyImportFormat(
    parsed
  ) {
    if (
      parsed?.format ===
      BACKUP_FORMAT
    ) {
      return "full";
    }

    // Step1/2 旧形式
    if (
      parsed &&
      typeof parsed ===
        "object" &&
      (
        Array.isArray(
          parsed.conversation_history
        ) ||
        Array.isArray(
          parsed.memories
        ) ||
        parsed.profile ||
        parsed.bot
      )
    ) {
      return "legacy";
    }

    return "unknown";
  }


  async function readBackupFile(
    file
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

    const type =
      identifyImportFormat(
        parsed
      );

    if (type === "unknown") {
      throw new Error(
        "salpbot Jr. のバックアップ形式ではありません。"
      );
    }

    return {
      type,
      data: parsed
    };
  }


  function applyImportedData({
    imported,
    mode,
    currentMemory,
    currentPersonality,
    restoreEmptyWorkerUrl = false
  }) {
    const type =
      identifyImportFormat(
        imported
      );

    let incomingMemory;
    let incomingPersonality = null;
    let importedWorkerUrl = null;
    let activeProvider = null;

    if (type === "full") {
      incomingMemory =
        imported.memory || {};

      incomingPersonality =
        imported.personality ||
        null;

      importedWorkerUrl =
        typeof imported
          ?.settings
          ?.worker_url ===
          "string"
          ? imported.settings.worker_url
          : null;

      activeProvider =
        typeof imported
          ?.settings
          ?.active_provider ===
          "string"
          ? imported.settings
              .active_provider
          : null;

    } else {
      // Step1/2 の記憶JSONの bot.personality は当時の
      // personality.json の写しなので、人格の上書きには使わない
      // (使うと personality.json の更新が反映されなくなる)。
      incomingMemory =
        imported;
    }

    let nextMemory;

    if (mode === "merge") {
      nextMemory =
        mergeMemory(
          currentMemory,
          incomingMemory,
          currentPersonality
        );

    } else {
      nextMemory =
        normalizeMemory(
          incomingMemory,
          incomingPersonality ||
          currentPersonality
        );
    }

    nextMemory =
      saveMemory(
        nextMemory
      );

    if (incomingPersonality) {
      savePersonalityOverride(
        incomingPersonality
      );
    }

    // Worker URLだけ復元。
    // 現在端末にあるTokenは保持。
    // 空の worker_url (LOCALで作ったバックアップ) では
    // 現在のURLを消さない。直前の状態に戻す時だけ空も復元する。
    if (
      importedWorkerUrl !== null &&
      (
        importedWorkerUrl.trim() ||
        restoreEmptyWorkerUrl
      )
    ) {
      const currentConnection =
        loadConnectionSettings();

      saveConnectionSettings({
        workerUrl:
          importedWorkerUrl,

        token:
          currentConnection.token
      });
    }

    return {
      memory:
        nextMemory,

      personality:
        incomingPersonality,

      activeProvider
    };
  }


  window.SalpbotMemory = {
    STORAGE_KEY,
    CONNECTION_STORAGE_KEY,
    PERSONALITY_OVERRIDE_KEY,
    TEMP_BACKUP_KEY,
    LAST_BACKUP_KEY,

    SCHEMA_VERSION,
    BACKUP_FORMAT,
    BACKUP_FORMAT_VERSION,

    createDefaultMemory,
    normalizeMemory,
    loadMemory,
    saveMemory,

    addMessage,
    clearConversation,

    loadConnectionSettings,
    saveConnectionSettings,
    clearConnectionSettings,

    loadPersonalityOverride,
    savePersonalityOverride,

    mergeMemory,

    exportMemory,
    exportFullBackup,

    createTemporaryBackup,
    hasTemporaryBackup,
    readTemporaryBackup,
    clearTemporaryBackup,

    getLastBackupAt,
    isBackupOld,

    readBackupFile,
    applyImportedData
  };

})();
