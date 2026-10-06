(() => {
  "use strict";

  const ACTIVE_KEY = "salpbot-jr.brain.active.v1";

  const providers = new Map();

  let activeId =
    localStorage.getItem(ACTIVE_KEY) ||
    defaultProviderId();


  // Step 2 からの移行:
  // まだ選択を保存していない端末で Worker URL + Token が揃っていれば
  // 従来どおり ONLINE (worker-openai) から始める。
  function defaultProviderId() {
    try {
      const connection =
        window.SalpbotMemory
          ?.loadConnectionSettings?.();

      if (
        connection?.workerUrl &&
        connection?.token
      ) {
        return "worker-openai";
      }
    } catch {
      // ignore
    }

    return "local";
  }


  function register(id, adapter) {
    if (!id || typeof id !== "string") {
      throw new Error("Provider id is required.");
    }

    if (
      !adapter ||
      typeof adapter.send !== "function"
    ) {
      throw new Error(
        `Provider "${id}" needs send().`
      );
    }

    providers.set(id, {
      id,

      label:
        adapter.label ||
        id,

      ...adapter
    });

    return providers.get(id);
  }


  function list() {
    return Array.from(
      providers.values()
    ).map((provider) => ({
      id: provider.id,
      label: provider.label
    }));
  }


  function get(id = activeId) {
    return (
      providers.get(id) ||
      null
    );
  }


  function setActive(id) {
    if (!providers.has(id)) {
      throw new Error(
        `Unknown brain provider: ${id}`
      );
    }

    activeId = id;

    localStorage.setItem(
      ACTIVE_KEY,
      id
    );

    return get();
  }


  function getActiveId() {
    return activeId;
  }


  async function send(payload) {
    const provider =
      get();

    if (!provider) {
      throw new Error(
        `Brain provider "${activeId}" is not registered.`
      );
    }

    return await provider.send(
      payload
    );
  }


  // =========================================================
  // local
  // =========================================================

  register(
    "local",
    {
      label: "Local",

      async send({
        personality
      }) {
        return (
          personality?.local_reply ||
          "了解、カネちゃん。今はLOCALモードだよ。"
        );
      }
    }
  );


  // =========================================================
  // worker-openai
  // =========================================================

  register(
    "worker-openai",
    {
      label: "OpenAI (Worker)",

      async send({
        personality,
        memories,
        history,
        message
      }) {
        const memoryAPI =
          window.SalpbotMemory;

        if (!memoryAPI) {
          throw new Error(
            "Memory APIがありません。"
          );
        }

        const connection =
          memoryAPI
            .loadConnectionSettings();

        if (
          !connection.workerUrl ||
          !connection.token
        ) {
          throw new Error(
            "Worker URLまたはアクセストークンが未設定です。"
          );
        }

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
                    memories || [],

                  history:
                    history || [],

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
    }
  );


  window.SalpbotBrain = {
    register,
    list,
    get,
    setActive,
    getActiveId,
    send,

    ACTIVE_KEY
  };

})();
