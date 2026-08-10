(() => {
  "use strict";

  const STORAGE_KEY = "sage100_v1";
  const TOTAL_DAYS = 100;

  const quests = [
    ["Reset", "15-Minute Reset", "Clean or organize one small area for 15 minutes.", 10, 2],
    ["School", "Lock-In", "Do 30 minutes of focused schoolwork with distractions away.", 15, 3],
    ["Creator", "Creator Mode", "Create one gaming clip, Short, thumbnail, idea, or recording.", 20, 3],
    ["Discipline", "No-Snooze Mission", "Get up when your alarm goes off and start your first task.", 10, 2],
    ["Learning", "Skill Tree", "Spend 25 minutes learning a useful skill.", 15, 3],
    ["Life", "Future Sage", "Write down three things you want your future self to accomplish.", 10, 1],
    ["Creator", "Idea Forge", "Write five gaming content ideas. Pick your favorite.", 15, 2],
    ["School", "Boss Battle", "Work for 45 minutes on the school topic you find hardest.", 20, 4],
    ["Life", "Digital Cleanup", "Delete or organize 20 unnecessary files, screenshots, or downloads.", 10, 2],
    ["Discipline", "Finish One Thing", "Choose one small unfinished task and finish it completely.", 15, 3]
  ];

  const sideQuests = [
    "Drink some water and take a 5-minute screen break.",
    "Write one sentence about what went well today.",
    "Do 10 minutes of reading.",
    "Organize your next day's tasks.",
    "Send a genuine thank-you message to someone.",
    "Spend 10 minutes improving an old piece of content.",
    "Put five things back where they belong."
  ];

  const $ = id => document.getElementById(id);

  function freshState() {
    return {
      startDate: localDateString(),
      completedDays: [],
      completedDates: [],
      completedSideDates: [],
      xp: 0,
      log: []
    };
  }

  function localDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshState();
      const data = JSON.parse(raw);
      return { ...freshState(), ...data };
    } catch {
      return freshState();
    }
  }

  let state = load();

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function dateFromString(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function dayNumber() {
    const start = dateFromString(state.startDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.floor((today - start) / 86400000);
    return Math.max(1, Math.min(TOTAL_DAYS, diff + 1));
  }

  function questForDay(day) {
    return quests[(day - 1) % quests.length];
  }

  function xpForLevel(level) {
    return level * 100;
  }

  function levelFromXp(xp) {
    let level = 1;
    let remaining = Math.max(0, xp);
    while (remaining >= xpForLevel(level)) {
      remaining -= xpForLevel(level);
      level++;
      if (level > 1000) break;
    }
    return { level, into: remaining, needed: xpForLevel(level) };
  }

  function streak() {
    const set = new Set(state.completedDates);
    let count = 0;
    const cursor = new Date();
    while (set.has(localDateString(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function addLog(text) {
    state.log.unshift({ text, at: new Date().toLocaleString() });
    state.log = state.log.slice(0, 12);
  }

  function render() {
    const day = dayNumber();
    const [category, title, description, xp, difficulty] = questForDay(day);
    const dateKey = localDateString();
    const done = state.completedDays.includes(day);
    const sideDone = state.completedSideDates.includes(dateKey);
    const lvl = levelFromXp(state.xp);

    $("dayNumber").textContent = day;
    $("levelLabel").textContent = `Level ${lvl.level}`;
    $("xpLabel").textContent = `${state.xp} XP`;
    $("xpBar").style.width = `${Math.round((lvl.into / lvl.needed) * 100)}%`;
    $("nextLevelLabel").textContent = `${lvl.needed - lvl.into} XP to next level`;
    $("streakLabel").textContent = streak();
    $("completedLabel").textContent = state.completedDays.length;

    $("categoryLabel").textContent = category;
    $("questTitle").textContent = title;
    $("questDescription").textContent = description;
    $("xpReward").textContent = `+${xp} XP`;
    $("difficultyBadge").textContent = "⭐".repeat(difficulty);
    $("questStatus").textContent = done ? "✅ Completed" : "Not completed";
    $("completeBtn").disabled = done || state.completedDays.length >= TOTAL_DAYS;
    $("completeBtn").textContent = done ? "Quest Completed ✓" : "Complete Quest";

    $("sideQuestText").textContent = sideQuests[(day - 1) % sideQuests.length];
    $("sideXp").textContent = "+5 XP";
    $("sideCompleteBtn").disabled = sideDone;
    $("sideCompleteBtn").textContent = sideDone ? "Side Quest Completed ✓" : "Complete Side Quest";

    const pct = Math.round((state.completedDays.length / TOTAL_DAYS) * 100);
    $("mapSummary").textContent = `${pct}%`;
    renderGrid();
    renderLog();
  }

  function renderGrid() {
    const grid = $("dayGrid");
    grid.innerHTML = "";
    const today = dayNumber();
    for (let i = 1; i <= TOTAL_DAYS; i++) {
      const el = document.createElement("div");
      el.className = "day";
      if (state.completedDays.includes(i)) el.classList.add("done");
      if (i === today) el.classList.add("today");
      el.textContent = i;
      el.title = `Day ${i}`;
      grid.appendChild(el);
    }
  }

  function renderLog() {
    const log = $("log");
    if (!state.log.length) {
      log.innerHTML = '<div class="log-entry">No level-up events yet. Start the grind. ⚔️</div>';
      return;
    }
    log.innerHTML = state.log.map(x =>
      `<div class="log-entry"><strong>${escapeHtml(x.text)}</strong><br><small>${escapeHtml(x.at)}</small></div>`
    ).join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    }[c]));
  }

  function completeMain() {
    const day = dayNumber();
    if (state.completedDays.includes(day)) return;

    const before = levelFromXp(state.xp).level;
    const xp = questForDay(day)[3];

    state.completedDays.push(day);
    state.completedDates.push(localDateString());
    state.xp += xp;
    state.completedDays = [...new Set(state.completedDays)].sort((a,b) => a-b);
    state.completedDates = [...new Set(state.completedDates)].sort();
    addLog(`Day ${day} completed — +${xp} XP`);
    save();
    render();

    const after = levelFromXp(state.xp).level;
    if (after > before) showLevelUp(after);
  }

  function completeSide() {
    const key = localDateString();
    if (state.completedSideDates.includes(key)) return;
    state.completedSideDates.push(key);
    state.xp += 5;
    addLog(`Side Quest completed — +5 XP`);
    save();
    render();
  }

  function showLevelUp(level) {
    $("levelUpTitle").textContent = `SAGE LEVEL ${level}!`;
    $("levelUpText").textContent = `You leveled up. Keep building the next version of yourself.`;
    const dialog = $("levelDialog");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else alert(`SAGE LEVEL ${level}!`);
  }

  $("completeBtn").addEventListener("click", completeMain);
  $("sideCompleteBtn").addEventListener("click", completeSide);
  $("closeDialog").addEventListener("click", () => $("levelDialog").close());

  $("randomBtn").addEventListener("click", () => {
    const q = quests[Math.floor(Math.random() * quests.length)];
    $("questTitle").textContent = `🎲 ${q[1]}`;
    $("questDescription").textContent = q[2];
    $("categoryLabel").textContent = q[0];
    $("xpReward").textContent = `+${q[3]} XP`;
    $("difficultyBadge").textContent = "⭐".repeat(q[4]);
    $("questStatus").textContent = "Random quest — not part of today's Day quest.";
  });

  $("resetBtn").addEventListener("click", () => {
    const ok = confirm("Reset ALL SAGE-100 progress? This cannot be undone.");
    if (!ok) return;
    state = freshState();
    save();
    render();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }

  render();
})();
