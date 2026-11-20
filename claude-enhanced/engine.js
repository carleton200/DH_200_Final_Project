/*
 * Surgical Apocalypse: Claude Code Enhanced
 * Game engine. Pure logic, no DOM, so the same file runs in the browser
 * and in Node (tools/balance-sim.js uses it to tune difficulty).
 *
 * Randomness is seeded and split into two streams:
 *   - the MAP stream builds the hospital (what is waiting on each floor, which
 *     body parts get hurt, what is behind each door) once, at the start. The same
 *     seed always gives the same hospital, whatever the player does.
 *   - the EVENT stream rolls dice for fights, escapes and infections.
 * Encounters come from shuffled decks with a fixed mix per floor, not from
 * independent coin flips, so every run of a difficulty is about as long and
 * about as dangerous as every other.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SAEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ------------------------------------------------------------------ RNG */

  function hashSeed(str) { // FNV-1a, string -> uint32
    let h = 2166136261;
    for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rnd(s) { // mulberry32; state lives in s.rng so a run can be saved and resumed
    let t = (s.rng = (s.rng + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rint = (s, lo, hi) => lo + Math.floor(rnd(s) * (hi - lo + 1));
  const pick = (s, arr) => arr[Math.floor(rnd(s) * arr.length)];
  function shuffle(s, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd(s) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function withMap(s, fn) { // run fn with the map stream
    const ev = s.rng; s.rng = s.mapRng;
    try { return fn(); } finally { s.mapRng = s.rng; s.rng = ev; }
  }
  const WORDS_A = ['GRIM', 'PALE', 'ROTTEN', 'SILENT', 'BLOODY', 'FERAL', 'HOLLOW', 'MANIC', 'SCRUBBED', 'STERILE', 'TOXIC', 'LUCKY'];
  const WORDS_B = ['SCALPEL', 'SUTURE', 'GURNEY', 'PLASMA', 'MARROW', 'FEMUR', 'PULSE', 'LANCET', 'TENDON', 'SPLINT', 'BYPASS', 'CORTEX'];
  function randomSeed() {
    const r = () => Math.floor(Math.random() * 12);
    return WORDS_A[r()] + '-' + WORDS_B[r()] + '-' + (10 + Math.floor(Math.random() * 90));
  }
  function dailySeed(date) {
    const d = date || new Date();
    const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return 'DAILY-' + iso;
  }

  /* --------------------------------------------------------------- Tables */

  const DIFFICULTY = {
    intern: {
      id: 'intern', label: 'Intern', blurb: 'First week on the job. Four floors, gentler bites and a stocked pocket.',
      floors: 4, floorLength: 5, zombieCards: 2, injuries: 3, caches: 1,
      dmg: 0.9, infect: 0.7, threatPerTurn: 0.08, finalHorde: 2, roomLimit: 2,
      startItems: { bandage: 1, antibiotics: 1, painkillers: 1, stim: 1 }, scoreMult: 1,
    },
    resident: {
      id: 'resident', label: 'Resident', blurb: 'The intended experience. Five floors, and every choice costs something.',
      floors: 5, floorLength: 5, zombieCards: 2, injuries: 4, caches: 1,
      dmg: 0.95, infect: 1, threatPerTurn: 0.08, finalHorde: 2, roomLimit: 2,
      startItems: { bandage: 1, painkillers: 1 }, scoreMult: 1.5,
    },
    attending: {
      id: 'attending', label: 'Attending', blurb: 'Six floors, every body part at risk, one bandage. For the steady-handed.',
      floors: 6, floorLength: 5, zombieCards: 2, injuries: 5, caches: 1,
      dmg: 1.1, infect: 1.15, threatPerTurn: 0.07, finalHorde: 3, roomLimit: 2,
      startItems: { bandage: 1 }, scoreMult: 2,
    },
  };

  // Top floor first. The last floor of every run is the Emergency Department.
  const FLOORS = [
    { name: 'Surgical Wing', short: 'Surgery', color: '#2fb7a8',
      quiet: ['Scrub sinks drip in the dark. A cart of instruments lies on its side.', 'The OR board still lists your afternoon cases. Nobody is coming to them.'] },
    { name: 'Intensive Care', short: 'ICU', color: '#5b8fd6',
      quiet: ['Monitors flatline in every room, one after another, like a choir going quiet.', 'Ventilators hiss for patients who are no longer there.'] },
    { name: 'Radiology', short: 'Radiology', color: '#b98cf0',
      quiet: ['An MRI hums behind a lead door. Something metal is stuck to the inside of it.', 'X-ray films flap on lightboxes. Some of the skeletons look wrong.'] },
    { name: 'Pediatrics', short: 'Pediatrics', color: '#ffd23f',
      quiet: ['Cartoon animals smile from the walls. A balloon drifts along the ceiling.', 'A toy ambulance rolls slowly across the hall, siren wheezing.'] },
    { name: 'Pharmacy', short: 'Pharmacy', color: '#e8825e',
      quiet: ['Pill bottles crunch underfoot. Someone got here before you.', 'The robot dispenser whirs, stuck counting the same pill forever.'] },
  ];
  const ED_FLOOR = { name: 'Emergency Department', short: 'ER', color: '#ff4d5e',
    quiet: ['Ambulance bay doors bang in the wind. Daylight is close.', 'The triage board reads: WAIT TIME: FOREVER.'] };

  const ITEMS = {
    bandage: { name: 'Bandage', icon: 'bandage', desc: 'Slows bleeding and patches you up a little.' },
    antibiotics: { name: 'Antibiotics', icon: 'pills', desc: 'Fights off infection.' },
    painkillers: { name: 'Painkillers', icon: 'syringe', desc: 'Restores a good chunk of health.' },
    stim: { name: 'Adrenaline', icon: 'stim', desc: 'In a fight: escape for sure, and the horde loses your trail.' },
  };
  const ITEM_WEIGHTS = [['bandage', 40], ['antibiotics', 26], ['painkillers', 24], ['stim', 10]];

  // Body parts that can be hurt, and the replacements on the tray for each.
  const PARTS = {
    leg: { name: 'Leg', wound: { hp: 6, bleed: 2 },
      text: 'You collapse into an examination room and finally look at your leg. It is in terrible shape. There is a tray of prosthetics on the counter.' },
    arm: { name: 'Arm', wound: { hp: 6, bleed: 2 },
      text: 'You stumble in and slam the door behind you. Your arm is a torn-up disaster. Some of your own prosthetic stock is on the shelf.' },
    eye: { name: 'Eye', wound: { hp: 5, bleed: 1 },
      text: 'Your vision keeps blurring as the door clicks shut. In the mirror you see why: your eye is ruined. Replacement options sit on the shelf beside you.' },
    heart: { name: 'Heart', wound: { hp: 6, failing: true },
      text: 'Your chest tightens. Your already poor heart is giving out, skipping and stuttering. There is cardiac equipment in the room.' },
    ear: { name: 'Ear', wound: { hp: 4, bleed: 1 },
      text: 'A ringing whine fills your head. A bite has torn your ear, and the world sounds like it is underwater. A box of audiology supplies sits on the desk.' },
  };

  const IMPLANTS = {
    leg_asis: { part: 'leg', name: 'Go on as is', asis: true, fx: { hp: 6, infection: 8, mobility: -15 },
      text: 'You bandage what you can and ignore the rest. The bleeding keeps on and every step is harder.' },
    osseo_leg: { part: 'leg', name: 'Titanium Leg', sub: 'osseointegrated implant', fx: { mobility: 12, infection: 4 },
      text: 'You anchor a titanium rod straight into the bone. It takes your weight at once. The skin around it will need watching.',
      fact: 'Osseointegration lets living bone grow onto a titanium implant. Per-Ingvar Brånemark found it in the 1950s and used it first for dental implants. Bone-anchored limbs followed in Sweden in 1990. The opening through the skin is a known infection risk.' },
    peg_leg: { part: 'leg', name: 'Peg Leg', sub: 'carved wooden prosthesis', fx: { attack: 5, mobility: -8, infection: 2 },
      text: 'Crude, but zombies cannot bite wood, and it makes a decent club.',
      fact: 'Prosthetics are ancient. The "Cairo toe", a wood-and-leather big toe found on an Egyptian mummy, dates to roughly 950–710 BCE and shows wear from real use.' },
    bionic_leg: { part: 'leg', name: 'Bionic Leg', sub: 'powered prosthesis', fx: { attack: 15, mobility: -10, infection: 3 },
      text: 'Motors whine as the heavy leg locks on. Moving is clumsy, but one kick caves in a door.',
      fact: 'Powered prosthetic knees and ankles use motors, sensors and microprocessors to adjust each step in real time, adding push-off power that passive legs cannot.' },

    arm_asis: { part: 'arm', name: 'Go on as is', asis: true, fx: { hp: 6, infection: 8, attack: -8 },
      text: 'You wrap the arm tight and keep going. It is not much use in a fight now.' },
    titanium_arm: { part: 'arm', name: 'Titanium Arm', sub: 'internal fixation', fx: { attack: 6, infection: -3 },
      text: 'Plates and screws hold the arm together. It is solid, sealed and surprisingly strong.',
      fact: 'Titanium is a favorite for implants because the body tolerates it well. It resists corrosion and forms a thin oxide layer that bone will bond to.' },
    bionic_arm: { part: 'arm', name: 'Bionic Arm', sub: 'myoelectric prosthesis', fx: { attack: 18, mobility: -6, infection: 3, biometrics: true },
      text: 'The bionic arm crushes skulls but weighs a ton. A readout on the forearm flickers on: live vital signs.',
      fact: 'Myoelectric arms read the small electrical signals made by muscles in the residual limb, picked up by electrodes on the skin, and turn them into motor commands for the hand.' },

    eye_asis: { part: 'eye', name: 'Go on as is', asis: true, fx: { hp: 6, infection: 8, attack: -5 },
      text: 'You tape a pad over it. Without depth perception your swings keep missing.' },
    glass_eye: { part: 'eye', name: 'Glass Eye', sub: 'ocular prosthesis', fx: { hp: 5, infection: -3 },
      text: 'Nothing special, but the socket is sealed and clean.',
      fact: 'Artificial eyes were once blown glass. Most today are custom acrylic shells, painted by hand to match the other eye.' },
    bionic_eye: { part: 'eye', name: 'Bionic Eye', sub: 'retinal implant', fx: { attack: 8, infection: 3, biometrics: true },
      text: 'The new eye whirs into focus. Vital signs scroll across your vision and every zombie gets a target box.',
      fact: 'Retinal implants such as the Argus II use a camera on a pair of glasses and an electrode array on the retina to bring back basic light and shape perception.' },

    heart_asis: { part: 'heart', name: 'Go on as is', asis: true, fx: {},
      text: 'You breathe through it. Your heart keeps stumbling, and it will cost you every step.' },
    pacemaker: { part: 'heart', name: 'Pacemaker', sub: 'implanted pulse generator', fx: { hp: 10, bleed: -1, attack: -5, cureHeart: true },
      text: 'You talk yourself through your own heart surgery. A steady pulse returns and the bleeding slows. Better not brawl too hard.',
      fact: 'The first fully implanted pacemaker went into Arne Larsson in Sweden in 1958. He outlived the surgeon and wore through 26 devices.' },
    heart_lung: { part: 'heart', name: 'Heart-Lung Machine', sub: 'cardiopulmonary bypass', fx: { hp: 30, mobility: -35, attack: -15, cureHeart: true },
      text: 'You plug yourself into the heart-lung machine. You feel fantastic, but now you are dragging a cart the size of a fridge.',
      fact: 'John Gibbon used his heart-lung machine for the first successful open-heart surgery in 1953. It pumps and oxygenates blood so surgeons can stop the heart.' },

    ear_asis: { part: 'ear', name: 'Go on as is', asis: true, fx: { hp: 4, infection: 6 },
      text: 'You stuff gauze in it. Everything sounds muffled.' },
    hearing_aid: { part: 'ear', name: 'Hearing Aid', sub: 'sound amplifier', fx: { infection: -2, hearing: 1 },
      text: 'Tuned and clipped on. You can make out groaning behind corners again.',
      fact: 'Hearing aids pick up sound with a microphone, amplify it and play it into the ear. They help when some hair cells in the inner ear still work.' },
    cochlear: { part: 'ear', name: 'Cochlear Implant', sub: 'auditory nerve stimulator', fx: { infection: 2, hearing: 2 },
      text: 'Electrodes thread into your cochlea. Sound comes back sharper than ever. You can hear a shuffle two hallways away.',
      fact: 'Cochlear implants skip the damaged hair cells entirely and stimulate the auditory nerve with electrodes, which is why they work when hearing aids cannot.' },
  };
  const PART_OPTIONS = {
    leg: ['leg_asis', 'osseo_leg', 'peg_leg', 'bionic_leg'],
    arm: ['arm_asis', 'titanium_arm', 'bionic_arm'],
    eye: ['eye_asis', 'glass_eye', 'bionic_eye'],
    heart: ['heart_asis', 'pacemaker', 'heart_lung'],
    ear: ['ear_asis', 'hearing_aid', 'cochlear'],
  };

  // Rooms come out of a shuffle bag with this mix, refilled when empty.
  const ROOM_BAG = ['supplies', 'supplies', 'supplies', 'patient', 'patient', 'zombies', 'zombies', 'empty', 'snack', 'cabinet', 'survivor'];

  /* ------------------------------------------------------------ New game */

  function newGame(opts) {
    opts = opts || {};
    const difficulty = DIFFICULTY[opts.difficulty] ? opts.difficulty : 'resident';
    const cfg = DIFFICULTY[difficulty];
    const seed = String(opts.seed || randomSeed()).trim().toUpperCase().slice(0, 40) || randomSeed();
    const s = {
      v: VERSION, seed, difficulty,
      rng: hashSeed(seed + '|events'), mapRng: hashSeed(seed + '|map|' + difficulty),
      hp: 100, maxHp: 100, bleed: 0, infection: 0, attack: 5, mobility: 80, karma: 50, threat: 0,
      biometrics: false, hearing: 0, heartFailing: false,
      parts: { leg: 'ok', arm: 'ok', eye: 'ok', heart: 'ok', ear: 'ok' },
      inventory: Object.assign({ bandage: 0, antibiotics: 0, painkillers: 0, stim: 0 }, cfg.startItems),
      floor: 0, step: 0, roomsSearched: 0, roomIdx: 0,
      turn: 0, kills: 0, saved: 0, abandoned: 0, fled: 0, damageTaken: 0, implants: [],
      over: false, won: false, cause: null, ending: null,
      log: [], node: { type: 'intro' }, result: null, lastHurt: null,
    };
    withMap(s, () => buildPlan(s, cfg));
    return s;
  }

  function floorInfo(s, i) {
    const n = DIFFICULTY[s.difficulty].floors;
    if (i === n - 1) return ED_FLOOR;
    return FLOORS[i % FLOORS.length];
  }

  function buildPlan(s, cfg) {
    // Which floors get an injury, and in which body-part order.
    const injuryFloors = shuffle(s, range(1, cfg.floors - 1)).slice(0, cfg.injuries);
    const partOrder = shuffle(s, ['leg', 'arm', 'eye', 'heart', 'ear']);
    s.plan = { floors: [], partOrder, rooms: [] };

    for (let f = 0; f < cfg.floors; f++) {
      const cards = [];
      for (let z = 0; z < cfg.zombieCards; z++) cards.push({ t: 'zombies' });
      if (injuryFloors.includes(f)) cards.push({ t: 'injury' });
      for (let c = 0; c < cfg.caches; c++) cards.push({ t: 'cache' });
      if (rnd(s) < 0.6) {
        const sides = shuffle(s, [{ t: 'cache' }, rnd(s) < 0.6 ? { t: 'zombies' } : { t: 'quiet' }]);
        cards.push({ t: 'fork', left: sides[0], right: sides[1] });
      }
      while (cards.length < cfg.floorLength) cards.push({ t: 'quiet' });
      while (cards.length > cfg.floorLength) { // trim the least important card
        const i = cards.findIndex(c => c.t === 'quiet' || c.t === 'cache');
        cards.splice(i >= 0 ? i : cards.length - 1, 1);
      }
      shuffle(s, cards);
      // An injury never greets you at the top of the stairs, and two fights never open a floor.
      const inj = cards.findIndex(c => c.t === 'injury');
      if (inj === 0) [cards[0], cards[cards.length - 1]] = [cards[cards.length - 1], cards[0]];
      for (const c of cards) c.flavor = rint(s, 0, 99);
      s.plan.floors.push(cards);
    }
    // Rooms: a long, fair sequence drawn from the shuffle bag.
    while (s.plan.rooms.length < 48) {
      for (const r of shuffle(s, ROOM_BAG.slice())) s.plan.rooms.push({ t: r, flavor: rint(s, 0, 99) });
    }
    enterFloor(s);
  }

  function range(a, b) { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; }

  // Karma reshapes the floor you are about to walk into. No dice involved:
  // helpful survivors show good people the service stairs, and the dead
  // follow the screams of the people you left behind.
  function enterFloor(s) {
    const cfg = DIFFICULTY[s.difficulty];
    const cards = s.plan.floors[s.floor];
    const last = s.floor === cfg.floors - 1;
    const quietAt = () => { for (let i = cards.length - 1; i >= 1; i--) if (cards[i].t === 'quiet') return i; return -1; };
    if (s.karma >= 70 && !last) {
      const i = quietAt();
      if (i >= 0) cards[i] = { t: 'shortcut', flavor: cards[i].flavor };
    } else if (s.karma <= 30) {
      const i = quietAt();
      if (i >= 0) cards[i] = { t: 'zombies', drawn: true, flavor: cards[i].flavor };
    }
    s.step = 0;
    s.roomsSearched = 0;
  }

  /* --------------------------------------------------------------- Helpers */

  const STATS = ['hp', 'bleed', 'infection', 'attack', 'mobility', 'karma', 'threat'];
  function snapshot(s) {
    const o = {};
    for (const k of STATS) o[k] = s[k];
    o.inv = Object.assign({}, s.inventory);
    return o;
  }
  function diff(before, s) {
    const d = [];
    for (const k of STATS) {
      const delta = Math.round((s[k] - before[k]) * 10) / 10;
      if (k === 'threat') { if (Math.abs(delta) >= 0.3) d.push({ stat: k, amount: delta }); continue; }
      if (delta) d.push({ stat: k, amount: Math.round(delta) });
    }
    for (const k of Object.keys(ITEMS)) {
      const delta = s.inventory[k] - before.inv[k];
      if (delta) d.push({ stat: 'item', item: k, amount: delta });
    }
    return d;
  }
  function apply(s, fx) {
    if (fx.hp) s.hp = Math.min(s.maxHp, s.hp + fx.hp);
    if (fx.bleed) s.bleed = clamp(s.bleed + fx.bleed, 0, 10);
    if (fx.infection) s.infection = clamp(s.infection + fx.infection, 0, 100);
    if (fx.attack) s.attack = clamp(s.attack + fx.attack, 0, 100);
    if (fx.mobility) s.mobility = clamp(s.mobility + fx.mobility, 5, 100);
    if (fx.karma) s.karma = clamp(s.karma + fx.karma, 0, 100);
    if (fx.threat) s.threat = Math.max(0, s.threat + fx.threat);
    if (fx.biometrics) s.biometrics = true;
    if (fx.hearing) s.hearing = Math.max(s.hearing, fx.hearing);
    if (fx.cureHeart) s.heartFailing = false;
  }
  function hurt(s, amount, cause) {
    amount = Math.max(0, Math.round(amount));
    if (!amount) return 0;
    s.hp -= amount;
    s.damageTaken += amount;
    s.lastHurt = cause;
    return amount;
  }
  function gainItem(s, key, n) {
    n = n || 1;
    s.inventory[key] = Math.min(5, s.inventory[key] + n);
  }
  function randomItem(s) { // event stream
    let total = 0; for (const [, w] of ITEM_WEIGHTS) total += w;
    let r = rnd(s) * total;
    for (const [k, w] of ITEM_WEIGHTS) if ((r -= w) < 0) return k;
    return 'bandage';
  }
  function itemList(keys) {
    const counts = {};
    for (const k of keys) counts[k] = (counts[k] || 0) + 1;
    return Object.keys(counts).map(k => (counts[k] > 1 ? counts[k] + ' × ' : '') + ITEMS[k].name).join(' and ');
  }

  // Time passes: blood loss, a failing heart, infection and the growing horde.
  function tick(s, out) {
    const cfg = DIFFICULTY[s.difficulty];
    s.turn++;
    s.threat += cfg.threatPerTurn;
    if (s.bleed > 0) hurt(s, s.bleed, 'bleed');
    if (s.heartFailing) { hurt(s, 3, 'heart'); out.push('Your heart stutters and the edges of your vision go grey.'); }
    const p = (s.infection / 100) * cfg.infect * 0.45;
    if (s.infection > 0 && rnd(s) < p) {
      hurt(s, 6, 'infection');
      out.push('Fever burns through you. One of your wounds is infected.');
    }
  }

  function groupSize(s, extra) {
    const t = s.threat + (extra || 0);
    let n = 1 + Math.floor(t);
    if (rnd(s) < t - Math.floor(t)) n++;
    return clamp(n, 1, 5);
  }

  function fightPer(s) {
    const cfg = DIFFICULTY[s.difficulty];
    return 6 * cfg.dmg * clamp(1.15 - s.attack / 100, 0.2, 1.15);
  }
  function fleeChance(s, count) {
    return clamp(0.12 + s.mobility * 0.0085 - (count - 1) * 0.09, 0.08, 0.92);
  }
  function fightRange(s, count) {
    const per = fightPer(s) * count;
    return [Math.round(per * 0.6), Math.round(per * 1.4)];
  }

  /* --------------------------------------------------------------- View */

  // What the UI should draw for the current node: scene, title, text, choices.
  function view(s) {
    const n = s.node;
    const cfg = DIFFICULTY[s.difficulty];
    const fl = floorInfo(s, s.floor);
    const floorNumber = cfg.floors - s.floor;
    const v = { scene: 'hallway', title: '', text: [], choices: [], floor: fl, floorNumber };
    const ch = (id, label, extra) => v.choices.push(Object.assign({ id, label }, extra || {}));

    switch (n.type) {
      case 'intro':
        v.scene = 'or';
        v.title = 'The Night Shift';
        v.text = [
          'You work on the top floor of St. Lazarus General as an orthopaedic surgeon. Tonight, halfway through a hip replacement, the power dies.',
          'The backup generator kicks in and you keep working. Then the screaming starts, far off at first, and closer every minute.',
        ];
        ch('operate', 'Finish the operation', { hint: 'The right thing to do. People will remember it.', tone: 'good' });
        ch('investigate', 'Grab the bone saw and investigate', { hint: 'A weapon in your hands. The patient is on their own.', tone: 'bad' });
        break;

      case 'corridor': {
        const cards = s.plan.floors[s.floor];
        const done = s.step >= cards.length;
        v.scene = done ? 'stairs' : (n.scene || 'hallway');
        v.title = fl.name;
        if (done) {
          const last = s.floor === cfg.floors - 1;
          v.text = [last
            ? 'The waiting room opens up ahead, and past it the sliding doors and the grey light of morning. Shapes are packed between you and the exit.'
            : 'You reach the stairwell at the end of the floor. The emergency lights paint everything red.'];
          ch('advance', last ? 'Make a break for the exit' : 'Take the stairs down to floor ' + (floorNumber - 1),
            { hint: last ? 'The final horde is waiting.' : 'Moving on takes time.', tone: last ? 'bad' : undefined });
        } else {
          v.text = [n.text || pickFlavor(fl.quiet, s.turn)];
          const next = cards[s.step];
          ch('advance', 'Push on down the hallway', { hint: s.hearing >= 2 ? hearHint(next) : 'Hallway section ' + (s.step + 1) + ' of ' + cards.length + ' on this floor.' });
        }
        const left = cfg.roomLimit - s.roomsSearched;
        ch('search', 'Search a nearby room', {
          hint: left > 0 ? 'Takes time. ' + left + ' unsearched room' + (left === 1 ? '' : 's') + ' left on this floor.' : 'Every room here is locked, picked clean or overrun.',
          disabled: left <= 0,
        });
        break;
      }

      case 'combat': {
        v.scene = 'zombies';
        v.count = n.count;
        v.title = n.final ? 'The Last Stand' : n.count === 1 ? 'A Zombie!' : n.count + ' Zombies!';
        v.text = [n.text];
        const p = fleeChance(s, n.count);
        ch('fight', n.final ? 'Fight your way to the doors' : 'Fight past them', {
          hint: s.biometrics ? scanFight(s, n.count) : vagueFight(s, n.count), tone: 'bad' });
        ch('flee', n.final ? 'Sprint for the doors' : 'Run for it', {
          hint: (s.biometrics ? scanFlee(p) : vagueFlee(p)) + (n.final ? ' If caught, try again.' : ' Survivors keep hunting you.') });
        if (s.inventory.stim > 0) ch('stim', 'Jab adrenaline and sprint', { hint: 'Uses an Adrenaline. A guaranteed clean escape.', tone: 'good' });
        break;
      }

      case 'exam': {
        v.scene = 'exam';
        v.part = n.part;
        v.title = 'Examination Room: ' + PARTS[n.part].name;
        v.text = [PARTS[n.part].text];
        for (const id of PART_OPTIONS[n.part]) {
          const imp = IMPLANTS[id];
          ch(id, imp.name, { hint: fxHint(imp.fx, imp.asis), implant: id, tone: imp.asis ? 'bad' : undefined, sub: imp.sub });
        }
        break;
      }

      case 'fork': {
        v.scene = 'fork';
        v.title = 'An Intersection';
        v.text = ['The hallway splits. Both ways lead toward the stairs.'];
        if (s.hearing === 0) v.text.push('You strain to listen, but you cannot tell which way is safer.');
        ch('left', 'Turn left', { hint: s.hearing ? hearHint(n.left) : 'No way to tell.' });
        ch('right', 'Turn right', { hint: s.hearing ? hearHint(n.right) : 'No way to tell.' });
        break;
      }

      case 'shortcut':
        v.scene = 'stairs';
        v.title = 'Service Stairs';
        v.text = ['A nurse you recognize leans out of a stairwell door. "Doctor! This way, it skips the whole ward."'];
        ch('take', 'Take the service stairs', { hint: 'Skip the rest of this floor.', tone: 'good' });
        ch('stay', 'Thank them and keep searching here', { hint: 'Stay on this floor.' });
        break;

      case 'patient':
        v.scene = 'patient';
        v.title = 'A Patient';
        v.text = ['A patient is bleeding out on the floor, eyes wide with fear. There are medical supplies around the room, enough for one person.'];
        ch('help', 'Help them', { hint: 'The right thing to do. Takes time.', tone: 'good' });
        ch('self', 'Use the supplies on yourself', { hint: 'Patch yourself up instead. They will not make it.', tone: 'bad' });
        ch('leave', 'Back away quietly', { hint: 'Not your problem. Or is it?' });
        break;

      case 'cabinet':
        v.scene = 'cabinet';
        v.title = 'Locked Drug Cabinet';
        v.text = ['A steel narcotics cabinet, locked and untouched. Through the glass: antibiotics and painkillers.'];
        ch('smash', 'Smash it open', { hint: s.biometrics ? scanCabinet(s) : s.attack >= 30 ? 'You feel strong enough.' : 'Could hurt.' });
        ch('leave', 'Leave it', {});
        break;

      case 'dead':
        v.scene = 'dead';
        v.title = 'Zombified';
        v.text = [n.text];
        break;

      case 'won':
        v.scene = 'exit';
        v.title = 'You Made It';
        v.text = [n.text];
        break;
    }
    return v;
  }

  function pickFlavor(list, k) { return list[Math.abs(k) % list.length]; }
  function hearHint(card) {
    if (!card) return 'Silence.';
    const t = card.t;
    if (t === 'zombies') return 'You hear groaning ahead.';
    if (t === 'cache') return 'You hear the rattle of a supply cart.';
    if (t === 'injury') return 'It is quiet, but your body is warning you.';
    if (t === 'fork') return 'You hear the hallway branch ahead.';
    if (t === 'shortcut') return 'You hear someone whispering "Doctor?"';
    return 'It sounds quiet ahead.';
  }
  function vagueFight(s, count) {
    const [lo, hi] = fightRange(s, count);
    const mid = (lo + hi) / 2;
    if (mid >= s.hp) return 'This could kill you.';
    if (mid >= 16) return 'This will hurt. A lot.';
    if (mid >= 9) return 'You will take some hits.';
    return 'You can handle this.';
  }
  function scanFight(s, count) {
    const [lo, hi] = fightRange(s, count);
    if (hi >= s.hp) return 'Scanner: this fight could kill you.';
    if ((lo + hi) / 2 >= 16) return 'Scanner: heavy damage expected.';
    if ((lo + hi) / 2 >= 9) return 'Scanner: moderate damage expected.';
    return 'Scanner: minor damage expected.';
  }
  function scanFlee(p) {
    if (p >= 0.8) return 'Scanner: escape is very likely.';
    if (p >= 0.6) return 'Scanner: escape is likely.';
    if (p >= 0.4) return 'Scanner: a coin flip.';
    return 'Scanner: escape is unlikely.';
  }
  function scanCabinet(s) {
    const c = cabinetChance(s);
    if (c >= 0.9) return 'Scanner: your arm can easily break it.';
    if (c >= 0.6) return 'Scanner: good odds. Fail and you hurt yourself.';
    return 'Scanner: poor odds. Fail and you hurt yourself.';
  }
  function vagueFlee(p) {
    if (p >= 0.75) return 'Your legs feel quick.';
    if (p >= 0.5) return 'Maybe.';
    return 'You are slow. Risky.';
  }
  // Describe what an implant does in words, never exact numbers.
  function effectWords(fx) {
    const out = [];
    if (fx.hp > 0) out.push(fx.hp >= 20 ? 'Restores a lot of health' : 'Restores a little health');
    if (fx.bleed < 0) out.push('Slows bleeding');
    if (fx.attack > 0) out.push(fx.attack >= 12 ? 'Hits much harder' : 'Hits a little harder');
    if (fx.attack < 0) out.push(fx.attack <= -12 ? 'Much weaker in a fight' : 'A little weaker in a fight');
    if (fx.mobility > 0) out.push('Quicker on your feet');
    if (fx.mobility < 0) out.push(fx.mobility <= -12 ? 'Much slower' : 'A little slower');
    if (fx.infection > 0) out.push(fx.infection >= 6 ? 'High infection risk' : 'Some infection risk');
    if (fx.infection < 0) out.push('Lowers infection risk');
    return out;
  }
  function fxHint(fx, asis) {
    const parts = [];
    if (asis) parts.push(fx.hp === undefined && !fx.infection ? 'Your heart keeps failing' : 'The wound stays open');
    parts.push(...effectWords(fx));
    if (!asis && !fx.cureHeart) parts.unshift('Seals the wound');
    if (fx.cureHeart) parts.unshift('Restores your heartbeat');
    if (fx.biometrics) parts.push('Turns on biometrics');
    if (fx.hearing === 1) parts.push('Hear what waits at intersections');
    if (fx.hearing === 2) parts.push('Hear what waits ahead');
    return parts.join(' · ');
  }
  function cabinetChance(s) { return clamp(0.25 + s.attack / 60, 0.25, 1); }

  /* --------------------------------------------------------------- Choose */

  function choose(s, id) {
    if (s.over) return s;
    const v = view(s);
    const c = v.choices.find(x => x.id === id);
    if (!c || c.disabled) return s;
    const before = snapshot(s);
    const out = [];
    let logLine = '';
    const cfg = DIFFICULTY[s.difficulty];
    const n = s.node;

    switch (n.type) {
      case 'intro':
        if (id === 'operate') {
          apply(s, { karma: 20 });
          out.push('You cannot abandon a patient mid-operation. You finish the hip replacement as the noises outside get worse. You are tying the last suture when something crashes against the door.');
          logLine = 'Finished the operation';
          s.saved++;
        } else {
          apply(s, { karma: -10, attack: 15 });
          out.push('You grab your electric bone saw and leave the patient on the table. They will not last long if you do not come back.');
          logLine = 'Abandoned the patient, took the bone saw';
          s.abandoned++;
        }
        out.push('You step out into the hallway.');
        s.node = { type: 'corridor', text: 'The hallway is dark. Somewhere below you, glass breaks.' };
        break;

      case 'corridor': {
        const cards = s.plan.floors[s.floor];
        if (id === 'search') {
          tick(s, out);
          s.roomsSearched++;
          const room = s.plan.rooms[s.roomIdx++ % s.plan.rooms.length];
          logLine = resolveRoom(s, room, out);
        } else if (s.step >= cards.length) {
          if (s.floor === cfg.floors - 1) {
            const count = clamp(cfg.finalHorde + Math.floor(s.threat / 2), 1, 5);
            s.node = { type: 'combat', count, final: true,
              text: count + ' of them shamble between you and the sliding doors. Daylight is right there.' };
            logLine = 'Reached the lobby';
          } else {
            tick(s, out);
            s.floor++;
            enterFloor(s);
            const fl = floorInfo(s, s.floor);
            out.push('You take the stairs down to floor ' + (cfg.floors - s.floor) + ': ' + fl.name + '.');
            s.node = { type: 'corridor', text: pickFlavor(fl.quiet, s.turn + 1) };
            logLine = 'Descended to ' + fl.name;
          }
        } else {
          tick(s, out);
          const card = cards[s.step++];
          logLine = resolveCard(s, card, out);
        }
        break;
      }

      case 'fork': {
        const card = id === 'left' ? n.left : n.right;
        out.push('You turn ' + id + '.');
        logLine = 'Turned ' + id + '; ' + resolveCard(s, card, out).toLowerCase();
        break;
      }

      case 'combat':
        logLine = resolveCombat(s, n, id, out);
        break;

      case 'exam': {
        const imp = IMPLANTS[id];
        if (!imp.asis) tick(s, out); // surgery takes time
        apply(s, imp.fx);
        const wound = PARTS[n.part].wound;
        if (!imp.asis) {
          if (wound.bleed) s.bleed = clamp(s.bleed - wound.bleed, 0, 10);
          s.parts[n.part] = id;
          s.implants.push(id);
        } else {
          s.parts[n.part] = 'wound';
          if (wound.failing) s.heartFailing = true;
        }
        out.unshift(imp.text);
        logLine = imp.asis ? 'Left the ' + PARTS[n.part].name.toLowerCase() + ' untreated' : 'Installed: ' + imp.name;
        s.node = { type: 'corridor', text: 'You step back out into the hallway.' };
        break;
      }

      case 'shortcut':
        if (id === 'take') {
          tick(s, out);
          s.floor++;
          enterFloor(s);
          const fl = floorInfo(s, s.floor);
          out.push('You slip down the service stairs and come out on floor ' + (cfg.floors - s.floor) + ': ' + fl.name + '.');
          logLine = 'Took the service stairs';
          s.node = { type: 'corridor', text: pickFlavor(fl.quiet, s.turn) };
        } else {
          out.push('You wave them on. "Your funeral, Doctor."');
          logLine = 'Turned down the service stairs';
          s.node = { type: 'corridor' };
        }
        break;

      case 'patient':
        if (id === 'help') {
          tick(s, out);
          apply(s, { karma: 15 });
          s.saved++;
          out.unshift('You kneel and get to work. You stop the bleeding, stabilize them and leave them hidden under a bed. "Thank you, Doctor."');
          logLine = 'Saved a bleeding patient';
        } else if (id === 'self') {
          apply(s, { bleed: -2, hp: 8, karma: -15 });
          s.abandoned++;
          out.push('You use the supplies on yourself and slow your own bleeding. Behind you, the patient grows weaker and quieter.');
          logLine = 'Took the supplies for yourself';
        } else {
          apply(s, { karma: -5 });
          s.abandoned++;
          out.push('You back out of the room. Their eyes follow you to the door.');
          logLine = 'Left a patient behind';
        }
        s.node = { type: 'corridor' };
        break;

      case 'cabinet':
        if (id === 'smash') {
          if (rnd(s) < cabinetChance(s)) {
            gainItem(s, 'antibiotics'); gainItem(s, 'painkillers');
            out.push('The glass gives way on the first blow. You sweep the shelves into your pockets.');
            logLine = 'Smashed open a drug cabinet';
          } else {
            hurt(s, 5, 'glass'); apply(s, { bleed: 1 });
            out.push('The glass holds and your hand does not. You leave a bloody print and nothing else.');
            logLine = 'Cut yourself on a drug cabinet';
          }
        } else {
          out.push('You leave it. Something is moving down the hall anyway.');
          logLine = 'Left the drug cabinet';
        }
        s.node = { type: 'corridor' };
        break;
    }

    finish(s, before, out, logLine);
    return s;
  }

  function resolveCard(s, card, out) {
    const fl = floorInfo(s, s.floor);
    switch (card.t) {
      case 'quiet':
        out.push(pickFlavor(fl.quiet, card.flavor));
        if (card.flavor < 15) {
          const it = randomItem(s); gainItem(s, it);
          out.push('Something on the floor catches your eye: ' + ITEMS[it].name.toLowerCase() + '.');
          s.node = { type: 'corridor', text: 'You pocket it and keep going.' };
          return 'Quiet hallway; found ' + ITEMS[it].name;
        }
        s.node = { type: 'corridor', text: 'Nothing moves. You keep going.' };
        return 'Quiet hallway';
      case 'cache': {
        const items = [randomItem(s)];
        if (s.difficulty === 'intern' || card.flavor < 35) items.push(randomItem(s));
        for (const it of items) gainItem(s, it);
        out.push('An abandoned crash cart! You grab ' + itemList(items) + '.');
        s.node = { type: 'corridor', scene: 'cart', text: 'You check both ways and keep moving.' };
        return 'Raided a crash cart';
      }
      case 'zombies': {
        const count = groupSize(s);
        s.node = { type: 'combat', count, text: card.drawn
          ? 'They followed the screams of the people you left behind. ' + (count === 1 ? 'One of them has found you.' : count + ' of them have found you.')
          : (count === 1 ? 'A zombie in torn scrubs turns toward you, sniffing.' : count + ' zombies shuffle out of the dark. They smell you.') };
        return 'Ran into ' + count + ' zombie' + (count === 1 ? '' : 's');
      }
      case 'injury': {
        const part = s.plan.partOrder.find(p => s.parts[p] === 'ok');
        if (!part) { s.node = { type: 'corridor' }; out.push('A wave of nausea passes. You keep moving.'); return 'Felt faint'; }
        const w = PARTS[part].wound;
        hurt(s, w.hp * DIFFICULTY[s.difficulty].dmg, 'wound');
        if (w.bleed) apply(s, { bleed: w.bleed });
        if (w.failing) s.heartFailing = true;
        s.parts[part] = 'injured';
        out.push(part === 'heart' ? 'Your chest seizes up mid-stride and you start to feel faint. There is an examination room right here.' : pickFlavor(['You start to feel faint and sick. Something is badly wrong.', 'A zombie lunges out of a doorway, tears at you and is gone before you can react.', 'You slip on something wet and go down hard.'], card.flavor) + ' There is an examination room right here.');
        s.node = { type: 'exam', part };
        return 'Injured: ' + PARTS[part].name;
      }
      case 'fork':
        s.node = { type: 'fork', left: card.left, right: card.right };
        return 'Reached an intersection';
      case 'shortcut':
        s.node = { type: 'shortcut' };
        return 'Found the service stairs';
    }
    return '';
  }

  function resolveRoom(s, room, out) {
    const k = room.flavor;
    switch (room.t) {
      case 'supplies': {
        const items = [randomItem(s)];
        if (k < 40) items.push(randomItem(s));
        for (const it of items) gainItem(s, it);
        out.push(pickFlavor(['A supply closet, still stocked.', 'A nurses\' station with the drawers left open.', 'A storeroom behind a jammed door. You force it.'], k) + ' You take ' + itemList(items) + '.');
        s.node = { type: 'corridor', scene: 'supplies', text: 'You stuff your pockets and slip back out.' };
        return 'Searched a room: ' + itemList(items);
      }
      case 'patient':
        s.node = { type: 'patient' };
        return 'Found a bleeding patient';
      case 'zombies': {
        const count = groupSize(s, -0.5);
        s.node = { type: 'combat', count, text: (count === 1 ? 'A zombie was waiting in the dark' : count + ' zombies were waiting in the dark') + ' behind the door!' };
        return 'Ambushed by ' + count + ' zombie' + (count === 1 ? '' : 's');
      }
      case 'snack':
        apply(s, { hp: 10 });
        out.push('A vending machine with the glass already broken. You eat three granola bars standing up.');
        s.node = { type: 'corridor', scene: 'snack', text: 'Fed and a little steadier, you head back out.' };
        return 'Raided a vending machine';
      case 'cabinet':
        s.node = { type: 'cabinet' };
        return 'Found a locked drug cabinet';
      case 'survivor':
        if (s.karma >= 55) {
          const it = randomItem(s); gainItem(s, it); apply(s, { hp: 8 });
          out.push((s.saved > 1 ? 'One of the patients you saved' : 'A survivor') + ' is hiding here. "Doctor! Word is you\'re helping people." They patch you up and press ' + ITEMS[it].name.toLowerCase() + ' into your hand.');
          s.node = { type: 'corridor', scene: 'survivor', text: '"Stay alive, Doctor."' };
          return 'A grateful survivor helped you';
        }
        {
          const have = Object.keys(s.inventory).filter(x => s.inventory[x] > 0);
          if (have.length) {
            const it = pick(s, have); s.inventory[it]--;
            out.push('A survivor recognizes you. "You\'re the one who left people to die." They grab your ' + ITEMS[it].name.toLowerCase() + ' and run.');
            s.node = { type: 'corridor' };
            return 'A survivor stole your ' + ITEMS[it].name;
          }
          out.push('A survivor sees you, spits on the floor and bolts. Word gets around.');
          s.node = { type: 'corridor' };
          return 'A survivor fled from you';
        }
      default:
        out.push(pickFlavor(['An empty office. A half-finished crossword and a cold coffee.', 'A linen closet. Nothing but sheets.', 'A chapel, empty. You take a breath and move on.'], k));
        s.node = { type: 'corridor', scene: 'empty', text: 'Nothing useful. Back to the hallway.' };
        return 'Searched an empty room';
    }
  }

  function resolveCombat(s, n, id, out) {
    const plural = n.count === 1 ? 'it' : 'them';
    const bite = (dmg) => {
      if (dmg >= 9) { apply(s, { bleed: 1 }); out.push('One of them takes a deep bite. You are bleeding more.'); }
      if (dmg > 0) apply(s, { infection: 4 });
    };
    if (id === 'stim') {
      s.inventory.stim--;
      apply(s, { threat: -0.4 });
      out.push('You stab the adrenaline into your thigh. The world slows down and you are past ' + plural + ' before ' + (n.count === 1 ? 'it turns' : 'they turn') + ' around.');
      if (n.final) return win(s, out, 'Sprinted out on adrenaline');
      s.node = { type: 'corridor' };
      return 'Escaped on adrenaline';
    }
    if (id === 'fight') {
      const dmg = hurt(s, fightPer(s) * n.count * (0.6 + 0.8 * rnd(s)), 'zombie');
      s.kills += n.count;
      out.push(dmg <= 2
        ? 'You cut through ' + plural + ' without a scratch.'
        : dmg < 10 ? 'You fight your way past. You did not get through unscathed.' : 'You win, barely. You are torn up.');
      bite(dmg);
      if (n.final && s.hp > 0) return win(s, out, 'Fought through the final horde');
      s.node = { type: 'corridor', text: 'Bodies at your feet. You catch your breath.' };
      return 'Fought ' + n.count + ' zombie' + (n.count === 1 ? '' : 's') + '';
    }
    // flee
    if (rnd(s) < fleeChance(s, n.count)) {
      s.fled += n.count;
      apply(s, { threat: n.final ? 0 : 0.12 * n.count });
      out.push('You get away clean. Behind you, ' + (n.count === 1 ? 'it' : 'they') + ' keep moaning. Still hunting.');
      if (n.final) return win(s, out, 'Sprinted past the final horde');
      s.node = { type: 'corridor', text: 'You lean against a wall, heart pounding.' };
      return 'Fled from ' + n.count + ' zombie' + (n.count === 1 ? '' : 's');
    }
    const dmg = hurt(s, fightPer(s) * n.count * (0.6 + 0.8 * rnd(s)) * 0.9, 'zombie');
    out.push('You try to run but you are too slow and they catch you. You tear free, bleeding.');
    bite(dmg);
    if (n.final) {
      if (s.hp > 0) out.push('They are still between you and the doors.');
      return 'Caught at the doors';
    }
    s.fled += n.count;
    apply(s, { threat: 0.12 * n.count });
    s.node = { type: 'corridor', text: 'You limp away from them.' };
    return 'Caught while fleeing';
  }

  function win(s, out, line) {
    s.over = true; s.won = true;
    const many = s.implants.length >= 3;
    let ending;
    if (s.karma >= 70) ending = { id: 'hero', title: 'Hero of St. Lazarus',
      text: 'You burst out into the morning. Behind you, the patients you saved come limping out of the hospital, one by one, following their doctor.' };
    else if (s.karma <= 30) ending = { id: 'alone', title: 'Sole Survivor',
      text: 'You stagger into the parking lot alone. You made it. Nobody else did. You try not to think about the faces you walked past.' };
    else ending = { id: 'survivor', title: 'Survivor',
      text: 'You rush out of the hospital exit into the cold morning air. You made it. What comes next? Who knows. But you survived the whole fight to get out of the hospital.' };
    if (many) ending.text += ' You catch your reflection in an ambulance window: more machine than surgeon now.';
    s.ending = ending;
    s.node = { type: 'won', text: ending.text };
    out.push('The doors slide open and you are out!');
    return line;
  }

  function finish(s, before, out, logLine) {
    if (!s.over && s.hp <= 0) {
      s.hp = 0;
      s.over = true; s.won = false; s.cause = s.lastHurt;
      const why = {
        bleed: 'You have lost too much blood. The world grows faint as a deep hunger grows in its place...',
        infection: 'The fever wins. Your skin goes grey, your thoughts go slow, and you start to feel very, very hungry...',
        heart: 'Your heart stutters one last time and stops. A minute later, something else starts it again...',
        zombie: 'They drag you down. The last thing you feel is teeth, and then a deep, endless hunger...',
        wound: 'The wound is too much. You slide down the wall as a deep hunger grows...',
        glass: 'You bleed out beside a drug cabinet. Embarrassing, and then hungry...',
      }[s.cause] || 'The world grows faint as a deep hunger grows...';
      s.ending = { id: 'dead', title: 'Zombified', text: why + ' Hopefully you enjoy the taste of brains!' };
      s.node = { type: 'dead', text: s.ending.text };
      logLine += ' and died';
    }
    const deltas = diff(before, s);
    s.result = { text: out, deltas };
    if (logLine) s.log.push({ turn: s.turn, floor: s.floor, text: logLine, bio: s.biometrics, deltas: deltas.filter(d => d.stat === 'hp') });
    if (s.log.length > 80) s.log.shift();
  }

  /* -------------------------------------------------------------- Items */

  function canUse(s, key) {
    if (s.over || !s.inventory[key]) return false;
    if (key === 'stim') return false; // used from the fight menu
    if (key === 'bandage') return s.bleed > 0 || s.hp < s.maxHp;
    if (key === 'antibiotics') return s.infection > 0;
    if (key === 'painkillers') return s.hp < s.maxHp;
    return false;
  }
  function useItem(s, key) {
    if (!canUse(s, key)) return s;
    const before = snapshot(s);
    s.inventory[key]--;
    const out = [];
    if (key === 'bandage') { apply(s, { bleed: -2, hp: 3 }); out.push('You wrap a fresh bandage tight.'); }
    if (key === 'antibiotics') { apply(s, { infection: -20 }); out.push('You dry-swallow a course of antibiotics.'); }
    if (key === 'painkillers') { apply(s, { hp: 18 }); out.push('The painkillers kick in. You feel almost human.'); }
    const deltas = diff(before, s);
    s.result = { text: out, deltas, item: true };
    return s;
  }

  /* -------------------------------------------------------------- Score */

  function score(s) {
    const cfg = DIFFICULTY[s.difficulty];
    const floorsCleared = s.won ? cfg.floors : s.floor;
    const raw = (s.won ? 1000 : 0) + floorsCleared * 120 + Math.max(0, s.hp) * 4 + s.karma * 3 + s.kills * 12 + s.saved * 40 - s.turn * 4;
    const total = Math.max(0, Math.round(raw * cfg.scoreMult));
    let grade = 'F';
    if (s.won) {
      const r = raw;
      grade = r >= 1900 ? 'S' : r >= 1650 ? 'A' : r >= 1400 ? 'B' : 'C';
    } else if (floorsCleared >= cfg.floors - 1) grade = 'D';
    return { total, grade, floorsCleared };
  }

  // Describe a vital without exact numbers (before biometrics are installed).
  function describe(stat, value) {
    const T = {
      hp: [[75, 'Steady'], [50, 'Shaky'], [25, 'Fading'], [0, 'Critical']],
      bleed: [[6, 'Gushing'], [3, 'Heavy'], [1, 'Seeping'], [0, 'Dry']],
      infection: [[45, 'Raging'], [25, 'Feverish'], [8, 'Warm'], [0, 'Clean']],
      attack: [[60, 'Deadly'], [35, 'Strong'], [15, 'Scrappy'], [0, 'Feeble']],
      mobility: [[75, 'Quick'], [50, 'Steady'], [30, 'Limping'], [0, 'Crawling']],
      karma: [[70, 'Saintly'], [45, 'Decent'], [31, 'Shady'], [0, 'Ruthless']],
      threat: [[3, 'Overrun'], [2, 'Swarming'], [1, 'Hunting'], [0, 'Restless']],
    }[stat];
    for (const [min, label] of T) if (value >= min) return label;
    return T[T.length - 1][1];
  }

  function serialize(s) { return JSON.stringify(s); }
  function deserialize(str) {
    try {
      const s = JSON.parse(str);
      if (!s || s.v !== VERSION || !s.plan || !DIFFICULTY[s.difficulty]) return null;
      return s;
    } catch (e) { return null; }
  }

  return {
    VERSION, DIFFICULTY, FLOORS, ITEMS, PARTS, IMPLANTS, PART_OPTIONS,
    newGame, view, choose, effectWords, useItem, canUse, score, describe, floorInfo,
    fightRange, fleeChance, randomSeed, dailySeed, serialize, deserialize,
  };
});
