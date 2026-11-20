/*
 * Surgical Apocalypse: Claude Code Enhanced
 * Hand-drawn inline SVG art: scenes, implant and item icons, body diagram.
 * Same cartoon style and palette as the landing page. No image files.
 */
(function (root) {
  'use strict';

  const INK = '#120c24';
  let uid = 0;
  const id = (p) => p + '-' + (++uid);

  /* ----------------------------------------------------------- scenes */

  function frame(inner, label) {
    return '<svg class="scene-svg" viewBox="0 0 640 320" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + label + '">' + inner + '</svg>';
  }

  // First-person hospital corridor. `tint` colors the floor's wayfinding stripe.
  function corridor(tint, opts) {
    opts = opts || {};
    const g = id('cg');
    return '' +
      '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1f52"/><stop offset="1" stop-color="#140e2b"/></linearGradient></defs>' +
      '<rect width="640" height="320" fill="#1a1236"/>' +
      // ceiling, walls, floor
      '<path d="M0 0H640L398 104H242Z" fill="#231a48"/>' +
      '<path d="M0 0L242 104V214L0 320Z" fill="url(#' + g + ')"/>' +
      '<path d="M640 0L398 104V214L640 320Z" fill="url(#' + g + ')"/>' +
      '<path d="M0 320L242 214H398L640 320Z" fill="#2c2350"/>' +
      '<path d="M120 320L278 214M520 320L362 214M60 286H580M150 250H490M205 228H435" stroke="#3a2f66" stroke-width="2"/>' +
      // back wall + door
      '<rect x="242" y="104" width="156" height="110" fill="#120c24"/>' +
      '<rect x="290" y="128" width="60" height="86" fill="#1f1640" stroke="#3a2f66" stroke-width="3"/>' +
      '<rect x="302" y="140" width="16" height="22" fill="#a8f04e" opacity=".25"/><rect x="322" y="140" width="16" height="22" fill="#a8f04e" opacity=".25"/>' +
      // wayfinding stripe
      '<path d="M0 214L242 168V176L0 232Z" fill="' + tint + '" opacity=".75"/>' +
      '<path d="M640 214L398 168V176L640 232Z" fill="' + tint + '" opacity=".75"/>' +
      // side doors
      '<path d="M44 52L130 76V250L44 286Z" fill="#1f1640" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M60 92L114 104V150L60 144Z" fill="#a8f04e" opacity=".18"/>' +
      '<path d="M596 52L510 76V250L596 286Z" fill="#1f1640" stroke="' + INK + '" stroke-width="4"/>' +
      '<rect x="526" y="96" width="34" height="12" rx="2" fill="#f6f0d8" transform="skewY(14)" opacity=".85"/>' +
      '<path d="M178 92L216 100V218L178 236Z" fill="#1f1640" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M462 92L424 100V218L462 236Z" fill="#1f1640" stroke="' + INK + '" stroke-width="3"/>' +
      // ceiling lights
      '<path class="flicker" d="M262 28H378L366 46H274Z" fill="#fff6c8"/>' +
      '<path d="M286 66H354L348 78H292Z" fill="#fff6c8" opacity=".75"/>' +
      '<path class="flicker slow" d="M302 90H338L336 96H304Z" fill="#fff6c8" opacity=".6"/>' +
      '<path d="M262 46L180 320H460L378 46Z" fill="#fff6c8" opacity=".05"/>' +
      // goo puddle and a toppled gurney
      (opts.props === false ? '' :
        '<path d="M392 278c18-10 52-8 62 2 8 10-20 18-46 14-22-2-30-10-16-16z" fill="#a8f04e" stroke="' + INK + '" stroke-width="3"/>' +
        '<g transform="translate(70 236) rotate(-6)"><rect x="0" y="0" width="120" height="16" rx="5" fill="#c9ccd6" stroke="' + INK + '" stroke-width="4"/><path d="M14 16v26M106 16v26" stroke="' + INK + '" stroke-width="5"/><circle cx="14" cy="46" r="6" fill="#6c7691" stroke="' + INK + '" stroke-width="3"/><circle cx="106" cy="46" r="6" fill="#6c7691" stroke="' + INK + '" stroke-width="3"/><path d="M8 0q30-14 60-4" fill="none" stroke="#f6f0d8" stroke-width="7" stroke-linecap="round"/></g>');
  }

  const ZOMBIE_COLORS = [
    ['#9bd96f', '#c9577c', '#4a3f7a'], ['#7fc7a0', '#e0a13a', '#3d4a6b'],
    ['#b5d85a', '#5b8fd6', '#5a3b5e'], ['#8fd1c0', '#f0ece0', '#3f5a4a'], ['#a6cf7a', '#2fb7a8', '#2c3f5a'],
  ];
  function zombie(x, y, h, i, flip) {
    const w = h * 0.6;
    const [skin, shirt, pants] = ZOMBIE_COLORS[i % ZOMBIE_COLORS.length];
    return '<g class="zshamble" style="--d:' + (-i * 0.37) + 's;transform-origin:' + (x + w / 2) + 'px ' + (y + h) + 'px"><svg x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" viewBox="0 0 120 200" style="--skin:' + skin + ';--shirt:' + shirt + ';--pants:' + pants + '" overflow="visible"><g' + (flip ? ' transform="translate(120 0) scale(-1 1)"' : '') + '><use href="#zombie"/></g></svg></g>';
  }

  function zombies(tint, count) {
    const slots = [
      [268, 112, 120], [190, 110, 150], [370, 104, 158], [96, 92, 210], [452, 86, 222],
    ];
    const order = [[0], [1, 2], [0, 1, 2], [1, 2, 3, 4], [0, 1, 2, 3, 4]][Math.min(count, 5) - 1];
    let z = '';
    // far ones first so near ones overlap them
    order.slice().sort((a, b) => slots[a][2] - slots[b][2]).forEach((k, n) => {
      const [x, y, h] = slots[k];
      z += zombie(x, y, h, k + n, k % 2 === 1);
    });
    return corridor(tint, { props: false }) + '<rect width="640" height="320" fill="#2a0a1e" opacity=".25"/>' + z;
  }

  function operatingRoom() {
    return '' +
      '<rect width="640" height="320" fill="#183a44"/>' +
      '<path d="M0 230H640V320H0Z" fill="#12303a"/>' +
      '<path d="M0 230H640" stroke="' + INK + '" stroke-width="4"/>' +
      '<g stroke="#21505c" stroke-width="2">' + Array.from({ length: 12 }, (_, i) => '<path d="M' + (i * 56) + ' 0V230"/>').join('') + '<path d="M0 60H640M0 120H640M0 180H640"/></g>' +
      // surgical lamp
      '<path d="M320 0V40" stroke="' + INK + '" stroke-width="8"/>' +
      '<ellipse cx="320" cy="58" rx="92" ry="26" fill="#c9ccd6" stroke="' + INK + '" stroke-width="5"/>' +
      '<ellipse class="flicker" cx="320" cy="62" rx="70" ry="14" fill="#fff6c8"/>' +
      '<path d="M250 70L170 238H470L390 70Z" fill="#fff6c8" opacity=".08"/>' +
      // table + patient under sheet
      '<rect x="170" y="196" width="300" height="22" rx="6" fill="#9aa3b8" stroke="' + INK + '" stroke-width="5"/>' +
      '<path d="M310 218V266M280 266H340" stroke="' + INK + '" stroke-width="10" stroke-linecap="round"/>' +
      '<path d="M182 198q10-36 60-36h140q58 0 72 36z" fill="#2fb7a8" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>' +
      '<circle cx="206" cy="176" r="20" fill="#f2b98a" stroke="' + INK + '" stroke-width="5"/>' +
      '<path d="M196 170h8M210 170h8" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      // monitor
      '<rect x="500" y="92" width="110" height="80" rx="8" fill="#2a1f52" stroke="' + INK + '" stroke-width="5"/>' +
      '<path class="ecg-path" d="M508 134h22l6-14 8 30 8-24 5 8h45" fill="none" stroke="#a8f04e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M555 172V230" stroke="' + INK + '" stroke-width="7"/>' +
      // instrument tray
      '<rect x="40" y="150" width="96" height="12" rx="4" fill="#c9ccd6" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M88 162V232" stroke="' + INK + '" stroke-width="6"/>' +
      '<path d="M54 146l22-10M84 146l20-14M110 148l14-12" stroke="#eef4ff" stroke-width="4" stroke-linecap="round"/>' +
      // warning light
      '<circle class="alarm" cx="40" cy="40" r="14" fill="#ff4d5e" stroke="' + INK + '" stroke-width="4"/>';
  }

  function room(kind, tint) {
    const wall = '<rect width="640" height="320" fill="#2a1f52"/><path d="M0 236H640V320H0Z" fill="#1f1640"/><path d="M0 236H640" stroke="' + INK + '" stroke-width="4"/><path d="M0 200H640V212H0Z" fill="' + (tint || '#2fb7a8') + '" opacity=".5"/>';
    const window_ = '<rect x="40" y="40" width="120" height="96" rx="4" fill="#120b2a" stroke="' + INK + '" stroke-width="5"/><circle cx="120" cy="70" r="14" fill="#a8f04e" opacity=".85"/><path d="M100 40V136M40 88H160" stroke="' + INK + '" stroke-width="5"/>';
    switch (kind) {
      case 'exam':
        return wall + window_ +
          // exam bed
          '<rect x="200" y="186" width="230" height="22" rx="8" fill="#e9e2c8" stroke="' + INK + '" stroke-width="5"/>' +
          '<path d="M200 186q-6-40 30-40" fill="none" stroke="' + INK + '" stroke-width="5"/>' +
          '<path d="M220 208V262M410 208V262" stroke="' + INK + '" stroke-width="8"/>' +
          // mirror
          '<rect x="470" y="40" width="70" height="90" rx="30" fill="#5b8fd6" opacity=".55" stroke="' + INK + '" stroke-width="5"/>' +
          '<path d="M488 62l20-14" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>' +
          // implant tray
          '<rect x="452" y="180" width="160" height="14" rx="4" fill="#c9ccd6" stroke="' + INK + '" stroke-width="4"/>' +
          '<path d="M532 194V262" stroke="' + INK + '" stroke-width="6"/>' +
          '<g transform="translate(462 132) scale(.9)"><path d="M10 40L34 14" stroke="' + INK + '" stroke-width="14" stroke-linecap="round"/><path d="M10 40L34 14" stroke="#aab2c5" stroke-width="7" stroke-linecap="round"/><circle cx="76" cy="30" r="14" fill="#fff" stroke="' + INK + '" stroke-width="4"/><circle cx="76" cy="30" r="6" fill="#a8f04e" stroke="' + INK + '" stroke-width="3"/><path d="M110 46V10" stroke="' + INK + '" stroke-width="12" stroke-linecap="round"/><path d="M110 46V10" stroke="#c9ccd6" stroke-width="6" stroke-linecap="round"/><rect x="134" y="22" width="26" height="22" rx="7" fill="#c9ccd6" stroke="' + INK + '" stroke-width="4"/><path d="M147 38c-6-4-6-9-2-9 2 0 2 2 2 2s0-2 2-2c4 0 4 5-2 9z" fill="#ff4d5e"/></g>' +
          // red cross
          '<g transform="translate(300 60)"><rect width="56" height="56" rx="8" fill="#f6f0d8" stroke="' + INK + '" stroke-width="4"/><path d="M22 10h12v12h12v12H34v12H22V34H10V22h12z" fill="#ff4d5e"/></g>';
      case 'patient':
        return wall + window_ +
          '<path d="M520 70V250M500 250h40" stroke="' + INK + '" stroke-width="6"/><rect x="532" y="74" width="34" height="50" rx="10" fill="#ff8f9a" opacity=".85" stroke="' + INK + '" stroke-width="4"/><path d="M549 124q0 60-80 90" fill="none" stroke="#9aa3b8" stroke-width="3"/>' +
          '<path d="M150 262q20-30 90-30h160q50 0 64 30z" fill="#f6f0d8" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>' +
          '<circle cx="180" cy="236" r="22" fill="#f2b98a" stroke="' + INK + '" stroke-width="5"/>' +
          '<ellipse cx="174" cy="232" rx="4" ry="5" fill="' + INK + '"/><ellipse cx="190" cy="232" rx="4" ry="5" fill="' + INK + '"/>' +
          '<path d="M176 246q6-4 12 0" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
          '<path d="M300 236q20-8 40 0" fill="none" stroke="#ff4d5e" stroke-width="10" stroke-linecap="round"/>' +
          '<g transform="translate(560 220)"><rect width="56" height="40" rx="6" fill="#f6f0d8" stroke="' + INK + '" stroke-width="4"/><path d="M22 8h12v8h8v10h-8v8H22v-8h-8V16h8z" fill="#ff4d5e"/></g>';
      case 'cabinet':
        return wall +
          '<rect x="220" y="40" width="200" height="220" rx="8" fill="#9aa3b8" stroke="' + INK + '" stroke-width="6"/>' +
          '<rect x="238" y="58" width="164" height="184" rx="4" fill="#5b8fd6" opacity=".35" stroke="' + INK + '" stroke-width="4"/>' +
          '<path d="M238 120H402M238 182H402" stroke="' + INK + '" stroke-width="4"/>' +
          bottles(250, 84) + bottles(250, 146) + bottles(250, 208) +
          '<path d="M260 70l40 40M330 66l12 12" stroke="#fff" stroke-width="5" opacity=".5" stroke-linecap="round"/>' +
          '<rect x="402" y="140" width="22" height="34" rx="4" fill="#ffd23f" stroke="' + INK + '" stroke-width="4"/><circle cx="413" cy="152" r="4" fill="' + INK + '"/>' +
          '<g transform="translate(470 70)"><rect width="110" height="44" rx="6" fill="#ff4d5e" stroke="' + INK + '" stroke-width="4"/><text x="55" y="29" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="20" fill="#fff6ea" letter-spacing="2">RESTRICTED</text></g>';
      case 'supplies':
        return wall +
          shelf(60, 70) + shelf(60, 150) + shelf(360, 70) + shelf(360, 150) +
          '<path d="M60 230H580" stroke="' + INK + '" stroke-width="5"/>';
      case 'snack':
        return wall + window_ +
          '<rect x="250" y="30" width="170" height="232" rx="10" fill="#ff4d5e" stroke="' + INK + '" stroke-width="6"/>' +
          '<rect x="266" y="48" width="110" height="160" rx="4" fill="#120b2a" stroke="' + INK + '" stroke-width="4"/>' +
          Array.from({ length: 4 }, (_, r) => Array.from({ length: 3 }, (_, c) => '<rect x="' + (274 + c * 34) + '" y="' + (58 + r * 38) + '" width="24" height="26" rx="3" fill="' + ['#ffd23f', '#a8f04e', '#2fb7a8', '#e8825e'][(r + c) % 4] + '" stroke="' + INK + '" stroke-width="2.5"/>').join('')).join('') +
          '<path d="M276 60l44 80M340 100l30 70" stroke="#fff" stroke-width="3" opacity=".5"/>' +
          '<rect x="384" y="70" width="26" height="60" rx="4" fill="#f6f0d8" stroke="' + INK + '" stroke-width="3"/>' +
          '<rect x="280" y="220" width="96" height="24" rx="4" fill="#120b2a" stroke="' + INK + '" stroke-width="4"/>';
      case 'survivor':
        return wall + window_ +
          '<path d="M380 120L640 60V320H460Z" fill="#fff6c8" opacity=".12"/>' +
          '<g transform="translate(330 70)">' +
          '<path d="M10 120q0-40 40-40t40 40v100H10z" fill="#9cc4dd" stroke="' + INK + '" stroke-width="5"/>' +
          '<path d="M30 220v26M70 220v26" stroke="' + INK + '" stroke-width="12" stroke-linecap="round"/>' +
          '<circle cx="50" cy="50" r="30" fill="#c98b5e" stroke="' + INK + '" stroke-width="5"/>' +
          '<path d="M22 40q28-36 56 0" fill="#3a2a22" stroke="' + INK + '" stroke-width="4"/>' +
          '<circle cx="40" cy="54" r="4" fill="' + INK + '"/><circle cx="60" cy="54" r="4" fill="' + INK + '"/>' +
          '<path d="M42 68q8 6 16 0" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
          '<path d="M88 110l40-30" stroke="' + INK + '" stroke-width="18" stroke-linecap="round"/><path d="M88 110l40-30" stroke="#9cc4dd" stroke-width="10" stroke-linecap="round"/>' +
          '<rect x="120" y="66" width="26" height="14" rx="3" fill="#ffd23f" stroke="' + INK + '" stroke-width="3" transform="rotate(-36 133 73)"/></g>';
      case 'cart':
        return corridor(tint, { props: false }) +
          '<g transform="translate(250 150)"><rect width="140" height="120" rx="8" fill="#ff4d5e" stroke="' + INK + '" stroke-width="6"/>' +
          '<path d="M0 30H140M0 60H140M0 90H140" stroke="' + INK + '" stroke-width="4"/>' +
          '<path d="M56 15h28M56 45h28M56 75h28M56 105h28" stroke="#f6f0d8" stroke-width="5" stroke-linecap="round"/>' +
          '<circle cx="20" cy="128" r="9" fill="#6c7691" stroke="' + INK + '" stroke-width="4"/><circle cx="120" cy="128" r="9" fill="#6c7691" stroke="' + INK + '" stroke-width="4"/>' +
          '<rect x="30" y="-22" width="80" height="22" rx="4" fill="#c9ccd6" stroke="' + INK + '" stroke-width="4"/></g>';
      default: // empty office
        return wall + window_ +
          '<rect x="220" y="170" width="260" height="20" rx="4" fill="#8a6f4d" stroke="' + INK + '" stroke-width="5"/>' +
          '<path d="M240 190V262M460 190V262" stroke="' + INK + '" stroke-width="8"/>' +
          '<rect x="260" y="150" width="70" height="20" fill="#f6f0d8" stroke="' + INK + '" stroke-width="3"/>' +
          '<path d="M270 156h50M270 162h36" stroke="#9aa3b8" stroke-width="2"/>' +
          '<path d="M400 140h28l-4 30h-20z" fill="#f6f0d8" stroke="' + INK + '" stroke-width="4"/><path d="M428 148q12 0 10 12h-12" fill="none" stroke="' + INK + '" stroke-width="4"/>' +
          '<path class="steam" d="M410 132q-6-10 2-18M420 132q-6-10 2-18" fill="none" stroke="#cfc6ee" stroke-width="3" stroke-linecap="round" opacity=".6"/>' +
          '<rect x="480" y="40" width="110" height="80" rx="6" fill="#f6f0d8" stroke="' + INK + '" stroke-width="4" transform="rotate(4 535 80)"/>' +
          '<path d="M496 64h70M496 80h50M496 96h64" stroke="#9aa3b8" stroke-width="3" transform="rotate(4 535 80)"/>';
    }
  }

  function bottles(x, y) {
    let out = '';
    const colors = ['#e8825e', '#a8f04e', '#f6f0d8', '#ffd23f', '#2fb7a8'];
    for (let i = 0; i < 5; i++) {
      out += '<rect x="' + (x + i * 30) + '" y="' + (y + 6) + '" width="20" height="28" rx="4" fill="' + colors[i] + '" stroke="' + INK + '" stroke-width="3"/><rect x="' + (x + i * 30 + 2) + '" y="' + y + '" width="16" height="8" rx="2" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/>';
    }
    return out;
  }
  function shelf(x, y) {
    const colors = ['#f6f0d8', '#5b8fd6', '#a8f04e', '#e8825e', '#f6f0d8', '#ffd23f'];
    let out = '<path d="M' + x + ' ' + (y + 60) + 'h220" stroke="' + INK + '" stroke-width="6"/>';
    for (let i = 0; i < 6; i++) {
      const h = 30 + ((i * 7) % 24);
      out += '<rect x="' + (x + 8 + i * 35) + '" y="' + (y + 60 - h) + '" width="28" height="' + h + '" rx="3" fill="' + colors[i] + '" stroke="' + INK + '" stroke-width="3"/>';
      if (i % 2 === 0) out += '<path d="M' + (x + 22 + i * 35) + ' ' + (y + 64 - h) + 'v10M' + (x + 17 + i * 35) + ' ' + (y + 69 - h) + 'h10" stroke="#ff4d5e" stroke-width="3"/>';
    }
    return out;
  }

  function fork(tint) {
    return '' +
      '<rect width="640" height="320" fill="#1a1236"/>' +
      '<path d="M0 0H640L560 60H80Z" fill="#231a48"/>' +
      '<path d="M0 320L80 250H560L640 320Z" fill="#2c2350"/>' +
      '<rect x="80" y="60" width="480" height="190" fill="#2a1f52"/>' +
      '<path d="M80 200H560V210H80Z" fill="' + tint + '" opacity=".7"/>' +
      // two openings
      '<path d="M80 60L0 0V320L80 250Z" fill="#120c24"/><path d="M560 60L640 0V320L560 250Z" fill="#120c24"/>' +
      '<path d="M0 60L80 100V230L0 270Z" fill="#0c0818"/><path d="M640 60L560 100V230L640 270Z" fill="#0c0818"/>' +
      // signs
      '<g transform="translate(150 90)"><rect width="140" height="50" rx="8" fill="#f6f0d8" stroke="' + INK + '" stroke-width="5"/><path d="M20 25h70M20 25l18-14M20 25l18 14" stroke="' + INK + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><text x="118" y="34" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="24" fill="' + INK + '">?</text></g>' +
      '<g transform="translate(350 90)"><rect width="140" height="50" rx="8" fill="#f6f0d8" stroke="' + INK + '" stroke-width="5"/><path d="M120 25H50M120 25l-18-14M120 25l-18 14" stroke="' + INK + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><text x="22" y="34" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="24" fill="' + INK + '">?</text></g>' +
      '<path class="flicker" d="M260 10H380L370 26H270Z" fill="#fff6c8"/>' +
      '<path d="M300 250c14-8 40-6 48 2 6 8-16 14-36 12-16-2-22-8-12-14z" fill="#a8f04e" stroke="' + INK + '" stroke-width="3"/>';
  }

  function stairs() {
    let steps = '';
    for (let i = 0; i < 8; i++) {
      steps += '<rect x="' + (140 + i * 46) + '" y="' + (120 + i * 22) + '" width="' + (360 - i * 10) + '" height="22" fill="' + (i % 2 ? '#3a2f66' : '#2f2558') + '" stroke="' + INK + '" stroke-width="3"/>';
    }
    return '' +
      '<rect width="640" height="320" fill="#2a0f22"/>' +
      '<rect class="alarm-wash" width="640" height="320" fill="#ff4d5e" opacity=".12"/>' +
      '<path d="M0 0H640V320H0Z" fill="none"/>' +
      steps +
      '<path d="M120 116L470 300" stroke="#c9ccd6" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M160 136v-40M250 184v-40M340 232v-40M430 280v-40" stroke="#c9ccd6" stroke-width="5"/>' +
      '<g transform="translate(470 40)"><rect width="130" height="54" rx="6" fill="#1e7a3a" stroke="' + INK + '" stroke-width="5"/><text x="65" y="38" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="30" fill="#e9ffb0" letter-spacing="3">EXIT</text></g>' +
      '<circle class="alarm" cx="80" cy="50" r="16" fill="#ff4d5e" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M80 66V100" stroke="' + INK + '" stroke-width="5"/>' +
      '<text x="70" y="250" font-family="Bangers, Impact, sans-serif" font-size="64" fill="#f6f0d8" opacity=".2">F</text>';
  }

  function dead() {
    return '' +
      '<rect width="640" height="320" fill="#120b2a"/>' +
      '<circle cx="320" cy="140" r="120" fill="#a8f04e" opacity=".9"/>' +
      '<circle cx="280" cy="110" r="18" fill="#7cbf3c" opacity=".6"/><circle cx="370" cy="180" r="24" fill="#7cbf3c" opacity=".5"/>' +
      '<path d="M0 260H640V320H0Z" fill="#1a1236"/>' +
      '<g class="zshamble" style="transform-origin:320px 300px"><svg x="248" y="70" width="144" height="240" viewBox="0 0 120 200" style="--skin:#9bd96f;--shirt:#2fb7a8;--pants:#1f8f85" overflow="visible"><use href="#zombie"/></svg></g>' +
      '<path d="M300 112q20-6 40 0" fill="none" stroke="#2fb7a8" stroke-width="0"/>';
  }

  function exit() {
    const g = id('sun');
    return '' +
      '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb36b"/><stop offset=".6" stop-color="#ffd23f"/><stop offset="1" stop-color="#fff6c8"/></linearGradient></defs>' +
      '<rect width="640" height="320" fill="#1a1236"/>' +
      '<rect x="160" y="40" width="320" height="230" fill="url(#' + g + ')"/>' +
      '<circle cx="320" cy="210" r="60" fill="#fff6c8"/>' +
      '<path d="M160 230h320v40H160z" fill="#5fae2a"/>' +
      '<path d="M200 230l30-40 30 40M390 230l24-30 24 30" fill="#3d7a1e"/>' +
      // ambulance
      '<g transform="translate(360 196)"><rect width="90" height="44" rx="6" fill="#f6f0d8" stroke="' + INK + '" stroke-width="4"/><path d="M90 14h20l14 16v14H90z" fill="#f6f0d8" stroke="' + INK + '" stroke-width="4"/><path d="M38 12h14v8h8v12h-8v8H38v-8h-8V20h8z" fill="#ff4d5e"/><circle cx="22" cy="46" r="9" fill="#6c7691" stroke="' + INK + '" stroke-width="4"/><circle cx="104" cy="46" r="9" fill="#6c7691" stroke="' + INK + '" stroke-width="4"/></g>' +
      // sliding doors opened
      '<rect x="100" y="30" width="80" height="250" fill="#5b8fd6" opacity=".45" stroke="' + INK + '" stroke-width="6"/>' +
      '<rect x="460" y="30" width="80" height="250" fill="#5b8fd6" opacity=".45" stroke="' + INK + '" stroke-width="6"/>' +
      '<path d="M0 0H640V30H0ZM0 30H100V320H0ZM540 30H640V320H540Z" fill="#2a1f52"/>' +
      '<path d="M0 280H640V320H0Z" fill="#2c2350"/>' +
      '<path d="M270 300l100 0" stroke="#f6f0d8" stroke-width="6" stroke-dasharray="20 14"/>' +
      '<g transform="translate(240 6)"><rect width="160" height="22" rx="4" fill="#ff4d5e" stroke="' + INK + '" stroke-width="3"/><text x="80" y="17" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="16" fill="#fff" letter-spacing="2">EMERGENCY</text></g>';
  }

  function scene(name, o) {
    o = o || {};
    const tint = o.tint || '#2fb7a8';
    switch (name) {
      case 'or': return frame(operatingRoom(), 'An operating room lit by a flickering surgical lamp');
      case 'zombies': return frame(zombies(tint, o.count || 1), (o.count || 1) + ' zombies shambling down a dark hospital corridor');
      case 'exam': return frame(room('exam', tint), 'An examination room with a tray of implants');
      case 'patient': return frame(room('patient', tint), 'A frightened patient lying in a hospital bed');
      case 'cabinet': return frame(room('cabinet', tint), 'A locked drug cabinet full of pill bottles');
      case 'supplies': return frame(room('supplies', tint), 'Shelves of medical supplies');
      case 'snack': return frame(room('snack', tint), 'A broken vending machine');
      case 'survivor': return frame(room('survivor', tint), 'A survivor in a hospital gown waving a flashlight');
      case 'empty': return frame(room('empty', tint), 'An empty office with a cold cup of coffee');
      case 'cart': return frame(room('cart', tint), 'An abandoned red crash cart in a corridor');
      case 'fork': return frame(fork(tint), 'A hallway splitting left and right');
      case 'stairs': return frame(stairs(), 'A stairwell lit red by emergency lights');
      case 'dead': return frame(dead(), 'A zombie in surgical scrubs under a green moon');
      case 'exit': return frame(exit(), 'Open hospital doors with the sunrise outside');
      default: return frame(corridor(tint), 'A dark hospital corridor with flickering lights');
    }
  }

  /* ------------------------------------------------------------ icons */

  const ICONS = {
    asis: '<rect x="8" y="18" width="32" height="14" rx="7" transform="rotate(-30 24 25)" fill="#f6f0d8" stroke="#120c24" stroke-width="3"/><rect x="18" y="19" width="12" height="12" rx="2" transform="rotate(-30 24 25)" fill="#ff8f9a" stroke="#120c24" stroke-width="2"/>',
    osseo_leg: '<rect x="17" y="4" width="16" height="16" rx="5" fill="#6c7691" stroke="#120c24" stroke-width="3"/><path d="M25 20v10" stroke="#120c24" stroke-width="8" stroke-linecap="round"/><path d="M25 20v10" stroke="#c9ccd6" stroke-width="3.5" stroke-linecap="round"/><path d="M25 29q-3 13 9 14h7" fill="none" stroke="#120c24" stroke-width="9" stroke-linecap="round"/><path d="M25 29q-3 13 9 14h7" fill="none" stroke="#aab2c5" stroke-width="4.5" stroke-linecap="round"/>',
    peg_leg: '<rect x="15" y="4" width="18" height="14" rx="5" fill="#f2b98a" stroke="#120c24" stroke-width="3"/><path d="M24 18L22 44" stroke="#120c24" stroke-width="10" stroke-linecap="round"/><path d="M24 18L22 44" stroke="#a87443" stroke-width="5" stroke-linecap="round"/><path d="M18 14h12" stroke="#5a3b1e" stroke-width="3"/>',
    bionic_leg: '<rect x="14" y="3" width="20" height="16" rx="5" fill="#6c7691" stroke="#120c24" stroke-width="3"/><rect x="16" y="19" width="16" height="18" rx="4" fill="#aab2c5" stroke="#120c24" stroke-width="3"/><circle cx="24" cy="21" r="4" fill="#a8f04e" stroke="#120c24" stroke-width="2"/><path d="M16 37h20l6 6H14z" fill="#6c7691" stroke="#120c24" stroke-width="3" stroke-linejoin="round"/>',
    titanium_arm: '<path d="M10 38L38 10" stroke="#120c24" stroke-width="12" stroke-linecap="round"/><path d="M10 38L38 10" stroke="#f6f0d8" stroke-width="7" stroke-linecap="round"/><rect x="16" y="20" width="16" height="8" rx="2" transform="rotate(-45 24 24)" fill="#9aa3b8" stroke="#120c24" stroke-width="2.5"/><circle cx="20" cy="28" r="1.8" fill="#120c24"/><circle cx="28" cy="20" r="1.8" fill="#120c24"/>',
    bionic_arm: '<path d="M8 40L22 26 36 14" fill="none" stroke="#120c24" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 40L22 26 36 14" fill="none" stroke="#aab2c5" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="26" r="5" fill="#6c7691" stroke="#120c24" stroke-width="2.5"/><circle cx="22" cy="26" r="1.8" fill="#a8f04e"/><path d="M34 8q6-4 9 2M40 18q6 1 4-6" fill="none" stroke="#120c24" stroke-width="5" stroke-linecap="round"/><path d="M34 8q6-4 9 2M40 18q6 1 4-6" fill="none" stroke="#aab2c5" stroke-width="2" stroke-linecap="round"/>',
    glass_eye: '<path d="M4 24q20-20 40 0-20 20-40 0z" fill="#fff" stroke="#120c24" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="24" r="9" fill="#5b8fd6" stroke="#120c24" stroke-width="3"/><circle cx="24" cy="24" r="3.5" fill="#120c24"/><circle cx="27" cy="21" r="2" fill="#fff"/>',
    bionic_eye: '<path d="M4 24q20-20 40 0-20 20-40 0z" fill="#fff" stroke="#120c24" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="24" r="9" fill="#6c7691" stroke="#120c24" stroke-width="3"/><circle cx="24" cy="24" r="5" fill="#a8f04e" stroke="#120c24" stroke-width="2"/><path d="M24 12v4M24 32v4M12 24h4M32 24h4" stroke="#120c24" stroke-width="2" stroke-linecap="round"/>',
    pacemaker: '<rect x="6" y="14" width="34" height="26" rx="9" fill="#c9ccd6" stroke="#120c24" stroke-width="3"/><path d="M23 35c-9-6-8-13-4-13 2 0 4 2 4 2s2-2 4-2c4 0 5 7-4 13z" fill="#ff4d5e" stroke="#120c24" stroke-width="2" stroke-linejoin="round"/><path d="M34 16q8-8 6-13" fill="none" stroke="#ff4d5e" stroke-width="3" stroke-linecap="round"/>',
    heart_lung: '<rect x="8" y="8" width="32" height="28" rx="4" fill="#9aa3b8" stroke="#120c24" stroke-width="3"/><rect x="12" y="12" width="14" height="10" rx="2" fill="#120b2a"/><path d="M13 17h3l2-3 2 6 2-3h3" fill="none" stroke="#a8f04e" stroke-width="1.5"/><circle cx="33" cy="17" r="4" fill="#ff4d5e" stroke="#120c24" stroke-width="2"/><path d="M14 28h20" stroke="#120c24" stroke-width="2.5"/><circle cx="14" cy="40" r="4" fill="#6c7691" stroke="#120c24" stroke-width="2.5"/><circle cx="34" cy="40" r="4" fill="#6c7691" stroke="#120c24" stroke-width="2.5"/><path d="M40 14q8 0 6 14" fill="none" stroke="#ff4d5e" stroke-width="3"/>',
    hearing_aid: '<path d="M30 6q12 4 10 18-2 10-10 14l-4 6" fill="none" stroke="#120c24" stroke-width="10" stroke-linecap="round"/><path d="M30 6q12 4 10 18-2 10-10 14l-4 6" fill="none" stroke="#e8c39e" stroke-width="5" stroke-linecap="round"/><path d="M26 44q-8 0-10-6" fill="none" stroke="#9aa3b8" stroke-width="3" stroke-linecap="round"/><circle cx="14" cy="36" r="4" fill="#9aa3b8" stroke="#120c24" stroke-width="2"/>',
    cochlear: '<path d="M16 40q-10-8-8-20 4-14 18-14 14 2 14 16 0 10-10 12-8 0-8-8 0-6 6-6" fill="none" stroke="#120c24" stroke-width="8" stroke-linecap="round"/><path d="M16 40q-10-8-8-20 4-14 18-14 14 2 14 16 0 10-10 12-8 0-8-8 0-6 6-6" fill="none" stroke="#f2b98a" stroke-width="4" stroke-linecap="round"/><circle cx="38" cy="38" r="7" fill="#6c7691" stroke="#120c24" stroke-width="2.5"/><circle cx="38" cy="38" r="2.5" fill="#a8f04e"/>',
    bandage: '<rect x="4" y="16" width="40" height="16" rx="8" transform="rotate(-25 24 24)" fill="#f2c79a" stroke="#120c24" stroke-width="3"/><rect x="17" y="17" width="14" height="14" rx="3" transform="rotate(-25 24 24)" fill="#f6f0d8" stroke="#120c24" stroke-width="2"/>',
    pills: '<rect x="12" y="14" width="24" height="30" rx="5" fill="#e8825e" stroke="#120c24" stroke-width="3"/><rect x="10" y="6" width="28" height="10" rx="3" fill="#f6f0d8" stroke="#120c24" stroke-width="3"/><rect x="16" y="22" width="16" height="12" rx="2" fill="#f6f0d8"/><path d="M24 24v8M20 28h8" stroke="#ff4d5e" stroke-width="2.5"/>',
    syringe: '<path d="M10 38L32 16" stroke="#120c24" stroke-width="12" stroke-linecap="round"/><path d="M10 38L32 16" stroke="#eef4ff" stroke-width="7" stroke-linecap="round"/><path d="M14 34L24 24" stroke="#5b8fd6" stroke-width="5" stroke-linecap="round"/><path d="M32 16l8-8M36 6l6 6" stroke="#120c24" stroke-width="3" stroke-linecap="round"/><path d="M10 38l-5 5" stroke="#9aa3b8" stroke-width="2.5" stroke-linecap="round"/>',
    stim: '<rect x="18" y="4" width="12" height="34" rx="5" fill="#ffd23f" stroke="#120c24" stroke-width="3"/><rect x="18" y="14" width="12" height="10" fill="#ff4d5e"/><path d="M24 38v8" stroke="#120c24" stroke-width="3" stroke-linecap="round"/><path d="M34 10l6-4M34 18h7" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>',
    lock: '<rect x="12" y="20" width="24" height="20" rx="4" fill="#3b2a6e" stroke="#120c24" stroke-width="3"/><path d="M17 20v-5a7 7 0 0114 0v5" fill="none" stroke="#3b2a6e" stroke-width="4"/><circle cx="24" cy="30" r="3" fill="#120c24"/>',
  };
  function icon(name, cls) {
    const key = /_asis$/.test(name) ? 'asis' : name;
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + (ICONS[key] || ICONS.lock) + '</svg>';
  }

  /* ------------------------------------------------------- body diagram */

  function body() {
    return '<svg class="body-svg" viewBox="0 0 120 190" role="img" aria-label="Body diagram showing injuries and implants">' +
      '<g stroke="#120c24" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">' +
      '<rect class="bp bp-leg-other" x="62" y="118" width="18" height="60" rx="8"/>' +
      '<rect class="bp bp-leg" data-part="leg" x="40" y="118" width="18" height="60" rx="8"/>' +
      '<path class="bp bp-torso" d="M34 66q0-12 14-12h24q14 0 14 12l2 58H32z"/>' +
      '<path class="bp bp-heart" data-part="heart" stroke-width="2" d="M66 90c-13-8-12-20-4-20 3 0 4 3 4 3s1-3 4-3c8 0 9 12-4 20z"/>' +
      '<path d="M86 64l18 34-2 30M34 64l-18 34 2 30" fill="none" stroke-width="15"/>' +
      '<path class="bp-limb bp-arm" data-part="arm" d="M86 64l18 34-2 30" fill="none" stroke-width="8"/>' +
      '<path class="bp-limb bp-arm-other" d="M34 64l-18 34 2 30" fill="none" stroke-width="8"/>' +
      '<circle class="bp bp-head" cx="60" cy="30" r="22"/>' +
      '<ellipse class="bp bp-ear" data-part="ear" cx="83" cy="32" rx="5" ry="7"/>' +
      '<ellipse class="bp bp-eye-other" cx="51" cy="28" rx="5" ry="6"/>' +
      '<ellipse class="bp bp-eye" data-part="eye" cx="69" cy="28" rx="5" ry="6"/>' +
      '</g></svg>';
  }

  root.SAArt = { scene, icon, body };
})(typeof self !== 'undefined' ? self : this);
