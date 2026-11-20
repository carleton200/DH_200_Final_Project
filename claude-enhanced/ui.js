/*
 * Surgical Apocalypse: Claude Code Enhanced
 * DOM rendering, input, sound and saving. Game rules live in engine.js.
 */
(function () {
  'use strict';
  const E = window.SAEngine;
  const A = window.SAArt;
  const $ = (sel) => document.querySelector(sel);
  const esc = (str) => String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ------------------------------------------------------------ storage */

  const KEY = { run: 'sa-enhanced-run', best: 'sa-enhanced-best', codex: 'sa-enhanced-codex', sound: 'sa-enhanced-sound', rank: 'sa-enhanced-rank' };
  const store = {
    raw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
  };

  /* -------------------------------------------------------------- sound */

  const sound = {
    on: store.get(KEY.sound, true),
    ctx: null,
    tone(freq, dur, type, vol, slideTo, delay) {
      if (!this.on) return;
      try {
        this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        const t = this.ctx.currentTime + (delay || 0);
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type || 'square';
        o.frequency.setValueAtTime(freq, t);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
        g.gain.setValueAtTime(vol || 0.06, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(this.ctx.destination);
        o.start(t); o.stop(t + dur + 0.02);
      } catch (e) { /* no audio */ }
    },
    click() { this.tone(520, 0.05, 'square', 0.03); },
    hurt() { this.tone(220, 0.25, 'sawtooth', 0.07, 70); },
    heal() { this.tone(440, 0.12, 'triangle', 0.07, 880); },
    pickup() { this.tone(660, 0.07, 'square', 0.04); this.tone(990, 0.09, 'square', 0.04, null, 0.07); },
    win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.07, null, i * 0.12)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.28, 'sawtooth', 0.05, null, i * 0.18)); },
    groan() { this.tone(110, 0.5, 'sawtooth', 0.05, 80); },
  };

  /* -------------------------------------------------------------- state */

  let s = null;
  let rank = store.get(KEY.rank, 'resident');
  let lastKeyboard = false;

  function save() {
    if (!s) return;
    if (s.over) store.del(KEY.run);
    else store.set(KEY.run, E.serialize(s));
  }
  function loadSaved() {
    const raw = store.raw(KEY.run);
    return raw ? E.deserialize(raw) : null;
  }

  function showScreen(name) {
    for (const el of document.querySelectorAll('.screen')) el.hidden = el.id !== 'screen-' + name;
    window.scrollTo(0, 0);
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.role = 'status'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  /* -------------------------------------------------------------- title */

  function renderTitle() {
    $('#title-art').innerHTML = A.scene('zombies', { count: 3, tint: '#2fb7a8' });
    const box = $('#ranks');
    box.querySelectorAll('.rank').forEach((n) => n.remove());
    for (const key of Object.keys(E.DIFFICULTY)) {
      const d = E.DIFFICULTY[key];
      const items = Object.entries(d.startItems).reduce((a, [, n]) => a + n, 0);
      const div = document.createElement('div');
      div.className = 'rank';
      div.innerHTML =
        '<input type="radio" name="rank" id="rank-' + key + '" value="' + key + '"' + (key === rank ? ' checked' : '') + '>' +
        '<label for="rank-' + key + '"><span class="r-name">' + esc(d.label) + '</span><span class="r-blurb">' + esc(d.blurb) + '</span>' +
        '<span class="r-facts"><span>' + d.floors + ' floors</span><span>' + d.injuries + ' injuries</span><span>' + items + ' starting item' + (items === 1 ? '' : 's') + '</span><span>×' + d.scoreMult + ' score</span></span></label>';
      box.appendChild(div);
    }
    box.onchange = (e) => { rank = e.target.value; store.set(KEY.rank, rank); };

    const saved = loadSaved();
    const resume = $('#resume-btn');
    resume.hidden = !saved;
    if (saved) {
      const fl = E.floorInfo(saved, saved.floor);
      resume.textContent = 'Resume run: ' + E.DIFFICULTY[saved.difficulty].label + ', ' + fl.short;
    }

    const best = store.get(KEY.best, []);
    $('#best-list').innerHTML = best.length
      ? best.map((b) => '<li><span class="grade-sm" style="color:' + (b.won ? 'var(--toxic)' : 'var(--blood-soft)') + '">' + esc(b.grade) + '</span><span>' + esc(E.DIFFICULTY[b.difficulty] ? E.DIFFICULTY[b.difficulty].label : b.difficulty) + ' · ' + (b.won ? 'Escaped' : 'Zombified') + '<br><small class="muted">' + esc(b.seed) + '</small></span><b>' + b.score + '</b></li>').join('')
      : '<li><span></span><span class="muted">No runs yet. The night is young.</span><span></span></li>';
  }

  function startGame(seed) {
    s = E.newGame({ difficulty: rank, seed: seed || $('#seed').value });
    sound.click();
    save();
    showScreen('game');
    renderGame(true);
  }

  /* --------------------------------------------------------------- game */

  const STAT_ROWS = [
    { key: 'bleed', label: 'Bleeding', max: 10, color: 'var(--blood)' },
    { key: 'infection', label: 'Infection', max: 100, color: '#c7d65a', suffix: '%' },
    { key: 'attack', label: 'Attack', max: 100, color: 'var(--coral)' },
    { key: 'mobility', label: 'Mobility', max: 100, color: 'var(--scrubs)' },
  ];
  const GOOD_WHEN_UP = { hp: true, attack: true, mobility: true, bleed: false, infection: false };
  const CHIP_NAME = { hp: 'HP', bleed: 'Bleeding', infection: 'Infection', attack: 'Attack', mobility: 'Mobility' };

  function renderGame(first) {
    const v = E.view(s);
    const cfg = E.DIFFICULTY[s.difficulty];

    // top bar
    let floors = '';
    for (let i = 0; i < cfg.floors; i++) floors += '<span class="floor-cell ' + (i < s.floor ? 'done' : i === s.floor ? 'now' : '') + '">' + (cfg.floors - i) + '</span>';
    $('#floors').innerHTML = floors;
    const cards = s.plan.floors[s.floor];
    $('#floor-name').innerHTML = 'Floor ' + (cfg.floors - s.floor) + ' · <span class="long">' + esc(v.floor.name) + '</span><span class="short">' + esc(v.floor.short) + '</span>';
    $('#pips').innerHTML = cards.map((_, i) => '<i class="pip ' + (i < s.step ? 'done' : '') + '"></i>').join('') + '<i class="pip stairs ' + (s.step >= cards.length ? 'done' : '') + '" title="Stairs"></i>';
    const lvl = Math.min(4, Math.floor(s.threat) + 1);
    $('#horde-word').textContent = E.describe('threat', s.threat);
    document.querySelectorAll('.horde-bar i').forEach((el, i) => el.classList.toggle('on', i < lvl));

    const hpNow = Math.max(0, s.hp);
    $('#mini-hud').innerHTML = s.biometrics
      ? '<span>HP <b style="color:' + (hpNow > 50 ? 'var(--toxic)' : hpNow > 25 ? 'var(--gold)' : 'var(--blood)') + '">' + hpNow + '</b></span><span style="color:var(--blood-soft)">Bleed ' + s.bleed + '</span>'
      : '<span class="muted">Vitals</span><span class="muted">No signal</span>';

    // scene
    const sceneEl = $('#scene');
    const flash = $('#flash');
    sceneEl.innerHTML = A.scene(v.scene, { tint: v.floor.color, count: v.count });
    sceneEl.appendChild(flash);
    if (v.scene !== 'or' && v.scene !== 'dead' && v.scene !== 'exit') {
      const tag = document.createElement('span');
      tag.className = 'scene-tag';
      tag.textContent = 'Floor ' + v.floorNumber;
      sceneEl.appendChild(tag);
    }

    // story
    const title = $('#node-title');
    title.textContent = v.title;
    const outcome = $('#outcome');
    const r = s.result;
    if (r && (r.text.length || r.deltas.length)) {
      const hpd = r.deltas.find((d) => d.stat === 'hp');
      outcome.className = 'outcome fade-in' + (hpd ? (hpd.amount < 0 ? ' bad' : ' good') : '');
      const chips = r.deltas.map(chip).filter(Boolean);
      outcome.innerHTML = r.text.map((t) => '<p>' + esc(t) + '</p>').join('') + (chips.length ? '<div class="chips">' + chips.join('') + '</div>' : '');
      outcome.hidden = false;
    } else {
      outcome.hidden = true;
    }
    const narrative = $('#narrative');
    narrative.innerHTML = v.text.map((t) => '<p>' + esc(t) + '</p>').join('');
    narrative.classList.remove('fade-in'); void narrative.offsetWidth; narrative.classList.add('fade-in');

    // choices
    const list = $('#choices');
    list.innerHTML = '';
    const choices = v.choices.slice();
    if (s.over) choices.push({ id: '__end', label: s.won ? 'See how you did' : 'See your final stats', hint: 'Score, grade and the story of your run.', next: true });
    choices.forEach((c, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice' + (c.tone ? ' ' + c.tone : '') + (c.next ? ' next' : '');
      b.disabled = !!c.disabled;
      b.dataset.id = c.id;
      b.innerHTML =
        '<span class="key" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="c-icon">' + (c.implant ? A.icon(c.implant) : '') + '</span>' +
        '<span><span class="c-label">' + esc(c.label) + (c.sub ? '<span class="c-sub">' + esc(c.sub) + '</span>' : '') + '</span>' +
        (c.hint ? '<span class="c-hint">' + esc(c.hint) + '</span>' : '') + '</span>';
      b.addEventListener('click', (e) => onChoice(c.id, e.detail === 0));
      li.appendChild(b);
      list.appendChild(li);
    });

    renderSidebar();

    if (!first) {
      if (lastKeyboard) {
        const btn = list.querySelector('button:not(:disabled)');
        if (btn) btn.focus({ preventScroll: true });
      }
      const card = $('#story-card');
      const top = card.getBoundingClientRect().top;
      if (top < 60 || top > window.innerHeight * 0.5) window.scrollTo({ top: window.scrollY + top - 70, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }

  function chip(d) {
    if (d.stat === 'item') {
      const it = E.ITEMS[d.item];
      return '<span class="chip ' + (d.amount > 0 ? 'good' : 'bad') + '">' + (d.amount > 0 ? '+' : '−') + Math.abs(d.amount) + ' ' + esc(it.name) + '</span>';
    }
    // Stat changes can only be measured with biometrics. Karma and the horde never appear as numbers.
    if (!s.biometrics || !CHIP_NAME[d.stat]) return '';
    const up = d.amount > 0;
    const good = GOOD_WHEN_UP[d.stat] ? up : !up;
    return '<span class="chip ' + (good ? 'good' : 'bad') + '">' + esc(CHIP_NAME[d.stat]) + ' ' + (up ? '+' : '−') + Math.abs(d.amount) + '</span>';
  }

  function renderSidebar() {
    const exact = s.biometrics;
    const vitals = $('#vitals-panel');
    vitals.classList.toggle('offline', !exact);
    const biom = $('#biom');
    biom.className = 'biom' + (exact ? ' on' : '');
    biom.textContent = exact
      ? 'Biometrics online: live vitals and a scanner read on every fight.'
      : 'Biometrics offline. Install a bionic eye or bionic arm to read your vitals.';
    if (!exact) {
      // No implant, no readings: nothing on the monitor may hint at the real numbers.
      vitals.style.removeProperty('--hp-color');
      vitals.style.removeProperty('--beat');
      $('#hp-num').textContent = '';
      $('#hp-bar').style.setProperty('--v', '0%');
      $('#stats').innerHTML = '';
    } else {
      const hp = Math.max(0, s.hp);
      vitals.style.setProperty('--hp-color', hp > 50 ? 'var(--toxic)' : hp > 25 ? 'var(--gold)' : 'var(--blood)');
      vitals.style.setProperty('--beat', (0.9 + (hp / 100) * 1.6).toFixed(2) + 's');
      $('#hp-num').textContent = hp;
      $('#hp-bar').style.setProperty('--v', hp + '%');
      $('#stats').innerHTML = STAT_ROWS.map((r) => {
        const val = s[r.key];
        const pct = Math.max(0, Math.min(100, (val / r.max) * 100));
        return '<div class="stat"><span>' + r.label + '</span><span class="bar"><i style="--v:' + pct + '%;--c:' + r.color + '"></i></span><span class="val">' + esc(val + (r.suffix || '')) + '</span></div>';
      }).join('');
    }

    // body diagram
    const bodyEl = $('#body');
    if (!bodyEl.firstChild) bodyEl.innerHTML = A.body();
    const order = ['eye', 'ear', 'heart', 'arm', 'leg'];
    for (const p of order) {
      const el = bodyEl.querySelector('[data-part="' + p + '"]');
      const st = s.parts[p];
      el.classList.remove('injured', 'wound', 'implant');
      if (st === 'injured' || st === 'wound') el.classList.add(st);
      else if (st !== 'ok') el.classList.add('implant');
    }
    $('#parts').innerHTML = order.map((p) => {
      const st = s.parts[p];
      const name = E.PARTS[p].name;
      if (st === 'ok') return '<li><span>' + name + '</span><span class="ok">Healthy</span></li>';
      if (st === 'injured') return '<li><span>' + name + '</span><span class="wound">Injured</span></li>';
      if (st === 'wound') return '<li><span>' + name + '</span><span class="wound">Untreated</span></li>';
      return '<li><span>' + name + '</span><span class="implant">' + esc(E.IMPLANTS[st].name) + '</span></li>';
    }).join('');

    // inventory
    const inv = $('#inventory');
    inv.innerHTML = '';
    for (const key of Object.keys(E.ITEMS)) {
      const it = E.ITEMS[key];
      const n = s.inventory[key];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'item' + (n ? '' : ' empty');
      b.disabled = !E.canUse(s, key);
      const why = key === 'stim' ? ' Use it from the fight menu.' : '';
      b.title = it.name + ': ' + it.desc + why;
      b.setAttribute('aria-label', 'Use ' + it.name + ' (' + n + ' left). ' + it.desc + why);
      b.innerHTML = A.icon(it.icon) + '<span><span class="i-name">' + esc(it.name) + '</span><span class="i-desc">' + esc(it.desc) + '</span></span><span class="count">' + n + '</span>';
      b.addEventListener('click', () => onItem(key));
      inv.appendChild(b);
    }

    // journal
    $('#journal').innerHTML = s.log.slice().reverse().slice(0, 14).map(journalLine).join('') || '<li><span class="t"></span><span class="muted">Nothing yet.</span></li>';
  }

  function journalLine(e) {
    const hp = e.deltas && e.deltas[0];
    return '<li><span class="t">T' + e.turn + '</span><span>' + esc(e.text) + (hp && hp.amount < 0 && e.bio ? ' <span class="dmg">(' + hp.amount + ' HP)</span>' : '') + '</span></li>';
  }

  /* ------------------------------------------------------------- input */

  function onChoice(id, keyboard) {
    if (!s) return;
    lastKeyboard = keyboard;
    if (id === '__end') { renderEnd(); return; }
    const hpBefore = s.hp;
    const invBefore = Object.values(s.inventory).reduce((a, b) => a + b, 0);
    const wasOver = s.over;
    E.choose(s, id);
    feedback(hpBefore, invBefore);
    if (s.over && !wasOver) {
      recordRun();
      setTimeout(() => (s.won ? sound.win() : sound.lose()), 250);
    } else if (s.node.type === 'combat') sound.groan();
    save();
    renderGame();
  }

  function onItem(key) {
    if (!s || !E.canUse(s, key)) return;
    const hpBefore = s.hp;
    E.useItem(s, key);
    sound.heal();
    feedback(hpBefore, Infinity, true);
    save();
    renderGame();
  }

  function feedback(hpBefore, invBefore, quiet) {
    const flash = $('#flash');
    const card = $('#story-card');
    flash.className = 'flash';
    void flash.offsetWidth;
    if (s.hp < hpBefore) {
      flash.className = 'flash hurt';
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      sound.hurt();
    } else if (s.hp > hpBefore) {
      flash.className = 'flash heal';
      if (!quiet) sound.heal();
    } else if (!quiet) {
      const invNow = Object.values(s.inventory).reduce((a, b) => a + b, 0);
      if (invNow > invBefore) sound.pickup(); else sound.click();
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    if ($('#screen-game').hidden || !s) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (/^[1-9]$/.test(e.key)) {
      const btns = document.querySelectorAll('#choices button');
      const b = btns[Number(e.key) - 1];
      if (b && !b.disabled) { e.preventDefault(); onChoice(b.dataset.id, true); }
    }
    const k = e.key.toLowerCase();
    if (k === 'b') onItem('bandage');
    if (k === 'a') onItem('antibiotics');
    if (k === 'p') onItem('painkillers');
  });

  /* ---------------------------------------------------------------- end */

  function recordRun() {
    const sc = E.score(s);
    const best = store.get(KEY.best, []);
    best.push({ score: sc.total, grade: sc.grade, won: s.won, difficulty: s.difficulty, seed: s.seed, date: Date.now() });
    best.sort((a, b) => b.score - a.score);
    store.set(KEY.best, best.slice(0, 8));
    const codex = new Set(store.get(KEY.codex, []));
    for (const id of s.implants) codex.add(id);
    store.set(KEY.codex, Array.from(codex));
  }

  function renderEnd() {
    const sc = E.score(s);
    const cfg = E.DIFFICULTY[s.difficulty];
    $('#end-scene').innerHTML = A.scene(s.won ? 'exit' : 'dead', {});
    const t = $('#end-title');
    t.textContent = s.won ? s.ending.title : 'Zombified';
    t.className = s.won ? 'win' : 'lose';
    $('#end-text').textContent = s.ending.text;
    $('#end-grade').innerHTML = esc(sc.grade) + '<small>' + sc.total + '</small>';
    const stats = [
      ['Floors cleared', sc.floorsCleared + ' / ' + cfg.floors],
      ['HP left', Math.max(0, s.hp)],
      ['Turns', s.turn],
      ['Zombies dropped', s.kills],
      ['Patients saved', s.saved],
      ['Damage taken', s.damageTaken],
      ['Bleeding', s.bleed],
      ['Infection', s.infection + '%'],
    ];
    $('#end-stats').innerHTML = stats.map(([k, v]) => '<div class="fs"><b>' + esc(v) + '</b><span>' + esc(k) + '</span></div>').join('');
    $('#end-implants').innerHTML = s.implants.length
      ? s.implants.map((id) => '<span class="ib">' + A.icon(id) + esc(E.IMPLANTS[id].name) + '</span>').join('')
      : '<span class="muted">None. All original parts, for better or worse.</span>';
    $('#end-journal').innerHTML = s.log.map(journalLine).join('');
    $('#end-seed').innerHTML = esc(cfg.label) + ' · seed <code>' + esc(s.seed) + '</code>. Replay it to try the same hospital again.';
    showScreen('end');
  }

  function challengeLink() {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('seed', s.seed);
    url.searchParams.set('rank', s.difficulty);
    return url.toString();
  }

  $('#again-btn').addEventListener('click', () => { rank = s.difficulty; startGame(E.randomSeed()); });
  $('#replay-btn').addEventListener('click', () => { rank = s.difficulty; startGame(s.seed); });
  $('#title-btn').addEventListener('click', () => { renderTitle(); showScreen('title'); });
  $('#share-btn').addEventListener('click', async () => {
    const link = challengeLink();
    try { await navigator.clipboard.writeText(link); toast('Challenge link copied'); }
    catch (e) { window.prompt('Copy this link:', link); }
  });

  /* ------------------------------------------------------------ dialogs */

  function renderCodex() {
    const found = new Set(store.get(KEY.codex, []));
    if (s) for (const id of s.implants) found.add(id);
    let html = '<p class="muted" style="margin-top:0">Every implant in the game is based on real biomedical engineering. Ones you have installed in a run are marked.</p>';
    for (const part of Object.keys(E.PART_OPTIONS)) {
      html += '<h3 class="codex-part">' + esc(E.PARTS[part].name) + '</h3><div class="codex-grid">';
      for (const id of E.PART_OPTIONS[part]) {
        const imp = E.IMPLANTS[id];
        if (imp.asis) continue;
        const fx = E.effectWords(imp.fx);
        if (imp.fx.biometrics) fx.push('Turns on biometrics');
        if (imp.fx.hearing === 1) fx.push('Hear intersections');
        if (imp.fx.hearing === 2) fx.push('Hear ahead');
        html += '<article class="codex-card' + (found.has(id) ? ' found' : '') + '"><header>' + A.icon(id) + '<div><h4>' + esc(imp.name) + '</h4><span class="sub">' + esc(imp.sub) + '</span></div></header>' +
          '<div class="fx">' + esc(fx.join(' · ')) + '</div><p>' + esc(imp.fact) + '</p>' + (found.has(id) ? '<div class="found-tag">✓ Installed in a run</div>' : '') + '</article>';
      }
      html += '</div>';
    }
    $('#codex-body').innerHTML = html;
  }

  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]');
    if (open) {
      const dlg = document.getElementById(open.dataset.open);
      if (dlg.id === 'dlg-codex') renderCodex();
      dlg.showModal();
      return;
    }
    const close = e.target.closest('[data-close]');
    if (close) close.closest('dialog').close();
    if (e.target.tagName === 'DIALOG') e.target.close(); // click on backdrop
  });

  /* --------------------------------------------------------------- boot */

  function updateSoundBtn() {
    const b = $('#sound-btn');
    b.innerHTML = '<svg><use href="#' + (sound.on ? 'i-sound' : 'i-mute') + '"/></svg>';
    b.setAttribute('aria-label', sound.on ? 'Sound on. Click to mute.' : 'Sound off. Click to unmute.');
    b.setAttribute('aria-pressed', String(sound.on));
  }
  $('#sound-btn').addEventListener('click', () => { sound.on = !sound.on; store.set(KEY.sound, sound.on); updateSoundBtn(); sound.click(); });
  $('#menu-btn').addEventListener('click', () => { save(); renderTitle(); showScreen('title'); });
  $('#start-btn').addEventListener('click', () => startGame());
  $('#daily-btn').addEventListener('click', () => { $('#seed').value = E.dailySeed(); toast('Daily shift loaded: everyone gets this hospital today'); });
  $('#resume-btn').addEventListener('click', () => {
    const saved = loadSaved();
    if (!saved) { renderTitle(); return; }
    s = saved;
    showScreen('game');
    renderGame(true);
  });

  // ?seed=...&rank=... challenge links
  const params = new URLSearchParams(location.search);
  if (params.get('rank') && E.DIFFICULTY[params.get('rank')]) rank = params.get('rank');
  if (params.get('seed')) $('#seed').value = params.get('seed').slice(0, 40);

  updateSoundBtn();
  renderTitle();
})();
