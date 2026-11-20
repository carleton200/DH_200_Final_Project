#!/usr/bin/env node
/*
 * Balance simulator for Surgical Apocalypse.
 *
 *   node tools/balance-sim.js [runs]
 *
 * Plays thousands of games of the Claude Code enhanced engine with two bot
 * players (a sensible one and a careless one), and plays the original Twine
 * game's rules (ported below from Twine Backups/backup_4.twee) the same way,
 * then prints win rates and how much run length varies.
 */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '..', 'claude-enhanced', 'engine.js'));

const RUNS = Number(process.argv[2]) || 4000;

/* ---------------------------------------------------------------- helpers */

let botSeed = 12345;
function botRand() { // the bots' own dice, separate from the game's
  botSeed = (botSeed * 1664525 + 1013904223) >>> 0;
  return botSeed / 4294967296;
}
const pickOne = (arr) => arr[Math.floor(botRand() * arr.length)];
function stats(values) {
  if (!values.length) return { mean: 0, sd: 0, cv: 0, min: 0, max: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  return { mean, sd, cv: mean ? sd / mean : 0, min: Math.min(...values), max: Math.max(...values) };
}
const pct = (x) => (x * 100).toFixed(1).padStart(5) + '%';

/* ------------------------------------------------------- enhanced bots */

const PREFERRED = { leg: 'osseo_leg', arm: 'bionic_arm', eye: 'bionic_eye', heart: 'pacemaker', ear: 'cochlear' };

function smartBot(s) {
  // Patch up first; using items is free.
  for (let guard = 0; guard < 6; guard++) {
    if (s.bleed >= 2 && E.canUse(s, 'bandage')) E.useItem(s, 'bandage');
    else if (s.infection >= 20 && E.canUse(s, 'antibiotics')) E.useItem(s, 'antibiotics');
    else if (s.hp <= 55 && E.canUse(s, 'painkillers')) E.useItem(s, 'painkillers');
    else if (s.hp <= 40 && s.bleed >= 1 && E.canUse(s, 'bandage')) E.useItem(s, 'bandage');
    else break;
  }
  const v = E.view(s);
  const ids = v.choices.filter(c => !c.disabled).map(c => c.id);
  const n = s.node;
  switch (n.type) {
    case 'intro': return botRand() < 0.5 ? 'operate' : 'investigate';
    case 'corridor': {
      const cards = s.plan.floors[s.floor];
      if (ids.includes('search') && s.hp >= 60 && s.roomsSearched < 1 && s.step < cards.length) return 'search';
      return 'advance';
    }
    case 'combat': {
      const [lo, hi] = E.fightRange(s, n.count);
      const fight = (lo + hi) / 2;
      const p = E.fleeChance(s, n.count);
      const flee = (1 - p) * fight * 0.9 + (n.final ? 0 : 0.12 * n.count * 10);
      if (ids.includes('stim') && (fight >= s.hp * 0.5 || n.final)) return 'stim';
      if (n.final) return p > 0.6 && fight > s.hp * 0.5 ? 'flee' : 'fight';
      return flee < fight ? 'flee' : 'fight';
    }
    case 'exam': return PREFERRED[n.part];
    case 'fork': {
      if (s.hearing) return n.left.t === 'zombies' ? 'right' : 'left';
      return pickOne(['left', 'right']);
    }
    case 'shortcut': return 'take';
    case 'patient': return s.hp >= 45 ? 'help' : 'self';
    case 'cabinet': return s.attack >= 30 ? 'smash' : 'leave';
  }
  return ids[0];
}

function carelessBot(s) {
  // Clicks a random option. Uses an item now and then.
  if (botRand() < 0.3) {
    const usable = Object.keys(E.ITEMS).filter(k => E.canUse(s, k));
    if (usable.length) E.useItem(s, pickOne(usable));
  }
  const v = E.view(s);
  return pickOne(v.choices.filter(c => !c.disabled).map(c => c.id));
}

function playEnhanced(difficulty, bot, seed) {
  const s = E.newGame({ difficulty, seed });
  let steps = 0;
  while (!s.over && steps++ < 500) E.choose(s, bot(s));
  return { won: s.won, turns: s.turn, floor: s.floor, cause: s.cause, hp: s.hp, implants: s.implants.length, score: E.score(s) };
}

/* -------------------------------------------- original Twine game port */

function rand0(n) { return Math.floor(botRand() * (n + 1)); } // Harlowe (random: 0, n)
function playOriginal(bot) {
  const g = { health: 100, karma: 50, mobility: 80, infection: 0, bleed: 0, progress: 0, attack: 5, passages: 0, won: false, over: false, cause: null };
  const FINAL = 60;
  const dead = (cause) => { g.over = true; g.cause = cause; };
  const careless = bot === 'careless';

  // Beginning
  if (botRand() < 0.5) g.karma += 25; else { g.karma -= 10; g.attack += 10; }
  let at = 'hallway';
  while (!g.over && g.passages++ < 400) {
    if (at === 'hallway') { // Enter the Hallway
      g.progress += 1;
      at = rand0(100) > g.karma ? 'zombies' : 'walk';
      if (at === 'walk') at = 'walk:2';
      continue;
    }
    if (at.startsWith('walk')) { // Continue Straight / Turn Left / Turn Right / Go Down
      g.health -= g.bleed;
      g.progress += Number(at.split(':')[1]);
      if (rand0(100) < g.infection) g.health -= 5;
      if (g.health < 1) { dead('bleed'); break; }
      if (g.progress > FINAL - 1) { g.won = true; g.over = true; break; }
      if (rand0(100) > g.karma) { at = 'zombies'; continue; }
      if (rand0(100) < 65) { // feel faint
        if (careless && botRand() < 0.5) { dead('rest'); break; }
        at = 'exam'; continue;
      }
      // hub
      const opts = ['walk:2', 'room'];
      if (rand0(100) < 33) opts.push('walk:2', 'walk:2');
      if (rand0(100) < g.karma / 2) opts.push('walk:5');
      at = careless ? pickOne(opts) : (opts.includes('walk:5') ? 'walk:5' : 'walk:2');
      continue;
    }
    if (at === 'zombies') {
      const fight = careless ? botRand() < 0.5 : g.attack > 25 || g.mobility < 50;
      if (fight) {
        g.progress += 2;
        const dmg = (100 - g.mobility / 5 - g.attack * 2) / 50 * rand0(10);
        if (dmg > 5) g.bleed += 1;
        g.health -= dmg;
      } else {
        g.progress += 1;
        if (g.mobility / 2.5 < rand0(40)) {
          const dmg = (100 - g.mobility / 5 - g.attack * 2) / 50 * rand0(15);
          if (dmg > 5) g.bleed += 1;
          g.health -= dmg;
        }
      }
      if (g.health < 1) { dead('zombie'); break; }
      at = careless ? pickOne(['walk:2', 'walk:2', 'room']) : 'walk:2';
      continue;
    }
    if (at === 'room') { // Enter a Nearby Room
      g.health -= g.bleed; g.progress += 1;
      if (g.health < 1) { dead('bleed'); break; }
      if (rand0(100) < 40) {
        if (careless ? botRand() < 0.5 : g.bleed < 2) { g.karma = Math.min(100, g.karma + 15); g.health -= g.bleed; g.progress += 1; }
        else { g.bleed = Math.max(0, g.bleed - 3); g.karma = Math.max(0, g.karma - 15); g.health = Math.min(100, g.health + 5) - g.bleed; g.progress += 2; }
        if (g.health < 1) { dead('bleed'); break; }
        at = botRand() < 0.5 ? 'hallway' : 'walk:2';
      } else if (rand0(100) < 40) at = botRand() < 0.5 ? 'hallway' : 'walk:2';
      else if (rand0(100) < 60) at = 'zombies';
      else at = botRand() < 0.5 ? 'hallway' : 'walk:2';
      continue;
    }
    if (at === 'exam') { // Enter Examination Room
      g.health -= g.bleed; g.progress += 2;
      if (g.health < 1) { dead('bleed'); break; }
      const limb = 1 + Math.floor(botRand() * 4);
      const menu = {
        1: [['asis'], [5, 1, -4, -2, 0, 10], [5, 1, 1, -1, 5, -5], [5, 1, 1, -1, 15, -10]],
        2: [['asis'], [5, 1, -3, -2, 0, 0], [5, 1, 1, -1, 15, -5]],
        3: [['asis'], [3, 1, 1, -1, 8, 0], [5, 1, -1, -1, 0, 0]],
        4: [['asis'], [8, 2, 0, 0, 8, 8], [10, 0, 1, 0, -30, -50]],
      }[limb];
      const choice = careless ? pickOne(menu) : menu[1];
      if (choice[0] === 'asis') {
        g.health += 8; g.bleed = Math.min(100, g.bleed + 2); g.progress += 1;
        g.infection = Math.min(100, g.infection + 5); g.mobility = Math.max(0, g.mobility - 10);
      } else {
        const [hp, prog, inf, bl, atk, mob] = choice;
        g.health += hp; g.progress += prog;
        g.infection = Math.max(0, Math.min(100, g.infection + inf));
        g.bleed = Math.max(0, g.bleed + bl);
        g.attack = Math.max(0, Math.min(100, g.attack + atk));
        g.mobility = Math.max(0, Math.min(100, g.mobility + mob));
      }
      at = botRand() < 0.5 ? 'hallway' : 'walk:2';
      continue;
    }
  }
  return { won: g.won, turns: g.passages, cause: g.cause, hp: g.health };
}

/* ------------------------------------------------------------------ run */

module.exports = { smartBot, carelessBot, playEnhanced, playOriginal };
if (require.main === module) main();

function main() {

function summarize(label, results) {
  const wins = results.filter(r => r.won);
  const turnsAll = stats(results.map(r => r.turns));
  const turnsWin = stats(wins.map(r => r.turns));
  const causes = {};
  for (const r of results) if (!r.won) causes[r.cause || '?'] = (causes[r.cause || '?'] || 0) + 1;
  const causeStr = Object.entries(causes).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + Math.round(v / results.length * 100) + '%').join(', ');
  console.log(
    label.padEnd(30) + ' win ' + pct(wins.length / results.length) +
    '   length (winning runs) ' + turnsWin.mean.toFixed(1).padStart(5) + ' ± ' + turnsWin.sd.toFixed(1).padStart(4) +
    ' [' + turnsWin.min + '–' + turnsWin.max + ']  cv ' + turnsWin.cv.toFixed(2) +
    '   deaths: ' + (causeStr || 'none'));
  return { win: wins.length / results.length, turnsAll, turnsWin };
}

// Win rate of each seed, judged over batches, shows how "fair" seeds are.
function batchSpread(fn, batches, per) {
  const rates = [];
  for (let b = 0; b < batches; b++) {
    let w = 0;
    for (let i = 0; i < per; i++) if (fn(b * per + i).won) w++;
    rates.push(w / per);
  }
  return stats(rates);
}

console.log('\nSurgical Apocalypse balance report (' + RUNS + ' runs per row)\n');
console.log('ORIGINAL (hand-built Twine rules)');
summarize('  sensible player', Array.from({ length: RUNS }, () => playOriginal('sensible')));
summarize('  random clicker', Array.from({ length: RUNS }, () => playOriginal('careless')));

console.log('\nCLAUDE CODE ENHANCED');
const summary = {};
for (const d of Object.keys(E.DIFFICULTY)) {
  summary[d] = summarize('  ' + E.DIFFICULTY[d].label.padEnd(10) + ' sensible', Array.from({ length: RUNS }, (_, i) => playEnhanced(d, smartBot, 'SIM-' + d + '-' + i)));
}
for (const d of Object.keys(E.DIFFICULTY)) {
  summarize('  ' + E.DIFFICULTY[d].label.padEnd(10) + ' random clicker', Array.from({ length: RUNS }, (_, i) => playEnhanced(d, carelessBot, 'SIMC-' + d + '-' + i)));
}

console.log('\nDeterminism check: same seed + same choices = same result');
{
  const a = E.newGame({ difficulty: 'resident', seed: 'GRIM-SCALPEL-42' });
  const b = E.newGame({ difficulty: 'resident', seed: 'GRIM-SCALPEL-42' });
  botSeed = 99; while (!a.over) E.choose(a, smartBot(a));
  botSeed = 99; while (!b.over) E.choose(b, smartBot(b));
  console.log('  ' + (JSON.stringify(a.log) === JSON.stringify(b.log) && a.hp === b.hp ? 'PASS' : 'FAIL'));
}
console.log('');
}
