(() => {
  "use strict";
  const memoryAPI = window.SalpbotMemory;
  const $ = (id) => document.getElementById(id);
  const el = {
    botName: $("botName"), botSubtitle: $("botSubtitle"), personalityText: $("personalityText"),
    chatArea: $("chatArea"), messageInput: $("messageInput"), sendButton: $("sendButton"),
    exportButton: $("exportButton"), importButton: $("importButton"), clearButton: $("clearButton"),
    importFileInput: $("importFileInput"), messageCount: $("messageCount"), memoryMessage: $("memoryMessage")
  };

  let personality = null;
  let memory = null;

  const FALLBACK_PERSONALITY = {
    name: "salpbot Jr.", system_name: "salpbot-jr", owner_name: "カネちゃん", language: "ja",
    summary: "独自人格・やさしく簡潔・日本語・カネちゃん専用の参謀",
    greeting: "カネちゃん、salpbot Jr.です。現在はローカルモードです。",
    local_reply: "了解、カネちゃん。今はまだ頭脳AIを接続していないローカル版だよ。会話履歴はこの端末に保存しているよ。"
  };

  async function loadPersonality() {
    try {
      const res = await fetch("./personality.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`personality.json HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      console.warn("personality.json load failed:", error);
      return FALLBACK_PERSONALITY;
    }
  }

  function applyPersonality() {
    el.botName.textContent = personality.name || "salpbot Jr.";
    el.botSubtitle.textContent = `${personality.owner_name || "カネちゃん"}専用アシスタント`;
    el.personalityText.textContent = personality.summary || "やさしく簡潔な専用アシスタント";
  }

  function formatTime(ts) {
    try {
      return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
    } catch { return ""; }
  }

  function createMessageElement(message) {
    const row = document.createElement("div");
    row.className = `message ${message.role}`;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    const content = document.createElement("div");
    content.textContent = message.content;
    const meta = document.createElement("div");
    meta.className = "messageMeta";
    const who = message.role === "user" ? "カネちゃん" : "salpbot Jr.";
    meta.textContent = `${who} · ${formatTime(message.timestamp)}`;
    bubble.append(content, meta);
    row.appendChild(bubble);
    return row;
  }

  function renderConversation() {
    el.chatArea.innerHTML = "";
    const history = memory?.conversation_history || [];
    if (history.length === 0) {
      const empty = document.createElement("div");
      empty.className = "emptyState";
      const strong = document.createElement("strong");
      strong.textContent = personality?.greeting || "salpbot Jr. 起動完了";
      const text = document.createElement("span");
      text.textContent = "Step 1ではAI接続前のローカルモードです。入力した会話はこの端末に保存されます。";
      empty.append(strong, text);
      el.chatArea.appendChild(empty);
    } else {
      history.forEach((m) => el.chatArea.appendChild(createMessageElement(m)));
    }
    el.messageCount.textContent = `${history.length} messages`;
    requestAnimationFrame(() => { el.chatArea.scrollTop = el.chatArea.scrollHeight; });
  }

  function showMemoryMessage(text) {
    el.memoryMessage.textContent = text;
    window.clearTimeout(showMemoryMessage.timer);
    showMemoryMessage.timer = window.setTimeout(() => { el.memoryMessage.textContent = ""; }, 4500);
  }

  function sendMessage() {
    const text = el.messageInput.value.trim();
    if (!text) return;
    memory = memoryAPI.addMessage(memory, "user", text);
    el.messageInput.value = "";
    renderConversation();
    window.setTimeout(() => {
      const reply = personality.local_reply || "了解、カネちゃん。今はローカルモードなので、AI接続は次のステップで追加するよ。";
      memory = memoryAPI.addMessage(memory, "assistant", reply);
      renderConversation();
    }, 180);
  }

  function handleExport() {
    try {
      memoryAPI.exportMemory(memory);
      showMemoryMessage("記憶JSONを書き出しました。");
    } catch (error) {
      console.error(error);
      showMemoryMessage("JSONを書き出せませんでした。");
    }
  }

  async function handleImportChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      memory = await memoryAPI.importMemoryFile(file, personality);
      renderConversation();
      showMemoryMessage("記憶JSONを読み込みました。");
    } catch (error) {
      console.error(error);
      showMemoryMessage(error.message || "JSONを読み込めませんでした。");
    }
  }

  function handleClear() {
    if (!window.confirm("この端末に保存されている会話履歴を消去しますか？\n\n記憶JSONを書き出してから消去することもできます。")) return;
    memory = memoryAPI.clearConversation(memory);
    renderConversation();
    showMemoryMessage("会話履歴を消去しました。");
  }

  function registerEvents() {
    el.sendButton.addEventListener("click", sendMessage);
    el.messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(); }
    });
    el.exportButton.addEventListener("click", handleExport);
    el.importButton.addEventListener("click", () => { el.importFileInput.value = ""; el.importFileInput.click(); });
    el.importFileInput.addEventListener("change", handleImportChange);
    el.clearButton.addEventListener("click", handleClear);
  }

  async function init() {
    personality = await loadPersonality();
    applyPersonality();
    memory = memoryAPI.loadMemory(personality);
    memory.bot = {
      ...memory.bot,
      name: personality.name || memory.bot.name,
      system_name: personality.system_name || memory.bot.system_name,
      personality,
      language: personality.language || memory.bot.language
    };
    memory = memoryAPI.saveMemory(memory);
    registerEvents();
    renderConversation();
    showMemoryMessage("ローカル記憶を読み込みました。");
  }

  init();
})();
