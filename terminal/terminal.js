(() => {
  "use strict";

  const KEYS = {
    fs: "salpTerminalFS_v3",
    history: "salpTerminalHistory_v3",
    mode: "salpTerminalMode_v3",
    apps: "salpTerminalApps_v3"
  };

  const APP_CATALOG = {
    pixel:    { name:"salp Pixel",   icon:"🎨", url:"Pixel.html" },
    frame:    { name:"salp Frame",   icon:"🖼️", url:"Frame.html" },
    resize:   { name:"Batch Resize", icon:"📐", url:"Resize.html" },
    color:    { name:"salp Color",   icon:"🎮", url:"Color.html" },
    qr:       { name:"QR Maker",     icon:"🔲", url:"qrcode.html" },
    runner:   { name:"HTML Runner",  icon:"💻", url:"html-runner.html" },
    terminal: { name:"Terminal",     icon:"💾", url:"terminal.html" },
    salpcode: { name:"salpCode",     icon:"🐱", url:"salpcode.html" },
    music:    { name:"salp Music",   icon:"🎵", url:"https://linktr.ee/salp" }
  };

  const $ = (id) => document.getElementById(id);

  const output = $("output");
  const commandInput = $("commandInput");
  const promptEl = $("prompt");
  const modeSelect = $("modeSelect");
  const modeLabel = $("modeLabel");
  const fsView = $("fsView");
  const pathStatus = $("pathStatus");
  const appGrid = $("appGrid");

  const editorModal = $("editorModal");
  const editor = $("editor");
  const editorTitle = $("editorTitle");

  const runModal = $("runModal");
  const runFrame = $("runFrame");
  const runTitle = $("runTitle");

  const filesModal = $("filesModal");
  const filesPath = $("filesPath");
  const fileGrid = $("fileGrid");

  const uploadInput = $("uploadInput");
  const importInput = $("importInput");

  let fs = loadJSON(KEYS.fs, defaultFS());
  let cwd = "/";
  let filesCwd = "/";
  let selectedPath = null;
  let editingPath = null;
  let history = loadJSON(KEYS.history, []);
  let historyIndex = history.length;
  let mode = localStorage.getItem(KEYS.mode) || "linux";
  let installedApps = loadJSON(
    KEYS.apps,
    ["pixel","frame","resize","qr","runner","terminal"]
  );

  function defaultFS() {
    return {
      type: "dir",
      children: {
        Documents: { type:"dir", children:{} },
        Projects: {
          type:"dir",
          children:{
            "hello.html":{
              type:"file",
              content:"<!doctype html><html><body style='font-family:sans-serif;padding:30px'><h1>Hello salp Terminal v3!</h1><p>This file runs inside the browser.</p></body></html>"
            }
          }
        },
        Music: { type:"dir", children:{} },
        Pictures: { type:"dir", children:{} },
        Apps: { type:"dir", children:{} },
        Downloads: { type:"dir", children:{} },
        System: {
          type:"dir",
          children:{
            "readme.txt":{
              type:"file",
              content:"salp Terminal v3\nTerminal + File Manager + App Launcher\nType help to see commands."
            }
          }
        }
      }
    };
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveFS() {
    localStorage.setItem(KEYS.fs, JSON.stringify(fs));
    renderFS();
    renderFiles();
  }

  function saveApps() {
    localStorage.setItem(KEYS.apps, JSON.stringify(installedApps));
    renderApps();
  }

  function normalize(path, base = cwd) {
    if (!path) return base;
    const full = path.startsWith("/")
      ? path
      : (base === "/" ? "/" + path : base + "/" + path);

    const parts = [];
    full.split("/").forEach((part) => {
      if (!part || part === ".") return;
      if (part === "..") parts.pop();
      else parts.push(part);
    });

    return "/" + parts.join("/");
  }

  function splitPath(path) {
    const normalized = normalize(path);
    return normalized === "/" ? [] : normalized.slice(1).split("/");
  }

  function getNode(path) {
    let node = fs;
    for (const part of splitPath(path)) {
      if (!node || node.type !== "dir" || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  function getParent(path) {
    const parts = splitPath(path);
    const name = parts.pop();
    const parentPath = "/" + parts.join("/");
    return {
      parent: getNode(parentPath || "/"),
      name,
      parentPath: parentPath || "/"
    };
  }

  function print(text = "", color = "") {
    const line = document.createElement("div");
    line.textContent = text;
    if (color) line.style.color = color;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  function promptString() {
    if (mode === "dos") {
      const path = cwd === "/"
        ? "C:\\"
        : "C:\\" + cwd.slice(1).replace(/\//g, "\\");
      return path + ">";
    }
    if (mode === "jp") return "端末:" + cwd + ">";
    return "salp@" + cwd + "$";
  }

  function updatePrompt() {
    promptEl.textContent = promptString();
    pathStatus.textContent = cwd;
    modeLabel.textContent =
      mode === "dos" ? "MS-DOS Mode" :
      mode === "jp" ? "日本語 Mode" :
      "Linux Mode";
  }

  function treeString(node, prefix = "") {
    let result = "";
    const entries = Object.entries(node.children || {});

    entries.forEach(([name, item], index) => {
      const last = index === entries.length - 1;
      result += prefix + (last ? "└─ " : "├─ ") + name + (item.type === "dir" ? "/" : "") + "\n";
      if (item.type === "dir") {
        result += treeString(item, prefix + (last ? "   " : "│  "));
      }
    });

    return result;
  }

  function renderFS() {
    fsView.textContent = "/\n" + treeString(fs);
  }

  function renderApps() {
    appGrid.innerHTML = "";

    installedApps.forEach((key) => {
      const app = APP_CATALOG[key];
      if (!app) return;

      const button = document.createElement("button");
      button.textContent = app.icon + " " + app.name;
      button.addEventListener("click", () => openApp(key));
      appGrid.appendChild(button);
    });

    if (!installedApps.length) {
      appGrid.textContent = "No apps";
    }
  }

  function openApp(key) {
    const app = APP_CATALOG[key];
    if (!app) throw new Error("app not found");

    if (key === "terminal") {
      print("salp Terminal is already open.");
      return;
    }

    window.open(app.url, "_blank", "noopener");
    print("open app: " + app.name, "#72f29a");
  }

  function showModal(modal) {
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  function hideModal(modal) {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  function openEditor(path) {
    let node = getNode(path);

    if (node && node.type === "dir") {
      throw new Error("cannot edit directory");
    }

    if (!node) {
      const { parent, name } = getParent(path);
      if (!parent || parent.type !== "dir") throw new Error("parent not found");
      parent.children[name] = { type:"file", content:"" };
      saveFS();
      node = getNode(path);
    }

    editingPath = path;
    editorTitle.textContent = "Edit: " + path;
    editor.value = node.content || "";
    showModal(editorModal);
    setTimeout(() => editor.focus(), 50);
  }

  function openFiles(path = cwd) {
    filesCwd = normalize(path);
    selectedPath = null;
    renderFiles();
    showModal(filesModal);
  }

  function fileIcon(name) {
    const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
    if (["html","htm"].includes(ext)) return "🌐";
    if (["png","jpg","jpeg","gif","webp"].includes(ext)) return "🖼️";
    if (["js","css","json"].includes(ext)) return "🧩";
    if (["mp3","wav","m4a"].includes(ext)) return "🎵";
    return "📄";
  }

  function renderFiles() {
    if (!fileGrid) return;

    const dir = getNode(filesCwd);
    filesPath.textContent = filesCwd;
    fileGrid.innerHTML = "";

    if (!dir || dir.type !== "dir") {
      fileGrid.textContent = "Directory not found";
      return;
    }

    Object.entries(dir.children).forEach(([name, item]) => {
      const path = normalize(name, filesCwd);
      const button = document.createElement("button");
      button.className = "file-item";
      button.dataset.path = path;

      const icon = document.createElement("div");
      icon.className = "file-icon";
      icon.textContent = item.type === "dir" ? "📁" : fileIcon(name);

      const label = document.createElement("div");
      label.className = "file-name";
      label.textContent = name;

      button.append(icon, label);

      button.addEventListener("click", () => {
        selectedPath = path;
        document.querySelectorAll(".file-item").forEach((el) => {
          el.classList.toggle("selected", el === button);
        });
      });

      button.addEventListener("dblclick", () => {
        if (item.type === "dir") {
          filesCwd = path;
          selectedPath = null;
          renderFiles();
        } else {
          openSelected();
        }
      });

      fileGrid.appendChild(button);
    });
  }

  function openSelected() {
    if (!selectedPath) return;
    const node = getNode(selectedPath);
    if (!node) return;

    if (node.type === "dir") {
      filesCwd = selectedPath;
      selectedPath = null;
      renderFiles();
      return;
    }

    if (/\.html?$/i.test(selectedPath)) {
      runTitle.textContent = "Run: " + selectedPath;
      runFrame.srcdoc = node.content;
      showModal(runModal);
    } else {
      openEditor(selectedPath);
    }
  }

  function downloadText(filename, content, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 1000);
  }

  function downloadVirtualFile(path) {
    const node = getNode(path);
    if (!node || node.type !== "file") throw new Error("file not found");

    const filename = splitPath(path).pop() || "file.txt";
    const type =
      /\.html?$/i.test(filename) ? "text/html" :
      /\.json$/i.test(filename) ? "application/json" :
      "text/plain";

    downloadText(filename, node.content, type);
  }

  function exportFS() {
    downloadText(
      "salp-terminal-filesystem.json",
      JSON.stringify({ app:"salp Terminal", version:3, fs }, null, 2),
      "application/json"
    );
  }

  const aliases = {
    dir: "ls",
    一覧: "ls",
    移動: "cd",
    作成: "mkdir",
    削除: "rm",
    開く: "cat",
    履歴: "history",
    木: "tree",
    消去: "clear",
    コピー: "copy",
    ファイル: "files"
  };

  function runCommand(raw) {
    const input = raw.trim();
    if (!input) return;

    print(promptString() + " " + input, "#6fd8ff");

    history.push(input);
    if (history.length > 100) history.shift();
    localStorage.setItem(KEYS.history, JSON.stringify(history));
    historyIndex = history.length;

    const parts = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    let cmd = (parts.shift() || "").toLowerCase();
    cmd = aliases[cmd] || cmd;
    const args = parts.map((part) => part.replace(/^"|"$/g, ""));

    try {
      execute(cmd, args);
    } catch (error) {
      print("Error: " + error.message, "#ff8f8f");
    }
  }

  function execute(cmd, args) {
    if (cmd === "help") {
      print(
`FILE COMMANDS
ls / dir / 一覧
cd <path>
mkdir <path>
touch <file>
write <file> <text>
edit <file>
cat <file>
rm <path>
copy <from> <to>
move <from> <to>
tree
pwd
download <file>
upload
files

APP COMMANDS
apps
list apps
open <app>
install <app>
uninstall <app>

SYSTEM
history
clear
run <file.html>
mode linux|dos|jp
exportfs
importfs
version`
      );
      return;
    }

    if (cmd === "ls") {
      const node = getNode(args[0] || cwd);
      if (!node) throw new Error("path not found");

      if (node.type === "file") {
        print(args[0] || cwd);
        return;
      }

      print(
        Object.entries(node.children)
          .map(([name, item]) => name + (item.type === "dir" ? "/" : ""))
          .join("  ") || "(empty)"
      );
      return;
    }

    if (cmd === "cd") {
      const path = normalize(args[0] || "/");
      const node = getNode(path);
      if (!node || node.type !== "dir") throw new Error("directory not found");
      cwd = path;
      updatePrompt();
      return;
    }

    if (cmd === "pwd") {
      print(cwd);
      return;
    }

    if (cmd === "mkdir") {
      if (!args[0]) throw new Error("usage: mkdir <path>");
      const { parent, name } = getParent(args[0]);
      if (!parent || parent.type !== "dir") throw new Error("parent not found");
      if (parent.children[name]) throw new Error("already exists");
      parent.children[name] = { type:"dir", children:{} };
      saveFS();
      return;
    }

    if (cmd === "touch") {
      if (!args[0]) throw new Error("usage: touch <file>");
      const { parent, name } = getParent(args[0]);
      if (!parent || parent.type !== "dir") throw new Error("parent not found");
      if (!parent.children[name]) parent.children[name] = { type:"file", content:"" };
      saveFS();
      return;
    }

    if (cmd === "write") {
      if (!args[0]) throw new Error("usage: write <file> <text>");
      const { parent, name } = getParent(args[0]);
      if (!parent || parent.type !== "dir") throw new Error("parent not found");
      parent.children[name] = {
        type:"file",
        content:args.slice(1).join(" ")
      };
      saveFS();
      return;
    }

    if (cmd === "cat") {
      if (!args[0]) throw new Error("usage: cat <file>");
      const node = getNode(args[0]);
      if (!node || node.type !== "file") throw new Error("file not found");
      print(node.content);
      return;
    }

    if (cmd === "edit") {
      if (!args[0]) throw new Error("usage: edit <file>");
      openEditor(normalize(args[0]));
      return;
    }

    if (cmd === "rm") {
      if (!args[0]) throw new Error("usage: rm <path>");
      const path = normalize(args[0]);
      if (path === "/") throw new Error("cannot delete root");
      const { parent, name } = getParent(path);
      if (!parent || !parent.children[name]) throw new Error("not found");
      delete parent.children[name];
      if (cwd === path || cwd.startsWith(path + "/")) cwd = "/";
      saveFS();
      updatePrompt();
      return;
    }

    if (cmd === "copy") {
      if (args.length < 2) throw new Error("usage: copy <from> <to>");
      const source = getNode(args[0]);
      if (!source) throw new Error("source not found");
      const { parent, name } = getParent(args[1]);
      if (!parent || parent.type !== "dir") throw new Error("target parent not found");
      parent.children[name] = JSON.parse(JSON.stringify(source));
      saveFS();
      return;
    }

    if (cmd === "move") {
      if (args.length < 2) throw new Error("usage: move <from> <to>");
      const sourcePath = normalize(args[0]);
      const source = getNode(sourcePath);
      if (!source) throw new Error("source not found");

      const target = getParent(args[1]);
      if (!target.parent || target.parent.type !== "dir") {
        throw new Error("target parent not found");
      }

      target.parent.children[target.name] = source;

      const sourceParent = getParent(sourcePath);
      delete sourceParent.parent.children[sourceParent.name];
      saveFS();
      return;
    }

    if (cmd === "tree") {
      const node = getNode(args[0] || cwd);
      if (!node) throw new Error("path not found");
      print((args[0] || cwd) + "\n" + treeString(node));
      return;
    }

    if (cmd === "download") {
      if (!args[0]) throw new Error("usage: download <file>");
      const path = normalize(args[0]);
      downloadVirtualFile(path);
      print("download started: " + path, "#72f29a");
      return;
    }

    if (cmd === "upload") {
      uploadInput.click();
      return;
    }

    if (cmd === "files" || cmd === "explorer") {
      openFiles(args[0] || cwd);
      return;
    }

    if (cmd === "apps" || (cmd === "list" && args[0] === "apps")) {
      installedApps.forEach((key) => {
        const app = APP_CATALOG[key];
        if (app) print(key + " - " + app.name);
      });
      return;
    }

    if (cmd === "open") {
      if (!args[0]) throw new Error("usage: open <app>");
      openApp(args[0].toLowerCase());
      return;
    }

    if (cmd === "install") {
      const key = (args[0] || "").toLowerCase();
      if (!APP_CATALOG[key]) throw new Error("unknown app");

      if (installedApps.includes(key)) {
        print("already installed: " + key);
        return;
      }

      installedApps.push(key);
      saveApps();
      print("installed: " + APP_CATALOG[key].name, "#72f29a");
      return;
    }

    if (cmd === "uninstall") {
      const key = (args[0] || "").toLowerCase();
      installedApps = installedApps.filter((item) => item !== key);
      saveApps();
      print("uninstalled: " + key, "#ffca67");
      return;
    }

    if (cmd === "run") {
      if (!args[0]) throw new Error("usage: run <file.html>");
      const path = normalize(args[0]);
      const node = getNode(path);
      if (!node || node.type !== "file") throw new Error("file not found");

      runTitle.textContent = "Run: " + path;
      runFrame.srcdoc = node.content;
      showModal(runModal);
      return;
    }

    if (cmd === "history") {
      history.forEach((item, index) => print((index + 1) + "  " + item));
      return;
    }

    if (cmd === "clear") {
      output.innerHTML = "";
      return;
    }

    if (cmd === "mode") {
      if (!["linux","dos","jp"].includes(args[0])) {
        throw new Error("mode linux|dos|jp");
      }
      mode = args[0];
      modeSelect.value = mode;
      localStorage.setItem(KEYS.mode, mode);
      updatePrompt();
      return;
    }

    if (cmd === "exportfs") {
      exportFS();
      print("filesystem exported.", "#72f29a");
      return;
    }

    if (cmd === "importfs") {
      importInput.click();
      return;
    }

    if (cmd === "version") {
      print("salp Terminal v3.0.0");
      return;
    }

    print("command not found: " + cmd, "#ff8f8f");
  }

  $("saveEditorBtn").addEventListener("click", () => {
    const node = getNode(editingPath);
    if (node && node.type === "file") {
      node.content = editor.value;
      saveFS();
      print("saved: " + editingPath, "#72f29a");
    }
    hideModal(editorModal);
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      const modal = $(button.dataset.close);
      hideModal(modal);
      if (modal === runModal) runFrame.srcdoc = "";
    });
  });

  $("openFilesBtn").addEventListener("click", () => openFiles(cwd));

  $("upBtn").addEventListener("click", () => {
    filesCwd = normalize("..", filesCwd);
    selectedPath = null;
    renderFiles();
  });

  $("newFolderBtn").addEventListener("click", () => {
    const name = prompt("新しいフォルダ名");
    if (!name) return;

    const dir = getNode(filesCwd);
    if (dir.children[name]) {
      alert("同じ名前があります");
      return;
    }

    dir.children[name] = { type:"dir", children:{} };
    saveFS();
  });

  $("newFileBtn").addEventListener("click", () => {
    const name = prompt("新しいファイル名");
    if (!name) return;

    const dir = getNode(filesCwd);
    if (dir.children[name]) {
      alert("同じ名前があります");
      return;
    }

    dir.children[name] = { type:"file", content:"" };
    saveFS();
  });

  $("uploadBtn").addEventListener("click", () => uploadInput.click());
  $("openSelectedBtn").addEventListener("click", openSelected);

  $("editSelectedBtn").addEventListener("click", () => {
    if (!selectedPath) return;
    const node = getNode(selectedPath);
    if (node && node.type === "file") openEditor(selectedPath);
  });

  $("downloadSelectedBtn").addEventListener("click", () => {
    if (!selectedPath) return;
    try {
      downloadVirtualFile(selectedPath);
    } catch (error) {
      alert(error.message);
    }
  });

  $("renameSelectedBtn").addEventListener("click", () => {
    if (!selectedPath) return;

    const oldName = splitPath(selectedPath).pop();
    const newName = prompt("新しい名前", oldName);
    if (!newName || newName === oldName) return;

    const source = getParent(selectedPath);

    if (source.parent.children[newName]) {
      alert("同じ名前があります");
      return;
    }

    source.parent.children[newName] = source.parent.children[source.name];
    delete source.parent.children[source.name];
    selectedPath = null;
    saveFS();
  });

  $("deleteSelectedBtn").addEventListener("click", () => {
    if (!selectedPath) return;
    if (!confirm("削除しますか？")) return;

    const { parent, name } = getParent(selectedPath);
    delete parent.children[name];
    selectedPath = null;
    saveFS();
  });

  $("clearSelectedBtn").addEventListener("click", () => {
    selectedPath = null;
    renderFiles();
  });

  uploadInput.addEventListener("change", async () => {
    const files = Array.from(uploadInput.files || []);
    const targetPath = filesModal.classList.contains("show") ? filesCwd : cwd;
    const targetDir = getNode(targetPath);

    for (const file of files) {
      const text = await file.text();
      targetDir.children[file.name] = { type:"file", content:text };
    }

    uploadInput.value = "";
    saveFS();
    print(files.length + " file(s) uploaded.", "#72f29a");
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());
      if (!data.fs || data.fs.type !== "dir") throw new Error("invalid filesystem");

      fs = data.fs;
      cwd = "/";
      filesCwd = "/";
      saveFS();
      updatePrompt();
      print("filesystem imported.", "#72f29a");
    } catch (error) {
      alert("読み込めませんでした: " + error.message);
    }

    importInput.value = "";
  });

  modeSelect.value = mode;
  modeSelect.addEventListener("change", () => {
    mode = modeSelect.value;
    localStorage.setItem(KEYS.mode, mode);
    updatePrompt();
  });

  $("resetBtn").addEventListener("click", () => {
    if (!confirm("仮想ファイルシステムを初期化しますか？")) return;
    fs = defaultFS();
    cwd = "/";
    filesCwd = "/";
    saveFS();
    updatePrompt();
    print("filesystem reset.", "#ffca67");
  });

  document.querySelectorAll("[data-cmd]").forEach((button) => {
    button.addEventListener("click", () => {
      runCommand(button.dataset.cmd);
      commandInput.focus();
    });
  });

  commandInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const value = commandInput.value;
      commandInput.value = "";
      runCommand(value);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (historyIndex > 0) historyIndex--;
      commandInput.value = history[historyIndex] || "";
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex < history.length) historyIndex++;
      commandInput.value = history[historyIndex] || "";
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      autocomplete();
    }
  });

  function autocomplete() {
    const text = commandInput.value;
    const parts = text.split(/\s+/);
    const last = parts[parts.length - 1];
    const slashIndex = last.lastIndexOf("/");
    const basePath = slashIndex >= 0 ? last.slice(0, slashIndex + 1) : "";
    const partial = slashIndex >= 0 ? last.slice(slashIndex + 1) : last;
    const dir = getNode(normalize(basePath || "."));

    if (!dir || dir.type !== "dir") return;

    const matches = Object.keys(dir.children)
      .filter((name) => name.startsWith(partial));

    if (matches.length === 1) {
      const match = matches[0];
      parts[parts.length - 1] =
        basePath + match + (dir.children[match].type === "dir" ? "/" : "");
      commandInput.value = parts.join(" ");
    } else if (matches.length > 1) {
      print(matches.join("  "));
    }
  }

  print("salp Terminal v3");
  print("Terminal + File Manager + App Launcher");
  print("Type help to see commands.");
  print("");

  updatePrompt();
  renderFS();
  renderApps();
  commandInput.focus();
})();
