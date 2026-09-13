(() => {
  "use strict";

  /* ---------------- Data ---------------- */

  const LS_SUBJECTS = "studyflow_subjects_v2";
  const LS_TASKS = "studyflow_tasks_v1";
  const LS_SUBJECTS_LEGACY = "studyflow_subjects_v1";

  const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]; // index matches Date.getDay()
  const DAY_LABELS = { sun: "日", mon: "月", tue: "火", wed: "水", thu: "木", fri: "金", sat: "土" };
  const DAY_TAB_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  const PRESET_SUBJECTS = [
    "英語構文HA",
    "精選現代文読解研究",
    "物理X Part1",
    "数学XB §3",
    "数学XB §1",
    "パワーアップ難関大理系数学",
    "化学S Part1",
    "数学ZB §1",
    "共通テスト英語演習",
    "物理X Part2",
    "難関大英語研究",
    "パワーアップ難関大英語",
    "数学XB §2",
    "漢文（共通テスト対策編）",
    "数学ZB §2",
    "難関大理系数学研究",
    "古文（基礎共通テスト対策）",
    "英文法実践S",
    "共通テスト現代文",
    "数学ZB §3",
    "和文英訳H",
    "英文読解H",
    "数学ZB §4",
    "化学S Part2",
    "パワーアップ難関大化学",
    "パワーアップ難関大物理",
    "地理（系統地理地史）",
  ];

  // Initial weekly timetable supplied by the user (prep only — review is left for
  // the user to configure themselves in the settings weekday tabs).
  const PRESET_SCHEDULE = {
    "英語構文HA": ["mon"],
    "精選現代文読解研究": ["mon"],
    "物理X Part1": ["mon"],
    "数学XB §3": ["mon"],
    "数学XB §1": ["mon"],
    "数学ZB §1": ["tue"],
    "物理X Part2": ["tue"],
    "数学XB §2": ["wed"],
    "漢文（共通テスト対策編）": ["wed"],
    "数学ZB §2": ["wed"],
    "難関大理系数学研究": ["wed"],
    "古文（基礎共通テスト対策）": ["thu"],
    "共通テスト現代文": ["thu"],
    "数学ZB §3": ["fri"],
    "和文英訳H": ["fri"],
    "英文読解H": ["fri"],
    "数学ZB §4": ["fri"],
    "化学S Part2": ["fri"],
  };

  function emptySchedule() {
    const s = {};
    DAY_KEYS.forEach((d) => { s[d] = { prep: false, review: false }; });
    return s;
  }

  function uid(prefix) {
    if (window.crypto && crypto.randomUUID) return prefix + "-" + crypto.randomUUID();
    return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
  }

  function buildPresetSubjects() {
    return PRESET_SUBJECTS.map((name) => {
      const schedule = emptySchedule();
      (PRESET_SCHEDULE[name] || []).forEach((day) => { schedule[day].prep = true; });
      return { id: uid("subj"), name, preset: true, schedule };
    });
  }

  function normalizeSubject(s) {
    // Ensure every subject has a full, well-formed schedule object, migrating
    // the old single "defaultPrep/defaultReview" flag (applied every day) if present.
    if (!s.schedule) {
      const schedule = emptySchedule();
      if (s.defaultPrep || s.defaultReview) {
        DAY_KEYS.forEach((d) => {
          schedule[d].prep = !!s.defaultPrep;
          schedule[d].review = !!s.defaultReview;
        });
      }
      s.schedule = schedule;
    } else {
      DAY_KEYS.forEach((d) => {
        if (!s.schedule[d]) s.schedule[d] = { prep: false, review: false };
      });
    }
    delete s.defaultPrep;
    delete s.defaultReview;
    return s;
  }

  function loadSubjects() {
    let raw = localStorage.getItem(LS_SUBJECTS);
    if (raw) {
      try {
        const subjects = JSON.parse(raw).map(normalizeSubject);
        return subjects;
      } catch (e) { /* fall through to rebuild */ }
    }
    // migrate from the older key if present, else start fresh
    raw = localStorage.getItem(LS_SUBJECTS_LEGACY);
    if (raw) {
      try {
        const subjects = JSON.parse(raw).map(normalizeSubject);
        saveSubjects(subjects);
        return subjects;
      } catch (e) { /* fall through to rebuild */ }
    }
    const subjects = buildPresetSubjects();
    saveSubjects(subjects);
    return subjects;
  }

  function saveSubjects(subjects) {
    localStorage.setItem(LS_SUBJECTS, JSON.stringify(subjects));
  }

  function loadAllTasks() {
    const raw = localStorage.getItem(LS_TASKS);
    if (!raw) return {};
    try { return JSON.parse(raw); } catch (e) { return {}; }
  }

  function saveAllTasks(all) {
    localStorage.setItem(LS_TASKS, JSON.stringify(all));
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function dateKey(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function dayKeyForDate(d) {
    return DAY_KEYS[d.getDay()];
  }

  function formatDate(d) {
    const week = ["日", "月", "火", "水", "木", "金", "土"];
    return `${d.getMonth() + 1}月${d.getDate()}日（${week[d.getDay()]}）`;
  }

  function newTask(subjectId, type) {
    return { id: uid("task"), subjectId, type, done: false };
  }

  function getTasksForDate(key, dayKey) {
    const all = loadAllTasks();
    if (all[key]) return all[key];
    const tasks = [];
    subjects.forEach((s) => {
      const sched = s.schedule[dayKey];
      if (sched.prep) tasks.push(newTask(s.id, "prep"));
      if (sched.review) tasks.push(newTask(s.id, "review"));
    });
    all[key] = tasks;
    saveAllTasks(all);
    return tasks;
  }

  function setTasksForDate(key, tasks) {
    const all = loadAllTasks();
    all[key] = tasks;
    saveAllTasks(all);
  }

  /* ---------------- State ---------------- */

  let currentDate = new Date();
  let subjects = loadSubjects();
  let settingsSelectedDay = dayKeyForDate(currentDate);

  /* ---------------- DOM refs ---------------- */

  const dateLabel = document.getElementById("dateLabel");
  const prevDateBtn = document.getElementById("prevDate");
  const nextDateBtn = document.getElementById("nextDate");
  const cardList = document.getElementById("cardList");
  const emptyState = document.getElementById("emptyState");
  const progressLabel = document.getElementById("progressLabel");
  const progressFill = document.getElementById("progressFill");
  const addBtn = document.getElementById("addBtn");

  const addSheetOverlay = document.getElementById("addSheetOverlay");
  const addSheetDayLabel = document.getElementById("addSheetDayLabel");
  const subjectChips = document.getElementById("subjectChips");
  const noChipsMessage = document.getElementById("noChipsMessage");
  const toggleOtherSubjectsBtn = document.getElementById("toggleOtherSubjects");
  const otherSubjectsWrap = document.getElementById("otherSubjectsWrap");
  const subjectSelect = document.getElementById("subjectSelect");
  const typeButtons = Array.from(document.querySelectorAll(".type-btn"));
  const cancelAddBtn = document.getElementById("cancelAdd");
  const confirmAddBtn = document.getElementById("confirmAdd");

  const settingsBtn = document.getElementById("settingsBtn");
  const settingsOverlay = document.getElementById("settingsOverlay");
  const weekdayTabs = document.getElementById("weekdayTabs");
  const subjectManageList = document.getElementById("subjectManageList");
  const newSubjectInput = document.getElementById("newSubjectInput");
  const addSubjectBtn = document.getElementById("addSubjectBtn");
  const closeSettingsBtn = document.getElementById("closeSettings");

  const confirmOverlay = document.getElementById("confirmOverlay");
  const confirmMessage = document.getElementById("confirmMessage");
  const confirmCancelBtn = document.getElementById("confirmCancel");
  const confirmOkBtn = document.getElementById("confirmOk");

  let selectedType = "prep";
  let selectedSubjectId = null;
  let pendingConfirmAction = null;

  /* ---------------- Rendering (main list) ---------------- */

  function render() {
    dateLabel.textContent = formatDate(currentDate);
    const key = dateKey(currentDate);
    const dayKey = dayKeyForDate(currentDate);
    const tasks = getTasksForDate(key, dayKey);
    const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s]));

    cardList.innerHTML = "";

    if (tasks.length === 0) {
      emptyState.classList.remove("hidden");
    } else {
      emptyState.classList.add("hidden");
      tasks.forEach((task) => {
        const subject = subjectMap[task.subjectId];
        const name = subject ? subject.name : "(削除された授業)";
        cardList.appendChild(buildCard(task, name));
      });
    }

    updateProgress(tasks);
  }

  function buildCard(task, name) {
    const card = document.createElement("div");
    card.className = "card" + (task.done ? " done" : "");
    card.dataset.id = task.id;

    const check = document.createElement("button");
    check.className = "check-btn";
    check.type = "button";
    check.setAttribute("aria-label", "完了を切り替え");
    check.innerHTML =
      '<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.7L13 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    check.addEventListener("click", () => toggleDone(task.id, card));

    const body = document.createElement("div");
    body.className = "card-body";

    const nameEl = document.createElement("div");
    nameEl.className = "subject-name";
    nameEl.textContent = name;

    const typeEl = document.createElement("div");
    typeEl.className = "task-type " + (task.type === "prep" ? "type-prep" : "type-review");
    typeEl.textContent = task.type === "prep" ? "予習" : "復習";

    body.appendChild(nameEl);
    body.appendChild(typeEl);

    const handle = document.createElement("div");
    handle.className = "drag-handle";
    handle.textContent = "⋮⋮";
    handle.setAttribute("aria-hidden", "true");

    card.appendChild(check);
    card.appendChild(body);
    card.appendChild(handle);

    return card;
  }

  function toggleDone(taskId, cardEl) {
    const key = dateKey(currentDate);
    const dayKey = dayKeyForDate(currentDate);
    const tasks = getTasksForDate(key, dayKey);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.done = !task.done;
    setTasksForDate(key, tasks);
    cardEl.classList.toggle("done", task.done);
    updateProgress(tasks);
  }

  function updateProgress(tasks) {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    progressLabel.textContent = `${done} / ${total} 完了`;
    progressFill.style.width = total ? `${(done / total) * 100}%` : "0%";
  }

  /* ---------------- Date navigation ---------------- */

  prevDateBtn.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() - 1);
    render();
  });
  nextDateBtn.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() + 1);
    render();
  });

  /* ---------------- Add task sheet ---------------- */

  function openAddSheet() {
    subjects = loadSubjects();
    const dayKey = dayKeyForDate(currentDate);
    const dayLabel = DAY_LABELS[dayKey];

    addSheetDayLabel.textContent = `${dayLabel}曜日の授業`;

    selectedSubjectId = null;
    selectedType = "prep";
    typeButtons.forEach((b) => b.classList.toggle("active", b.dataset.type === "prep"));

    // Chips: only subjects that have prep or review scheduled for this weekday.
    const dayHasSubjects = subjects.filter((s) => s.schedule[dayKey].prep || s.schedule[dayKey].review);
    subjectChips.innerHTML = "";
    dayHasSubjects.forEach((s) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = s.name;
      chip.dataset.id = s.id;
      chip.addEventListener("click", () => {
        selectedSubjectId = s.id;
        Array.from(subjectChips.children).forEach((c) => c.classList.toggle("active", c === chip));
        // clear the fallback select so the two pickers don't conflict
        subjectSelect.value = "";
        // convenience: default the type to whichever this subject actually has scheduled today
        const sched = s.schedule[dayKey];
        if (sched.prep && !sched.review) setType("prep");
        else if (sched.review && !sched.prep) setType("review");
      });
      subjectChips.appendChild(chip);
    });

    const noneToday = dayHasSubjects.length === 0;
    noChipsMessage.classList.toggle("hidden", !noneToday);
    subjectChips.classList.toggle("hidden", noneToday);

    // Fallback full list, collapsed by default (expanded automatically if today has no scheduled subjects)
    subjectSelect.innerHTML = '<option value="">授業を選択</option>';
    subjects.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      subjectSelect.appendChild(opt);
    });
    otherSubjectsWrap.classList.toggle("hidden", !noneToday);
    toggleOtherSubjectsBtn.textContent = noneToday ? "授業の一覧" : "他の授業から選ぶ";

    addSheetOverlay.classList.remove("hidden");
  }

  function setType(type) {
    selectedType = type;
    typeButtons.forEach((b) => b.classList.toggle("active", b.dataset.type === type));
  }

  function closeAddSheet() {
    addSheetOverlay.classList.add("hidden");
  }

  addBtn.addEventListener("click", openAddSheet);
  cancelAddBtn.addEventListener("click", closeAddSheet);
  addSheetOverlay.addEventListener("click", (e) => {
    if (e.target === addSheetOverlay) closeAddSheet();
  });

  toggleOtherSubjectsBtn.addEventListener("click", () => {
    otherSubjectsWrap.classList.toggle("hidden");
  });

  subjectSelect.addEventListener("change", () => {
    if (subjectSelect.value) {
      selectedSubjectId = subjectSelect.value;
      Array.from(subjectChips.children).forEach((c) => c.classList.remove("active"));
    }
  });

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setType(btn.dataset.type));
  });

  confirmAddBtn.addEventListener("click", () => {
    const subjectId = selectedSubjectId || subjectSelect.value;
    if (!subjectId) {
      alert("授業を選択してください。");
      return;
    }
    const key = dateKey(currentDate);
    const dayKey = dayKeyForDate(currentDate);
    const tasks = getTasksForDate(key, dayKey);
    const dup = tasks.find((t) => t.subjectId === subjectId && t.type === selectedType);
    if (dup) {
      alert("このタスクはすでに今日のリストに追加されています。");
      return;
    }
    tasks.push(newTask(subjectId, selectedType));
    setTasksForDate(key, tasks);
    closeAddSheet();
    render();
  });

  /* ---------------- Settings / subject management ---------------- */

  function openSettings() {
    subjects = loadSubjects();
    settingsSelectedDay = dayKeyForDate(currentDate);
    renderWeekdayTabs();
    renderSubjectManageList();
    settingsOverlay.classList.remove("hidden");
  }

  function closeSettings() {
    settingsOverlay.classList.add("hidden");
    render();
  }

  settingsBtn.addEventListener("click", openSettings);
  closeSettingsBtn.addEventListener("click", closeSettings);
  settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay) closeSettings();
  });

  function renderWeekdayTabs() {
    Array.from(weekdayTabs.children).forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.day === settingsSelectedDay);
    });
  }

  weekdayTabs.addEventListener("click", (e) => {
    const tab = e.target.closest(".weekday-tab");
    if (!tab) return;
    settingsSelectedDay = tab.dataset.day;
    renderWeekdayTabs();
    renderSubjectManageList();
  });

  function renderSubjectManageList() {
    subjectManageList.innerHTML = "";
    subjects.forEach((s) => {
      const row = document.createElement("div");
      row.className = "subject-row";

      const top = document.createElement("div");
      top.className = "subject-row-top";

      const nameEl = document.createElement("div");
      nameEl.className = "subject-row-name";
      nameEl.textContent = s.name;

      const actions = document.createElement("div");
      actions.className = "subject-row-actions";

      const renameBtn = document.createElement("button");
      renameBtn.className = "icon-btn";
      renameBtn.type = "button";
      renameBtn.setAttribute("aria-label", "名前を変更");
      renameBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 00-3-3L5 17v3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
      renameBtn.addEventListener("click", () => renameSubject(s.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "icon-btn";
      deleteBtn.type = "button";
      deleteBtn.setAttribute("aria-label", "削除");
      deleteBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0v12a1 1 0 001 1h6a1 1 0 001-1V7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      deleteBtn.addEventListener("click", () => deleteSubject(s.id, s.preset));

      actions.appendChild(renameBtn);
      actions.appendChild(deleteBtn);
      top.appendChild(nameEl);
      top.appendChild(actions);

      const toggles = document.createElement("div");
      toggles.className = "subject-row-toggles";
      const daySchedule = s.schedule[settingsSelectedDay];
      toggles.appendChild(buildSwitch("予習", daySchedule.prep, (checked) => {
        s.schedule[settingsSelectedDay].prep = checked;
        saveSubjects(subjects);
      }));
      toggles.appendChild(buildSwitch("復習", daySchedule.review, (checked) => {
        s.schedule[settingsSelectedDay].review = checked;
        saveSubjects(subjects);
      }));

      row.appendChild(top);
      row.appendChild(toggles);
      subjectManageList.appendChild(row);
    });
  }

  function buildSwitch(labelText, checked, onChange) {
    const label = document.createElement("label");
    label.className = "switch-label";

    const switchWrap = document.createElement("span");
    switchWrap.className = "switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!checked;
    const track = document.createElement("span");
    track.className = "switch-track";
    switchWrap.appendChild(input);
    switchWrap.appendChild(track);

    input.addEventListener("change", () => onChange(input.checked));

    label.appendChild(switchWrap);
    const text = document.createElement("span");
    text.textContent = labelText;
    label.appendChild(text);
    return label;
  }

  function renameSubject(id) {
    const s = subjects.find((x) => x.id === id);
    if (!s) return;
    const newName = window.prompt("新しい授業名を入力してください", s.name);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) return;
    s.name = trimmed;
    saveSubjects(subjects);
    renderSubjectManageList();
  }

  function deleteSubject(id, isPreset) {
    const s = subjects.find((x) => x.id === id);
    if (!s) return;
    const msg = isPreset
      ? `「${s.name}」は最初から登録されている授業です。本当に削除しますか？`
      : `「${s.name}」を削除しますか？`;
    showConfirm(msg, () => {
      subjects = subjects.filter((x) => x.id !== id);
      saveSubjects(subjects);
      renderSubjectManageList();
    });
  }

  addSubjectBtn.addEventListener("click", () => {
    const name = newSubjectInput.value.trim();
    if (!name) return;
    subjects.push({ id: uid("subj"), name, preset: false, schedule: emptySchedule() });
    saveSubjects(subjects);
    newSubjectInput.value = "";
    renderSubjectManageList();
  });

  newSubjectInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addSubjectBtn.click();
  });

  /* ---------------- Confirm sheet ---------------- */

  function showConfirm(message, onOk) {
    confirmMessage.textContent = message;
    pendingConfirmAction = onOk;
    confirmOverlay.classList.remove("hidden");
  }

  function hideConfirm() {
    confirmOverlay.classList.add("hidden");
    pendingConfirmAction = null;
  }

  confirmCancelBtn.addEventListener("click", hideConfirm);
  confirmOverlay.addEventListener("click", (e) => {
    if (e.target === confirmOverlay) hideConfirm();
  });
  confirmOkBtn.addEventListener("click", () => {
    const action = pendingConfirmAction;
    hideConfirm();
    if (action) action();
  });

  /* ---------------- Drag & drop reorder ---------------- */

  let dragState = null;
  const LONG_PRESS_MS = 420;
  const MOVE_CANCEL_PX = 10;

  cardList.addEventListener("pointerdown", onPointerDown);

  function onPointerDown(e) {
    if (e.target.closest(".check-btn")) return;
    const card = e.target.closest(".card");
    if (!card) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    dragState = {
      card,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
      placeholder: null,
      rect: null,
      longPressTimer: setTimeout(() => activateDrag(e), LONG_PRESS_MS),
    };

    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(e) {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    if (!dragState.dragging) {
      if (Math.abs(dx) > MOVE_CANCEL_PX || Math.abs(dy) > MOVE_CANCEL_PX) {
        clearTimeout(dragState.longPressTimer);
        teardownListeners();
        dragState = null;
      }
      return;
    }

    e.preventDefault();
    const newTop = dragState.rect.top + (e.clientY - dragState.startY);
    dragState.card.style.top = newTop + "px";
    checkReorder();
  }

  function onPointerUp() {
    if (!dragState) return;
    clearTimeout(dragState.longPressTimer);
    if (dragState.dragging) {
      finishDrag();
    }
    teardownListeners();
    dragState = null;
  }

  function teardownListeners() {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
  }

  function activateDrag(e) {
    if (!dragState) return;
    dragState.dragging = true;
    const card = dragState.card;
    const rect = card.getBoundingClientRect();
    dragState.rect = rect;

    const placeholder = document.createElement("div");
    placeholder.className = "card-placeholder";
    placeholder.style.height = rect.height + "px";
    card.parentNode.insertBefore(placeholder, card);
    dragState.placeholder = placeholder;

    card.style.position = "fixed";
    card.style.left = rect.left + "px";
    card.style.top = rect.top + "px";
    card.style.width = rect.width + "px";
    card.style.zIndex = "1000";
    card.classList.add("dragging");
    document.body.classList.add("no-scroll");

    try { card.setPointerCapture(dragState.pointerId); } catch (err) { /* ignore */ }
    if (navigator.vibrate) navigator.vibrate(12);
  }

  function checkReorder() {
    const card = dragState.card;
    const placeholder = dragState.placeholder;
    const cardCenter = parseFloat(card.style.top) + dragState.rect.height / 2;

    const children = Array.from(cardList.children);
    const placeholderIndex = children.indexOf(placeholder);

    for (let i = 0; i < children.length; i++) {
      const sib = children[i];
      if (sib === placeholder || sib === card) continue;
      const sibRect = sib.getBoundingClientRect();
      const sibCenter = sibRect.top + sibRect.height / 2;
      const sibIndex = children.indexOf(sib);

      if (cardCenter < sibCenter && placeholderIndex > sibIndex) {
        flipMove(() => cardList.insertBefore(placeholder, sib));
        break;
      } else if (cardCenter > sibCenter && placeholderIndex < sibIndex) {
        const next = sib.nextSibling;
        flipMove(() => cardList.insertBefore(placeholder, next));
        break;
      }
    }
  }

  function flipMove(mutation) {
    const card = dragState.card;
    const items = Array.from(cardList.children).filter((el) => el !== card);
    const before = new Map(items.map((el) => [el, el.getBoundingClientRect().top]));

    mutation();

    const items2 = Array.from(cardList.children).filter((el) => el !== card);
    items2.forEach((el) => {
      const b = before.get(el);
      if (b == null) return;
      const a = el.getBoundingClientRect().top;
      const delta = b - a;
      if (delta) {
        el.style.transition = "none";
        el.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => {
          el.style.transition = "transform 200ms ease";
          el.style.transform = "";
        });
      }
    });
  }

  function finishDrag() {
    const card = dragState.card;
    const placeholder = dragState.placeholder;

    cardList.insertBefore(card, placeholder);
    placeholder.remove();

    card.style.position = "";
    card.style.left = "";
    card.style.top = "";
    card.style.width = "";
    card.style.zIndex = "";
    card.style.transform = "";
    card.classList.remove("dragging");
    document.body.classList.remove("no-scroll");

    const key = dateKey(currentDate);
    const dayKey = dayKeyForDate(currentDate);
    const tasks = getTasksForDate(key, dayKey);
    const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t]));
    const order = Array.from(cardList.children).map((el) => el.dataset.id);
    const reordered = order.map((id) => taskMap[id]).filter(Boolean);
    setTasksForDate(key, reordered);
  }

  /* ---------------- Init ---------------- */

  render();
})();
