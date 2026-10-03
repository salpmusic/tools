(() => {
  "use strict";

  const memoryAPI =
    window.SalpbotMemory;

  const HISTORY_TO_SEND = 8;

  const elements = {
    botName:
      document.getElementById(
        "botName"
      ),

    botSubtitle:
      document.getElementById(
        "botSubtitle"
      ),

    personalityText:
      document.getElementById(
        "personalityText"
      ),

    brainStatus:
      document.getElementById(
        "brainStatus"
      ),

    chatArea:
      document.getElementById(
        "chatArea"
      ),

    messageInput:
      document.getElementById(
        "messageInput"
      ),

    sendButton:
      document.getElementById(
        "sendButton"
      ),

    exportButton:
      document.getElementById(
        "exportButton"
      ),

    importButton:
      document.getElementById(
        "importButton"
      ),

    clearButton:
      document.getElementById(
        "clearButton"
      ),

    importFileInput:
      document.getElementById(
        "importFileInput"
      ),

    messageCount:
      document.getElementById(
        "messageCount"
      ),

    memoryMessage:
      document.getElementById(
        "memoryMessage"
      ),

    workerUrlInput:
      document.getElementById(
        "workerUrlInput"
      ),

    workerTokenInput:
      document.getElementById(
        "workerTokenInput"
      ),

    saveConnectionButton:
      document.getElementById(
        "saveConnectionButton"
      ),

    clearConnectionButton:
      document.getElementById(
        "clearConnectionButton"
      ),

    connectionMessage:
      document.getElementById(
        "connectionMessage"
      )
  };


  let personality = null;

  let memory = null;

  let connection = {
    workerUrl: "",
    token: ""
  };

  let sending = false;


  async function loadPersonality() {
    try {
      const response =
        await fetch(
          "./personality.json",
          {
            cache: "no-store"
          }
        );

      if (!response.ok) {
        throw new Error(
          `personality.json HTTP ${response.status}`
        );
      }

      return await response.json();

    } catch (error) {
      console.warn(
        "personality.json load failed:",
        error
      );

      return {
        name:
          "salpbot Jr.",

        system_name:
          "salpbot-jr",

        owner_name:
          "カネちゃん",

        language:
          "ja",

        summary:
          "独自人格・やさしく簡潔・日本語・カネちゃん専用の参謀",

        traits: [
          "やさしい",
          "簡潔",
          "実用的",
          "落ち着いて考える"
        ],

        greeting:
          "カネちゃん、salpbot Jr.です。",

        local_reply:
          "了解、カネちゃん。今はローカルモードだよ。Workerを設定するとAIと会話できるようになるよ。"
      };
    }
  }


  function applyPersonality() {
    elements.botName.textContent =
      personality.name ||
      "salpbot Jr.";

    elements.botSubtitle.textContent =
      `${
        personality.owner_name ||
        "カネちゃん"
      }専用アシスタント`;

    elements.personalityText.textContent =
      personality.summary ||
      "やさしく簡潔な専用アシスタント";
  }


  function isOnlineConfigured() {
    return Boolean(
      connection.workerUrl &&
      connection.token
    );
  }


  function updateConnectionUI() {
    const online =
      isOnlineConfigured();

    elements.brainStatus.textContent =
      online
        ? "ONLINE"
        : "LOCAL";

    elements.brainStatus.classList
      .toggle(
        "online",
        online
      );

    elements.brainStatus.classList
      .toggle(
        "offline",
        !online
      );
  }


  function loadConnectionUI() {
    connection =
      memoryAPI
        .loadConnectionSettings();

    elements.workerUrlInput.value =
      connection.workerUrl;

    elements.workerTokenInput.value =
      connection.token;

    updateConnectionUI();
  }


  function saveConnection() {
    let workerUrl =
      elements.workerUrlInput
        .value
        .trim();

    const token =
      elements.workerTokenInput
        .value
        .trim();

    if (workerUrl) {
      workerUrl =
        workerUrl.replace(
          /\/+$/,
          ""
        );

      try {
        const parsed =
          new URL(workerUrl);

        if (
          parsed.protocol !==
          "https:"
        ) {
          throw new Error();
        }

      } catch {
        showConnectionMessage(
          "Worker URLは https:// から始まるURLを入力してください。"
        );

        return;
      }
    }

    connection =
      memoryAPI
        .saveConnectionSettings({
          workerUrl,
          token
        });

    elements.workerUrlInput.value =
      connection.workerUrl;

    elements.workerTokenInput.value =
      connection.token;

    updateConnectionUI();

    if (isOnlineConfigured()) {
      showConnectionMessage(
        "AI接続設定を保存しました。次の送信からONLINEです。"
      );
    } else {
      showConnectionMessage(
        "設定を保存しました。Worker URLとTokenの両方が揃うまではLOCALです。"
      );
    }
  }


  function clearConnection() {
    connection =
      memoryAPI
        .clearConnectionSettings();

    elements.workerUrlInput.value =
      "";

    elements.workerTokenInput.value =
      "";

    updateConnectionUI();

    showConnectionMessage(
      "AI接続設定を削除しました。LOCALモードです。"
    );
  }


  function showConnectionMessage(text) {
    elements.connectionMessage
      .textContent = text;

    window.clearTimeout(
      showConnectionMessage.timer
    );

    showConnectionMessage.timer =
      window.setTimeout(() => {
        elements.connectionMessage
          .textContent = "";
      }, 5000);
  }


  function renderConversation() {
    elements.chatArea.innerHTML = "";

    const history =
      memory?.conversation_history ||
      [];

    if (history.length === 0) {
      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "emptyState";

      const strong =
        document.createElement(
          "strong"
        );

      strong.textContent =
        personality?.greeting ||
        "salpbot Jr. 起動完了";

      const text =
        document.createElement(
          "span"
        );

      text.textContent =
        isOnlineConfigured()
          ? "ONLINEモードです。Worker経由でAIと会話できます。"
          : "LOCALモードです。Workerを設定するとAIと会話できます。";

      empty.appendChild(strong);
      empty.appendChild(text);

      elements.chatArea
        .appendChild(empty);

    } else {

      history.forEach(
        (message) => {
          elements.chatArea
            .appendChild(
              createMessageElement(
                message
              )
            );
        }
      );
    }

    elements.messageCount.textContent =
      `${history.length} messages`;

    requestAnimationFrame(() => {
      elements.chatArea.scrollTop =
        elements.chatArea
          .scrollHeight;
    });
  }


  function createMessageElement(
    message
  ) {
    const row =
      document.createElement(
        "div"
      );

    row.className =
      `message ${message.role}`;

    const bubble =
      document.createElement(
        "div"
      );

    bubble.className =
      "bubble";

    const content =
      document.createElement(
        "div"
      );

    content.textContent =
      message.content;

    const meta =
      document.createElement(
        "div"
      );

    meta.className =
      "messageMeta";

    const speaker =
      message.role === "user"
        ? "カネちゃん"
        : "salpbot Jr.";

    meta.textContent =
      `${speaker} · ${
        formatTime(
          message.timestamp
        )
      }`;

    bubble.appendChild(
      content
    );

    bubble.appendChild(
      meta
    );

    row.appendChild(
      bubble
    );

    return row;
  }


  function formatTime(timestamp) {
    try {
      return new Intl
        .DateTimeFormat(
          "ja-JP",
          {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }
        )
        .format(
          new Date(timestamp)
        );

    } catch {
      return "";
    }
  }


  function setSending(
    active
  ) {
    sending = active;

    elements.sendButton.disabled =
      active;

    elements.messageInput.disabled =
      active;

    elements.sendButton.textContent =
      active
        ? "送信中…"
        : "送信";
  }


  async function sendMessage() {
    if (sending) {
      return;
    }

    const text =
      elements.messageInput
        .value
        .trim();

    if (!text) {
      return;
    }

    // Workerへ送る直前の
    // 過去履歴を保持する。
    // 今回の新規発言は別 message で送る。

    const previousHistory =
      (
        memory
          ?.conversation_history ||
        []
      )
        .slice(
          -HISTORY_TO_SEND
        )
        .map((item) => ({
          role:
            item.role,

          content:
            item.content
        }));

    memory =
      memoryAPI.addMessage(
        memory,
        "user",
        text
      );

    elements.messageInput.value =
      "";

    renderConversation();

    // --------------------------------------
    // LOCAL
    // --------------------------------------

    if (!isOnlineConfigured()) {
      window.setTimeout(() => {
        const reply =
          personality.local_reply ||
          "了解、カネちゃん。今はLOCALモードだよ。";

        memory =
          memoryAPI.addMessage(
            memory,
            "assistant",
            reply
          );

        renderConversation();

      }, 180);

      return;
    }

    // --------------------------------------
    // ONLINE
    // --------------------------------------

    setSending(true);

    showMemoryMessage(
      "salpbot Jr. が考えています…"
    );

    try {
      const reply =
        await requestWorker(
          text,
          previousHistory
        );

      memory =
        memoryAPI.addMessage(
          memory,
          "assistant",
          reply
        );

      renderConversation();

      showMemoryMessage(
        "ONLINE応答を受信しました。"
      );

    } catch (error) {
      console.error(
        "Worker request failed:",
        error
      );

      showMemoryMessage(
        `エラー: ${
          error.message ||
          "AIとの通信に失敗しました。"
        }`
      );

    } finally {
      setSending(false);

      elements.messageInput.focus();
    }
  }


  async function requestWorker(
    message,
    history
  ) {
    const importantMemories =
      collectImportantMemories();

    const response =
      await fetch(
        connection.workerUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${connection.token}`
          },

          body:
            JSON.stringify({
              personality,

              important_memories:
                importantMemories,

              history,

              message
            })
        }
      );

    let data;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        `WorkerからJSON以外の応答が返りました。HTTP ${response.status}`
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
        `Worker HTTP ${response.status}`
      );
    }

    if (
      !data ||
      data.ok !== true ||
      typeof data.reply !==
        "string" ||
      !data.reply.trim()
    ) {
      throw new Error(
        "Workerから返事を取得できませんでした。"
      );
    }

    return data.reply.trim();
  }


  function collectImportantMemories() {
    const result = [];

    const notes =
      memory
        ?.profile
        ?.important_notes;

    if (Array.isArray(notes)) {
      for (const note of notes) {

        if (
          typeof note ===
          "string"
        ) {
          const clean =
            note.trim();

          if (clean) {
            result.push(clean);
          }

        } else if (
          note &&
          typeof note ===
            "object" &&
          typeof note.content ===
            "string"
        ) {
          const clean =
            note.content.trim();

          if (clean) {
            result.push(clean);
          }
        }
      }
    }

    const memories =
      memory?.memories;

    if (
      Array.isArray(memories)
    ) {
      for (
        const item
        of memories
      ) {
        if (
          typeof item ===
          "string"
        ) {
          const clean =
            item.trim();

          if (clean) {
            result.push(clean);
          }

        } else if (
          item &&
          typeof item ===
            "object"
        ) {
          const text =
            typeof item.content ===
              "string"
              ? item.content
              : (
                  typeof item.text ===
                    "string"
                    ? item.text
                    : ""
                );

          const clean =
            text.trim();

          if (clean) {
            result.push(clean);
          }
        }
      }
    }

    return result.slice(0, 20);
  }


  function showMemoryMessage(
    text
  ) {
    elements.memoryMessage
      .textContent = text;

    window.clearTimeout(
      showMemoryMessage.timer
    );

    showMemoryMessage.timer =
      window.setTimeout(() => {
        elements.memoryMessage
          .textContent = "";
      }, 5000);
  }


  function handleExport() {
    try {
      memoryAPI.exportMemory(
        memory
      );

      showMemoryMessage(
        "記憶JSONを書き出しました。接続トークンは含まれていません。"
      );

    } catch (error) {
      console.error(error);

      showMemoryMessage(
        "JSONを書き出せませんでした。"
      );
    }
  }


  function handleImportClick() {
    elements.importFileInput.value =
      "";

    elements.importFileInput.click();
  }


  async function handleImportChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      memory =
        await memoryAPI
          .importMemoryFile(
            file,
            personality
          );

      renderConversation();

      showMemoryMessage(
        "記憶JSONを読み込みました。"
      );

    } catch (error) {
      console.error(error);

      showMemoryMessage(
        error.message ||
        "JSONを読み込めませんでした。"
      );
    }
  }


  function handleClear() {
    const ok =
      window.confirm(
        "この端末に保存されている会話履歴を消去しますか？\n\n記憶JSONを書き出してから消去することもできます。"
      );

    if (!ok) {
      return;
    }

    memory =
      memoryAPI
        .clearConversation(
          memory
        );

    renderConversation();

    showMemoryMessage(
      "会話履歴を消去しました。"
    );
  }


  function registerEvents() {
    elements.sendButton
      .addEventListener(
        "click",
        sendMessage
      );

    elements.messageInput
      .addEventListener(
        "keydown",
        (event) => {
          if (
            event.key ===
              "Enter" &&
            !event.shiftKey
          ) {
            event.preventDefault();

            sendMessage();
          }
        }
      );

    elements.exportButton
      .addEventListener(
        "click",
        handleExport
      );

    elements.importButton
      .addEventListener(
        "click",
        handleImportClick
      );

    elements.importFileInput
      .addEventListener(
        "change",
        handleImportChange
      );

    elements.clearButton
      .addEventListener(
        "click",
        handleClear
      );

    elements.saveConnectionButton
      .addEventListener(
        "click",
        saveConnection
      );

    elements.clearConnectionButton
      .addEventListener(
        "click",
        clearConnection
      );
  }


  async function init() {
    personality =
      await loadPersonality();

    applyPersonality();

    memory =
      memoryAPI.loadMemory(
        personality
      );

    memory.bot = {
      ...memory.bot,

      name:
        personality.name ||
        memory.bot.name,

      system_name:
        personality.system_name ||
        memory.bot.system_name,

      personality,

      language:
        personality.language ||
        memory.bot.language
    };

    memory =
      memoryAPI.saveMemory(
        memory
      );

    loadConnectionUI();

    registerEvents();

    renderConversation();

    showMemoryMessage(
      isOnlineConfigured()
        ? "記憶を読み込みました。ONLINE設定済みです。"
        : "ローカル記憶を読み込みました。"
    );
  }


  init();

})();
