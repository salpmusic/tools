(() => {
  "use strict";

  const memoryAPI =
    window.SalpbotMemory;

  const brainAPI =
    window.SalpbotBrain;

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

    footerBrain:
      document.getElementById(
        "footerBrain"
      ),

    brainProviderSelect:
      document.getElementById(
        "brainProviderSelect"
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

    restoreButton:
      document.getElementById(
        "restoreButton"
      ),

    clearButton:
      document.getElementById(
        "clearButton"
      ),

    importFileInput:
      document.getElementById(
        "importFileInput"
      ),

    importModeDialog:
      document.getElementById(
        "importModeDialog"
      ),

    importReplaceButton:
      document.getElementById(
        "importReplaceButton"
      ),

    importMergeButton:
      document.getElementById(
        "importMergeButton"
      ),

    importCancelButton:
      document.getElementById(
        "importCancelButton"
      ),

    messageCount:
      document.getElementById(
        "messageCount"
      ),

    memoryMessage:
      document.getElementById(
        "memoryMessage"
      ),

    backupInfo:
      document.getElementById(
        "backupInfo"
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

  let basePersonality = null;

  let memory = null;

  let connection = {
    workerUrl: "",
    token: ""
  };

  let sending = false;

  let pendingImport = null;


  // =========================================================
  // Personality
  // =========================================================

  async function loadPersonalityFile() {
    try {
      const response =
        await fetch(
          "./personality.json",
          {
            cache:
              "no-store"
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
          "了解、カネちゃん。今はローカルモードだよ。"
      };
    }
  }


  // 読み込んだ人格が personality.json と同じなら上書きを持たない
  // (personality.json の今後の更新がそのまま反映されるように)
  function syncPersonalityOverride() {
    if (
      basePersonality &&
      JSON.stringify(personality) ===
        JSON.stringify(basePersonality)
    ) {
      memoryAPI
        .savePersonalityOverride(null);
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


  // =========================================================
  // Brain
  // =========================================================

  function populateBrainProviders() {
    elements.brainProviderSelect
      .innerHTML = "";

    for (
      const provider
      of brainAPI.list()
    ) {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        provider.id;

      option.textContent =
        provider.label;

      elements.brainProviderSelect
        .appendChild(
          option
        );
    }

    const active =
      brainAPI.getActiveId();

    if (
      brainAPI.get(active)
    ) {
      elements.brainProviderSelect
        .value = active;

    } else {
      brainAPI.setActive(
        "local"
      );

      elements.brainProviderSelect
        .value = "local";
    }
  }


  function updateBrainUI() {
    const active =
      brainAPI.getActiveId();

    const online =
      active !== "local";

    elements.brainStatus
      .textContent =
        online
          ? "ONLINE"
          : "LOCAL";

    elements.brainStatus
      .classList.toggle(
        "online",
        online
      );

    elements.brainStatus
      .classList.toggle(
        "offline",
        !online
      );

    elements.footerBrain
      .textContent =
        `Brain: ${active}`;

    elements.brainProviderSelect
      .value = active;

    renderConversation();
  }


  function handleBrainChange() {
    const id =
      elements.brainProviderSelect
        .value;

    try {
      brainAPI.setActive(id);

      updateBrainUI();

      showConnectionMessage(
        `Brainを ${
          brainAPI.get()?.label ||
          id
        } に切り替えました。`
      );

    } catch (error) {
      showConnectionMessage(
        error.message
      );
    }
  }


  // =========================================================
  // Connection
  // =========================================================

  function loadConnectionUI() {
    connection =
      memoryAPI
        .loadConnectionSettings();

    elements.workerUrlInput.value =
      connection.workerUrl;

    elements.workerTokenInput.value =
      connection.token;
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

    if (
      connection.workerUrl &&
      connection.token &&
      brainAPI.get("worker-openai")
    ) {
      brainAPI.setActive(
        "worker-openai"
      );

      updateBrainUI();

      showConnectionMessage(
        "接続設定を保存しました。Brain: OpenAI (Worker) / ONLINE"
      );

      return;
    }

    showConnectionMessage(
      "接続設定を保存しました。"
    );
  }


  function clearConnection() {
    connection =
      memoryAPI
        .clearConnectionSettings();

    elements.workerUrlInput.value =
      "";

    elements.workerTokenInput.value =
      "";

    if (
      brainAPI.getActiveId() ===
      "worker-openai"
    ) {
      brainAPI.setActive("local");

      updateBrainUI();
    }

    showConnectionMessage(
      "接続設定を削除しました。LOCALモードです。"
    );
  }


  function showConnectionMessage(
    text
  ) {
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


  // =========================================================
  // Conversation
  // =========================================================

  function renderConversation() {
    elements.chatArea.innerHTML =
      "";

    const history =
      memory
        ?.conversation_history ||
      [];

    if (
      history.length === 0
    ) {
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

      const active =
        brainAPI.getActiveId();

      text.textContent =
        active === "local"
          ? "LOCALモードです。会話はこの端末に保存されます。"
          : `${brainAPI.get()?.label || active} を使用します。`;

      empty.appendChild(
        strong
      );

      empty.appendChild(
        text
      );

      elements.chatArea
        .appendChild(
          empty
        );

    } else {
      for (
        const message
        of history
      ) {
        elements.chatArea
          .appendChild(
            createMessageElement(
              message
            )
          );
      }
    }

    elements.messageCount
      .textContent =
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


  function formatTime(
    timestamp
  ) {
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

    setSending(true);

    showMemoryMessage(
      "salpbot Jr. が考えています…"
    );

    try {
      const reply =
        await brainAPI.send({
          personality,

          memories:
            collectImportantMemories(),

          history:
            previousHistory,

          message:
            text
        });

      memory =
        memoryAPI.addMessage(
          memory,
          "assistant",
          reply
        );

      renderConversation();

      showMemoryMessage(
        "返答を受信しました。"
      );

    } catch (error) {
      console.error(
        "Brain error:",
        error
      );

      showMemoryMessage(
        `エラー: ${
          error.message ||
          "返答を取得できませんでした。"
        }`
      );

    } finally {
      setSending(false);

      elements.messageInput
        .focus();
    }
  }


  function collectImportantMemories() {
    const result = [];

    const notes =
      memory
        ?.profile
        ?.important_notes;

    if (
      Array.isArray(notes)
    ) {
      for (
        const note
        of notes
      ) {
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
          if (item.trim()) {
            result.push(
              item.trim()
            );
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

          if (text.trim()) {
            result.push(
              text.trim()
            );
          }
        }
      }
    }

    return result.slice(
      0,
      20
    );
  }


  // =========================================================
  // Backup UI
  // =========================================================

  function updateBackupUI() {
    const last =
      memoryAPI
        .getLastBackupAt();

    const old =
      memoryAPI
        .isBackupOld(7);

    elements.backupInfo
      .classList.toggle(
        "warning",
        old
      );

    if (!last) {
      elements.backupInfo
        .textContent =
          "まだ完全バックアップがありません。ときどき保存しておくと安心です。";

    } else {
      const date =
        new Intl.DateTimeFormat(
          "ja-JP",
          {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }
        ).format(
          new Date(last)
        );

      elements.backupInfo
        .textContent =
          old
            ? `最終バックアップ: ${date}。7日以上空いています。そろそろ保存しておくと安心です。`
            : `最終バックアップ: ${date}`;
    }

    elements.restoreButton.disabled =
      !memoryAPI
        .hasTemporaryBackup();
  }


  function handleExport() {
    try {
      memoryAPI
        .exportFullBackup({
          memory,

          personality,

          activeProvider:
            brainAPI
              .getActiveId()
        });

      updateBackupUI();

      showMemoryMessage(
        "完全バックアップを書き出しました。アクセストークンは含まれていません。"
      );

    } catch (error) {
      console.error(error);

      showMemoryMessage(
        "バックアップを書き出せませんでした。"
      );
    }
  }


  function handleImportClick() {
    elements.importFileInput
      .value = "";

    elements.importFileInput
      .click();
  }


  async function handleImportFile(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      pendingImport =
        await memoryAPI
          .readBackupFile(file);

      if (
        typeof elements
          .importModeDialog
          .showModal ===
          "function"
      ) {
        elements
          .importModeDialog
          .showModal();

      } else {
        const merge =
          window.confirm(
            "OK: マージ\nキャンセル: 置き換え"
          );

        await executeImport(
          merge
            ? "merge"
            : "replace"
        );
      }

    } catch (error) {
      console.error(error);

      showMemoryMessage(
        error.message ||
        "JSONを読み込めませんでした。"
      );
    }
  }


  async function executeImport(
    mode
  ) {
    if (!pendingImport) {
      return;
    }

    try {
      memoryAPI
        .createTemporaryBackup({
          memory,

          personality,

          activeProvider:
            brainAPI
              .getActiveId()
        });

      const result =
        memoryAPI
          .applyImportedData({
            imported:
              pendingImport.data,

            mode,

            currentMemory:
              memory,

            currentPersonality:
              personality
          });

      memory =
        result.memory;

      if (
        result.personality
      ) {
        personality =
          result.personality;

        syncPersonalityOverride();

        applyPersonality();
      }

      if (
        result.activeProvider &&
        brainAPI.get(
          result.activeProvider
        )
      ) {
        brainAPI.setActive(
          result.activeProvider
        );
      }

      loadConnectionUI();

      updateBrainUI();

      renderConversation();

      updateBackupUI();

      showMemoryMessage(
        mode === "merge"
          ? "バックアップをマージしました。"
          : "バックアップで置き換えました。"
      );

    } catch (error) {
      console.error(error);

      showMemoryMessage(
        error.message ||
        "読み込みに失敗しました。"
      );

    } finally {
      pendingImport = null;

      if (
        elements
          .importModeDialog
          .open
      ) {
        elements
          .importModeDialog
          .close();
      }
    }
  }


  function restorePreviousState() {
    const backup =
      memoryAPI
        .readTemporaryBackup();

    if (!backup) {
      showMemoryMessage(
        "戻せる一時バックアップがありません。"
      );

      return;
    }

    const ok =
      window.confirm(
        "JSON読み込み直前の状態に戻しますか？"
      );

    if (!ok) {
      return;
    }

    try {
      const result =
        memoryAPI
          .applyImportedData({
            imported:
              backup,

            mode:
              "replace",

            currentMemory:
              memory,

            currentPersonality:
              personality,

            restoreEmptyWorkerUrl:
              true
          });

      memory =
        result.memory;

      if (
        result.personality
      ) {
        personality =
          result.personality;

        syncPersonalityOverride();

        applyPersonality();
      }

      if (
        result.activeProvider &&
        brainAPI.get(
          result.activeProvider
        )
      ) {
        brainAPI.setActive(
          result.activeProvider
        );
      }

      loadConnectionUI();

      memoryAPI
        .clearTemporaryBackup();

      updateBrainUI();

      renderConversation();

      updateBackupUI();

      showMemoryMessage(
        "直前の状態に戻しました。"
      );

    } catch (error) {
      console.error(error);

      showMemoryMessage(
        "元に戻せませんでした。"
      );
    }
  }


  // =========================================================
  // Other UI
  // =========================================================

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


  function handleClear() {
    const ok =
      window.confirm(
        "この端末に保存されている会話履歴を消去しますか？"
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


  // =========================================================
  // Events
  // =========================================================

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


    elements.brainProviderSelect
      .addEventListener(
        "change",
        handleBrainChange
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
        handleImportFile
      );


    elements.importReplaceButton
      .addEventListener(
        "click",
        () =>
          executeImport(
            "replace"
          )
      );

    elements.importMergeButton
      .addEventListener(
        "click",
        () =>
          executeImport(
            "merge"
          )
      );

    elements.importCancelButton
      .addEventListener(
        "click",
        () => {
          pendingImport = null;

          elements
            .importModeDialog
            .close();
        }
      );


    elements.restoreButton
      .addEventListener(
        "click",
        restorePreviousState
      );


    elements.clearButton
      .addEventListener(
        "click",
        handleClear
      );
  }


  // =========================================================
  // Init
  // =========================================================

  async function init() {
    basePersonality =
      await loadPersonalityFile();

    const override =
      memoryAPI
        .loadPersonalityOverride();

    personality =
      override ||
      basePersonality;

    applyPersonality();

    memory =
      memoryAPI
        .loadMemory(
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
      memoryAPI
        .saveMemory(
          memory
        );

    loadConnectionUI();

    populateBrainProviders();

    registerEvents();

    updateBrainUI();

    renderConversation();

    updateBackupUI();

    showMemoryMessage(
      "salpbot Jr.を読み込みました。"
    );
  }


  init();

})();
