/* Merlin GS Quests v3 — structured question renderers only */
(function () {
  "use strict";

  const STORE_KEY = "merlin-gs-quests-v2";
  const MODES = [
    { id: "mix", label: "Mix", emoji: "🎲" },
    { id: "flash", label: "Flash", emoji: "🃏" },
    { id: "match", label: "Match", emoji: "🔗" },
    { id: "mcq", label: "MCQ", emoji: "🅐" },
    { id: "short", label: "Short", emoji: "✏️" },
    { id: "fill", label: "Fill", emoji: "🧩" },
    { id: "case", label: "Case", emoji: "📖" },
    { id: "lightning", label: "Lightning", emoji: "⚡" },
  ];

  let DATA = null;
  let state = {
    view: "home",
    mode: "mix",
    chapterId: null,
    queue: [],
    idx: 0,
    stars: 0,
    streak: 0,
    wrong: [],
    locked: false,
    showCoach: false,
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }
  function saveProgress(p) {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  }
  function progress() {
    const p = loadProgress();
    if (!p.facts) p.facts = {};
    if (!p.stats) p.stats = { correct: 0, total: 0 };
    return p;
  }
  function recordAnswer(factId, ok) {
    const p = progress();
    if (!p.facts[factId]) p.facts[factId] = { correct: 0, total: 0 };
    p.facts[factId].total += 1;
    if (ok) p.facts[factId].correct += 1;
    p.stats.total += 1;
    if (ok) p.stats.correct += 1;
    saveProgress(p);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function allFacts() {
    const out = [];
    for (const u of DATA.units) {
      for (const ch of u.chapters) {
        for (const f of ch.facts) {
          out.push({ ...f, chapterId: ch.id, chapterTitle: ch.title, chapterColor: ch.color, chapterEmoji: ch.emoji });
        }
      }
    }
    return out;
  }

  function allQuestions(filterType, chapterId) {
    const facts = allFacts().filter((f) => !chapterId || f.chapterId === chapterId);
    const qs = [];
    for (const f of facts) {
      for (const q of f.questions) {
        if (filterType && filterType !== "mix" && filterType !== "lightning") {
          if (q.type !== filterType) continue;
        }
        qs.push({ ...q, factId: f.id, topic: f.topic, why: f.why, can: f.can, chapterId: f.chapterId, chapterTitle: f.chapterTitle });
      }
    }
    return qs;
  }

  function weakFactIds(n = 4) {
    const p = progress();
    const facts = allFacts();
    const scored = facts.map((f) => {
      const s = p.facts[f.id] || { correct: 0, total: 0 };
      const rate = s.total ? s.correct / s.total : 0.4;
      return { id: f.id, rate, total: s.total, can: f.can, topic: f.topic };
    });
    scored.sort((a, b) => a.rate - b.rate || a.total - b.total);
    return scored.slice(0, n);
  }

  function buildQueue(mode, chapterId) {
    let pool;
    if (mode === "mix" || mode === "lightning") {
      pool = allQuestions(null, chapterId);
      // weight weak topics: duplicate weak fact questions
      const weak = new Set(weakFactIds(6).map((w) => w.id));
      const boosted = pool.slice();
      for (const q of pool) {
        if (weak.has(q.factId)) boosted.push(q);
      }
      pool = boosted;
    } else {
      pool = allQuestions(mode, chapterId);
    }
    if (!pool.length) pool = allQuestions(null, chapterId);
    const size = mode === "lightning" ? 10 : mode === "mix" ? 7 : Math.min(8, pool.length);
    return shuffle(pool).slice(0, Math.max(1, Math.min(size, pool.length)));
  }

  /* ---- WebAudio beeps ---- */
  let audioCtx = null;
  function beep(ok) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.type = "sine";
      o.frequency.value = ok ? 880 : 220;
      g.gain.value = 0.06;
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (ok ? 0.18 : 0.28));
      o.stop(audioCtx.currentTime + (ok ? 0.2 : 0.3));
    } catch (_) {}
  }

  /* ---- Render home ---- */
  function renderHome() {
    state.view = "home";
    const app = $("#app");
    const p = progress();
    const acc = p.stats.total ? Math.round((100 * p.stats.correct) / p.stats.total) : null;
    const chapters = DATA.units.flatMap((u) => u.chapters);

    const modeChips = MODES.map(
      (m) =>
        `<button class="chip ${state.mode === m.id ? "on" : ""}" data-mode="${m.id}" type="button">${m.emoji} ${m.label}</button>`
    ).join("");

    const chapHtml = chapters
      .map((ch) => {
        const facts = ch.facts;
        let done = 0,
          tot = 0;
        for (const f of facts) {
          const s = p.facts[f.id] || { correct: 0, total: 0 };
          tot += Math.max(4, f.questions.length);
          done += Math.min(s.correct, Math.max(4, f.questions.length));
        }
        const pct = tot ? Math.min(100, Math.round((100 * done) / tot)) : 0;
        return `<button class="chap" data-chapter="${ch.id}" type="button">
          <span class="tile" style="background:${ch.color}">${ch.emoji}</span>
          <span class="info">
            <b>${ch.title}</b>
            <span class="pages">${ch.pages} · ${facts.length} topics</span>
            <span class="meter"><i style="width:${pct}%"></i></span>
          </span>
          <span class="stars">${pct}%</span>
        </button>`;
      })
      .join("");

    let coachHtml = "";
    if (state.showCoach) {
      const weak = weakFactIds(4);
      const oral = weak.slice(0, 2);
      coachHtml = `<div class="coach" id="coach">
        <h3>👨‍👩‍👧 Parent Coach</h3>
        <div class="statline">Accuracy: ${acc == null ? "—" : acc + "%"} · Answered: ${p.stats.total}</div>
        <div class="statline">Weak topics: ${weak.map((w) => w.topic).join(", ") || "Play more to see"}</div>
        ${oral
          .map(
            (w) =>
              `<div class="oral"><small>Oral · ${w.topic}</small>${w.can || "Tell me what you remember about this topic."}</div>`
          )
          .join("")}
      </div>`;
    }

    app.innerHTML = `
      <header>
        <div class="brand">
          <svg class="logo" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="36" r="26" fill="#FF7A59"/>
            <circle cx="32" cy="36" r="22" fill="#FFF6EA"/>
            <path d="M32 6l-4 8h8z" fill="#7C6BF0"/>
            <circle cx="24" cy="34" r="4" fill="#33305C"/>
            <circle cx="40" cy="34" r="4" fill="#33305C"/>
            <path d="M26 44c4 3 8 3 12 0" stroke="#FF7A59" stroke-width="3" fill="none" stroke-linecap="round"/>
          </svg>
          <div><h1>Merlin GS Quests</h1><small>NGS · Primary 3 · Term 1</small></div>
        </div>
        <button class="icon-btn" id="btn-coach" type="button" title="Parent Coach" aria-label="Parent Coach">👨‍👩‍👧</button>
      </header>
      <section class="hero">
        <svg class="owl" viewBox="0 0 120 120" aria-hidden="true">
          <ellipse cx="60" cy="70" rx="42" ry="38" fill="#FF7A59"/>
          <circle cx="42" cy="58" r="16" fill="#FFF6EA"/>
          <circle cx="78" cy="58" r="16" fill="#FFF6EA"/>
          <circle cx="42" cy="58" r="7" fill="#33305C"/>
          <circle cx="78" cy="58" r="7" fill="#33305C"/>
          <path d="M54 72l6 10 6-10z" fill="#FFC53D"/>
          <path d="M40 18l8 16h-6z" fill="#7C6BF0"/>
          <path d="M80 18l-8 16h6z" fill="#7C6BF0"/>
        </svg>
        <div>
          <h2>Hi Merlin! 🌟</h2>
          <p>Pick a mode, then start Today's Mix or a chapter.</p>
        </div>
      </section>
      <div class="modes" id="modes">${modeChips}</div>
      ${coachHtml}
      <div class="cta-wrap">
        <button class="btn btn-primary cta-big" id="btn-mix" type="button">
          Today's Mix
          <span class="sub">${MODES.find((m) => m.id === state.mode)?.label || "Mix"} · 6–8 cards · weak topics boosted</span>
        </button>
      </div>
      <p class="mix-tip">Stars & progress save on this device.</p>
      <div class="quests-head"><h3>Chapter map</h3><span class="note">4 chapters</span></div>
      <div id="chapters">${chapHtml}</div>
    `;

    $("#btn-coach").onclick = () => {
      state.showCoach = !state.showCoach;
      renderHome();
    };
    $$("#modes .chip").forEach((btn) => {
      btn.onclick = () => {
        state.mode = btn.dataset.mode;
        renderHome();
      };
    });
    $("#btn-mix").onclick = () => startPlay(state.mode, null);
    $$("#chapters .chap").forEach((btn) => {
      btn.onclick = () => startPlay(state.mode, btn.dataset.chapter);
    });
  }

  function startPlay(mode, chapterId, retryOnly) {
    state.mode = mode;
    state.chapterId = chapterId;
    state.idx = 0;
    state.stars = 0;
    state.streak = 0;
    state.wrong = [];
    state.locked = false;
    if (retryOnly && retryOnly.length) {
      state.queue = shuffle(retryOnly);
    } else {
      state.queue = buildQueue(mode, chapterId);
    }
    state.view = "play";
    renderPlay();
  }

  function renderPlay() {
    const app = $("#app");
    if (state.idx >= state.queue.length) {
      renderResult();
      return;
    }
    const q = state.queue[state.idx];
    const dots = state.queue
      .map((_, i) => {
        let cls = "";
        if (i < state.idx) cls = "done";
        if (i === state.idx) cls = "now";
        return `<span class="${cls}"></span>`;
      })
      .join("");

    app.innerHTML = `
      <div class="topbar">
        <button class="icon-btn" id="btn-home" type="button" aria-label="Home">←</button>
        <span class="label">${q.chapterTitle || "Quest"} · ${q.topic || ""}</span>
        <span class="spacer"></span>
        <span class="stat">⭐ <span class="t" id="star-n">${state.stars}</span></span>
        <span class="stat">🔥 <span class="t" id="streak-n">${state.streak}</span></span>
      </div>
      <div class="dots">${dots}</div>
      <div class="qcard" id="qcard"></div>
      <div class="play-actions" id="play-actions"></div>
    `;
    $("#btn-home").onclick = () => renderHome();
    renderQuestion(q);
  }

  function typeLabel(t) {
    return (
      {
        mcq: "Multiple choice",
        flash: "Flash card",
        match: "Match",
        short: "Short answer",
        fill: "Fill the blank",
        case: "Case story",
      }[t] || t
    );
  }

  function renderQuestion(q) {
    const card = $("#qcard");
    state.locked = false;
    const tag = `<div class="q-tag">${typeLabel(q.type)}</div>`;
    if (q.type === "mcq" || q.type === "case") renderChoice(card, q, tag);
    else if (q.type === "flash") renderFlash(card, q, tag);
    else if (q.type === "match") renderMatch(card, q, tag);
    else if (q.type === "fill") renderFill(card, q, tag);
    else if (q.type === "short") renderShort(card, q, tag);
    else {
      card.innerHTML = tag + `<p class="prompt">Unknown type</p>`;
    }
  }

  function showWhy(explain, ok) {
    const actions = $("#play-actions");
    const why = document.createElement("div");
    why.className = "why";
    why.innerHTML = `<b>${ok ? "Great!" : "Let's learn"}</b>${explain || ""}`;
    const card = $("#qcard");
    card.appendChild(why);
    actions.innerHTML = `<button class="btn btn-primary" id="btn-next" type="button">Next →</button>`;
    $("#btn-next").onclick = () => {
      state.idx += 1;
      renderPlay();
    };
  }

  function markResult(q, ok) {
    recordAnswer(q.factId, ok);
    beep(ok);
    if (ok) {
      state.stars += 1;
      state.streak += 1;
      $("#qcard")?.classList.add("bounce-ok");
    } else {
      state.streak = 0;
      state.wrong.push(q);
    }
    const sn = $("#star-n");
    const st = $("#streak-n");
    if (sn) sn.textContent = state.stars;
    if (st) st.textContent = state.streak;
  }

  function renderChoice(card, q, tag) {
    const opts = shuffle(q.options || []);
    const scene = q.scene ? `<div class="scene">${q.scene}</div>` : "";
    const story = q.story ? `<div class="story">${q.story}</div>` : "";
    card.innerHTML =
      tag +
      scene +
      `<p class="prompt">${q.prompt}</p>` +
      story +
      opts.map((o, i) => `<button class="opt" type="button" data-i="${i}">${o}</button>`).join("");
    $$(".opt", card).forEach((btn) => {
      btn.onclick = () => {
        if (state.locked) return;
        state.locked = true;
        const chosen = btn.textContent;
        const ok = chosen === q.answer;
        $$(".opt", card).forEach((b) => {
          b.disabled = true;
          if (b.textContent === q.answer) b.classList.add("ok");
          else if (b === btn && !ok) b.classList.add("no");
        });
        markResult(q, ok);
        showWhy(q.explain || "", ok);
      };
    });
  }

  function renderFlash(card, q, tag) {
    card.classList.add("flip");
    card.innerHTML =
      tag +
      `<p class="prompt">${q.prompt}</p>` +
      `<p class="prompt-sub">Think, then reveal.</p>`;
    const actions = $("#play-actions");
    actions.innerHTML = `<button class="btn btn-gold" id="btn-reveal" type="button">Reveal answer</button>`;
    $("#btn-reveal").onclick = () => {
      const back = document.createElement("div");
      back.className = "flash-back";
      back.textContent = q.answer;
      card.appendChild(back);
      actions.innerHTML = `
        <div class="btn-row">
          <button class="btn btn-ghost" id="btn-miss" type="button">Still learning</button>
          <button class="btn btn-good" id="btn-got" type="button">Got it! ⭐</button>
        </div>`;
      $("#btn-got").onclick = () => {
        if (state.locked) return;
        state.locked = true;
        markResult(q, true);
        showWhy(q.explain || "", true);
      };
      $("#btn-miss").onclick = () => {
        if (state.locked) return;
        state.locked = true;
        markResult(q, false);
        showWhy(q.explain || "", false);
      };
    };
  }

  function renderMatch(card, q, tag) {
    const pairs = q.pairs || [];
    const lefts = shuffle(pairs.map((p) => p[0]));
    const rights = shuffle(pairs.map((p) => p[1]));
    const map = Object.fromEntries(pairs);
    let selL = null;
    let selR = null;
    let matched = 0;

    card.innerHTML = tag + `<p class="prompt">${q.prompt}</p><div class="match-grid"><div class="match-col" id="col-l"><h4>Left</h4></div><div class="match-col" id="col-r"><h4>Right</h4></div></div>`;
    const colL = $("#col-l", card);
    const colR = $("#col-r", card);
    const leftBtns = {};
    const rightBtns = {};

    lefts.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "match-item";
      btn.textContent = t;
      colL.appendChild(btn);
      leftBtns[t] = btn;
      btn.onclick = () => {
        if (btn.disabled || state.locked) return;
        Object.values(leftBtns).forEach((b) => b.classList.remove("sel"));
        btn.classList.add("sel");
        selL = t;
        tryMatch();
      };
    });
    rights.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "match-item";
      btn.textContent = t;
      colR.appendChild(btn);
      rightBtns[t] = btn;
      btn.onclick = () => {
        if (btn.disabled || state.locked) return;
        Object.values(rightBtns).forEach((b) => b.classList.remove("sel"));
        btn.classList.add("sel");
        selR = t;
        tryMatch();
      };
    });

    function tryMatch() {
      if (selL == null || selR == null) return;
      const lBtn = leftBtns[selL];
      const rBtn = rightBtns[selR];
      const ok = map[selL] === selR;
      if (ok) {
        lBtn.classList.add("ok");
        rBtn.classList.add("ok");
        lBtn.disabled = true;
        rBtn.disabled = true;
        matched += 1;
        beep(true);
        selL = selR = null;
        Object.values(leftBtns).forEach((b) => b.classList.remove("sel"));
        Object.values(rightBtns).forEach((b) => b.classList.remove("sel"));
        if (matched >= pairs.length && !state.locked) {
          state.locked = true;
          markResult(q, true);
          showWhy(q.explain || "", true);
        }
      } else {
        lBtn.classList.add("no");
        rBtn.classList.add("no");
        beep(false);
        const a = selL, b = selR;
        selL = selR = null;
        setTimeout(() => {
          leftBtns[a].classList.remove("no", "sel");
          rightBtns[b].classList.remove("no", "sel");
        }, 450);
      }
    }
  }

  function renderFill(card, q, tag) {
    const bank = shuffle(q.bank || []);
    card.innerHTML =
      tag +
      `<p class="prompt">${q.prompt}</p>` +
      `<div class="blank-line">${(q.blank || "").replace("____", "<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>")}</div>` +
      `<div class="bank">${bank.map((w) => `<button type="button" data-v="${esc(w)}">${w}</button>`).join("")}</div>`;
    $$(".bank button", card).forEach((btn) => {
      btn.onclick = () => {
        if (state.locked) return;
        state.locked = true;
        const chosen = btn.dataset.v;
        const ok = chosen === q.answer;
        $$(".bank button", card).forEach((b) => {
          b.disabled = true;
          if (b.dataset.v === q.answer) b.classList.add("ok");
          else if (b === btn && !ok) b.classList.add("no");
        });
        const line = $(".blank-line", card);
        if (line) line.innerHTML = (q.blank || "").replace("____", `<strong>${q.answer}</strong>`);
        markResult(q, ok);
        showWhy(q.explain || "", ok);
      };
    });
  }

  function renderShort(card, q, tag) {
    card.innerHTML =
      tag +
      `<p class="prompt">${q.prompt}</p>` +
      `<div class="short-row">
        <input id="short-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer…"/>
        <button class="btn btn-primary" id="btn-check" type="button" style="width:auto;padding:0 18px">Check</button>
      </div>`;
    const check = () => {
      if (state.locked) return;
      const raw = ($("#short-in").value || "").trim().toLowerCase();
      if (!raw) return;
      state.locked = true;
      const answers = (q.answers || []).map((a) => String(a).toLowerCase());
      const ok = answers.includes(raw);
      $("#short-in").disabled = true;
      $("#btn-check").disabled = true;
      markResult(q, ok);
      const hint = ok ? "" : ` Accepted: ${(q.answers || []).join(" / ")}`;
      showWhy((q.explain || "") + hint, ok);
    };
    $("#btn-check").onclick = check;
    $("#short-in").addEventListener("keydown", (e) => {
      if (e.key === "Enter") check();
    });
  }

  function renderResult() {
    const app = $("#app");
    const total = state.queue.length;
    const wrong = state.wrong;
    app.innerHTML = `
      <div class="result">
        <div class="big">${wrong.length === 0 ? "🏆" : "⭐"}</div>
        <h2>${wrong.length === 0 ? "Perfect quest!" : "Quest complete!"}</h2>
        <p>You got <b>${state.stars}</b> / ${total} · Best streak ${Math.max(state.streak, 0)}</p>
        <div class="cta-wrap">
          ${wrong.length ? `<button class="btn btn-gold" id="btn-retry" type="button">Retry wrong only (${wrong.length})</button>` : ""}
          <button class="btn btn-primary" id="btn-again" type="button">Play again</button>
          <button class="btn btn-ghost" id="btn-home2" type="button">Home</button>
        </div>
      </div>`;
    if (wrong.length) {
      $("#btn-retry").onclick = () => startPlay(state.mode, state.chapterId, wrong.slice());
    }
    $("#btn-again").onclick = () => startPlay(state.mode, state.chapterId);
    $("#btn-home2").onclick = () => renderHome();
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  async function loadData() {
    // Prefer embedded fallback for file:// ; try fetch when available
    if (window.MERLIN_CARDS) {
      DATA = window.MERLIN_CARDS;
      return;
    }
    try {
      const res = await fetch("data/cards.json");
      if (res.ok) {
        DATA = await res.json();
        return;
      }
    } catch (_) {}
    throw new Error("Could not load cards.json");
  }

  async function boot() {
    const app = $("#app");
    try {
      await loadData();
      renderHome();
    } catch (e) {
      app.innerHTML = `<div class="result"><h2>Could not load quests</h2><p>${e.message}</p></div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
