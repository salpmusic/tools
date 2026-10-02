(() => {
  "use strict";
  const STORAGE_KEY = "salpbot-jr.memory.v1";
  const SCHEMA_VERSION = "1.0";
  const nowISO = () => new Date().toISOString();

  function createId(prefix = "item") {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }

  function createDefaultMemory(personality = null) {
    return {
      version: SCHEMA_VERSION,
      owner: { preferred_name: "カネちゃん" },
      bot: {
        name: "salpbot Jr.",
        system_name: "salpbot-jr",
        personality: personality || { summary: "独自人格・やさしく簡潔・日本語・カネちゃん専用の参謀" },
        language: "ja"
      },
      profile: { preferred_name: "カネちゃん", preferences: [], important_notes: [] },
      memories: [],
      conversation_history: [],
      settings: { ai_provider: null, model: null, memory_enabled: true },
      metadata: { created_at: nowISO(), updated_at: nowISO() }
    };
  }

  function normalizeMemory(raw, fallbackPersonality = null) {
    const base = createDefaultMemory(fallbackPersonality);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
    const n = {
      ...base, ...raw,
      owner: { ...base.owner, ...(raw.owner || {}) },
      bot: { ...base.bot, ...(raw.bot || {}) },
      profile: { ...base.profile, ...(raw.profile || {}) },
      settings: { ...base.settings, ...(raw.settings || {}) },
      metadata: { ...base.metadata, ...(raw.metadata || {}) }
    };
    n.memories = Array.isArray(raw.memories) ? raw.memories : [];
    n.conversation_history = Array.isArray(raw.conversation_history)
      ? raw.conversation_history.filter((m) =>
          m && typeof m === "object" && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      : [];
    n.metadata.updated_at = nowISO();
    return n;
  }

  function saveMemory(memory) {
    const n = normalizeMemory(memory);
    n.metadata.updated_at = nowISO();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
    return n;
  }

  function loadMemory(fallbackPersonality = null) {
    try {
      const text = localStorage.getItem(STORAGE_KEY);
      if (!text) {
        return saveMemory(createDefaultMemory(fallbackPersonality));
      }
      return normalizeMemory(JSON.parse(text), fallbackPersonality);
    } catch (error) {
      console.error("Memory load failed:", error);
      return createDefaultMemory(fallbackPersonality);
    }
  }

  function addMessage(memory, role, content) {
    if (!["user", "assistant"].includes(role)) throw new Error("Invalid message role.");
    const clean = String(content || "").trim();
    if (!clean) return memory;
    const next = normalizeMemory(memory);
    next.conversation_history.push({ id: createId("msg"), timestamp: nowISO(), role, content: clean });
    return saveMemory(next);
  }

  function clearConversation(memory) {
    const next = normalizeMemory(memory);
    next.conversation_history = [];
    return saveMemory(next);
  }

  function exportMemory(memory) {
    const json = JSON.stringify(normalizeMemory(memory), null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `salpbot-jr-memory-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importMemoryFile(file, fallbackPersonality = null) {
    if (!file) throw new Error("ファイルがありません。");
    const text = await file.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw new Error("JSONとして読み込めませんでした。"); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("記憶JSONの形式が正しくありません。");
    }
    return saveMemory(normalizeMemory(parsed, fallbackPersonality));
  }

  window.SalpbotMemory = {
    STORAGE_KEY, SCHEMA_VERSION,
    createDefaultMemory, normalizeMemory, loadMemory, saveMemory,
    addMessage, clearConversation, exportMemory, importMemoryFile
  };
})();
