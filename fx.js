/* 溫習樂園 — 特效、聲效、背景音樂、錯題怪獸圖案
 * 全部即時合成（Web Audio）同 DOM 動畫，冇圖檔、冇聲檔
 * 動畫只郁 transform／opacity（WEB-35）；設定「特效：簡單」會跳過粒子同全畫面動畫
 */
(function(){
'use strict';
const FX = window.FX = {};
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
let cfg = {sfx:true, bgm:true, fx:true};
FX.config = c => { cfg = Object.assign(cfg, c); if(!cfg.bgm) bgmStop(); else if(ctx) bgmStart(); };
FX.rich = () => cfg.fx !== false;

/* ---------- 聲音引擎（WEB-01、WEB-24） ---------- */
let ctx = null, master = null, sfxBus = null, bgmBus = null, noiseBuf = null, stale = false;
FX.stale = () => { stale = true; };
FX.ensure = function(){
  try{
    if(ctx && (stale || ctx.state === 'closed' || ctx.state === 'interrupted')){ try{ ctx.close(); }catch(e){} ctx = null; bgmTimer && clearInterval(bgmTimer); bgmTimer = 0; }
    if(!ctx){
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.onstatechange = () => { if(ctx && ctx.state !== 'running') stale = true; };
      master = ctx.createGain(); master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.connect(master);
      bgmBus = ctx.createGain(); bgmBus.gain.value = 0; bgmBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    stale = false;
    if(ctx.state === 'suspended') ctx.resume();
    if(cfg.bgm) bgmStart();
  }catch(e){}
  return ctx;
};
const now = () => ctx.currentTime;
function env(g, t, a, peak, d){ g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function osc(type, f, t, d, vol, o){
  o = o || {};
  const s = ctx.createOscillator(), g = ctx.createGain(); s.type = type; s.frequency.setValueAtTime(f, t);
  if(o.to) s.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || d));
  if(o.detune) s.detune.value = o.detune;
  let node = s;
  if(o.lp){ const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; s.connect(f2); node = f2; }
  if(o.vib){ const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibAmt || 30; l.connect(lg); lg.connect(s.frequency); l.start(t); l.stop(t + d + .1); }
  node.connect(g); g.connect(o.bus || sfxBus); env(g, t, o.a || 0.01, vol, d);
  s.start(t); s.stop(t + d + 0.1);
}
function noise(t, d, vol, type, f1, f2, q){
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = type || 'bandpass'; f.Q.value = q || 1; f.frequency.setValueAtTime(f1, t);
  if(f2) f.frequency.exponentialRampToValueAtTime(f2, t + d);
  s.connect(f); f.connect(g); g.connect(sfxBus); env(g, t, 0.01, vol, d); s.start(t); s.stop(t + d + 0.05);
}
function bell(f, t, vol, d){ osc('sine', f, t, d || .6, vol); osc('sine', f * 2.76, t, (d || .6) * .45, vol * .35); osc('triangle', f * 2, t, (d || .6) * .3, vol * .15); }
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
const ok = () => cfg.sfx && FX.ensure() && ctx;
const SFX = window.SFX = {
  tap(){ if(!ok()) return; const t = now(); osc('sine', 520, t, .07, .07, {to:820, glide:.05}); },
  ok(){ if(!ok()) return; const t = now(); [76, 80, 83, 88].forEach((n, i) => bell(NOTE(n), t + i * .07, .1, .5)); noise(t + .15, .25, .03, 'highpass', 6000); },
  bad(){ if(!ok()) return; const t = now(); osc('triangle', 330, t, .32, .1, {to:196, glide:.3, lp:900}); osc('sine', 165, t + .05, .3, .07, {to:110}); },
  coin(){ if(!ok()) return; const t = now(); bell(NOTE(88), t, .08, .25); bell(NOTE(95), t + .08, .08, .4); },
  star(i){ if(!ok()) return; const t = now(); bell(NOTE(84 + (i||0) * 4), t, .12, .7); noise(t, .3, .025, 'highpass', 7000); },
  whoosh(){ if(!ok()) return; const t = now(); noise(t, .35, .12, 'bandpass', 300, 3500, 1.4); },
  hit(){ if(!ok()) return; const t = now(); noise(t, .18, .2, 'lowpass', 2200, 300); osc('sine', 140, t, .22, .25, {to:45}); },
  crit(){ if(!ok()) return; SFX.hit(); const t = now(); bell(NOTE(96), t + .05, .1, .5); osc('square', 880, t + .02, .15, .04, {to:1760}); },
  hurt(){ if(!ok()) return; const t = now(); osc('sawtooth', 220, t, .2, .06, {to:110, lp:700}); noise(t, .15, .08, 'lowpass', 900); },
  egg(){ if(!ok()) return; const t = now(); osc('sine', 300, t, .12, .12, {to:620, glide:.08}); osc('sine', 620, t + .1, .14, .1, {to:280}); },
  fire(){ if(!ok()) return; const t = now(); noise(t, .5, .16, 'lowpass', 600, 2600, .7); for(let i = 0; i < 6; i++) noise(t + i * .06, .05, .07, 'highpass', 3000); osc('sawtooth', 110, t, .4, .05, {to:220, lp:500}); },
  water(){ if(!ok()) return; const t = now(); for(let i = 0; i < 6; i++) osc('sine', rnd(380, 520), t + i * .065, .09, .09, {to:rnd(900, 1300)}); noise(t + .35, .25, .06, 'lowpass', 1500, 400); },
  grass(){ if(!ok()) return; const t = now(); noise(t, .45, .1, 'bandpass', 2500, 5000, 2); [79, 83, 86].forEach((n, i) => bell(NOTE(n), t + .1 + i * .08, .05, .4)); },
  elec(){ if(!ok()) return; const t = now(); osc('square', 180, t, .35, .06, {vib:42, vibAmt:120, lp:3000}); noise(t, .3, .08, 'highpass', 4000); osc('sawtooth', 1200, t + .2, .12, .05, {to:300}); },
  psy(){ if(!ok()) return; const t = now(); osc('sine', 660, t, .6, .07, {vib:9, vibAmt:18}); osc('sine', 664, t, .6, .07, {detune:7}); osc('triangle', 990, t + .1, .5, .04, {to:1320}); },
  aura(){ if(!ok()) return; const t = now(); osc('sawtooth', 90, t, .45, .09, {to:220, lp:800}); noise(t, .4, .1, 'bandpass', 200, 1800, 1.2); osc('sine', 60, t + .35, .25, .25, {to:35}); },
  up(){ if(!ok()) return; const t = now(); [72, 76, 79, 84, 88].forEach((n, i) => bell(NOTE(n), t + i * .09, .1, .7)); [60, 64, 67].forEach(n => osc('triangle', NOTE(n), t + .45, .8, .04, {a:.05})); },
  win(){ if(!ok()) return; const t = now(); const mel = [67, 72, 76, 79, 76, 79, 84]; mel.forEach((n, i) => { osc('square', NOTE(n), t + i * .12, .16, .045, {lp:2400}); bell(NOTE(n + 12), t + i * .12, .03, .3); }); [60, 64, 67, 72].forEach(n => osc('triangle', NOTE(n), t + .84, 1.1, .05, {a:.05})); },
  evolve(){ if(!ok()) return; const t = now(); osc('sine', 220, t, 2.4, .06, {to:880, glide:2.4, vib:6, vibAmt:10}); osc('triangle', 330, t, 2.4, .04, {to:1320, glide:2.4}); for(let i = 0; i < 14; i++) bell(NOTE(84 + (i % 5) * 3), t + i * .16, .03, .3); },
  fanfare(){ if(!ok()) return; const t = now(); [[72,0],[72,.12],[72,.24],[79,.4],[76,.6],[84,.8]].forEach(([n, d]) => { osc('square', NOTE(n), t + d, .22, .05, {lp:2600}); osc('sawtooth', NOTE(n - 12), t + d, .22, .025, {lp:1200}); }); [60, 64, 67, 72, 76].forEach(n => osc('triangle', NOTE(n), t + 1, 1.4, .045, {a:.05})); },
  capture(){ if(!ok()) return; const t = now(); noise(t, .6, .12, 'bandpass', 3000, 300, 1.5); osc('sine', 1200, t, .6, .06, {to:200}); [0.9, 1.6, 2.3].forEach(d => { osc('square', 300, t + d, .06, .07, {lp:1500}); osc('sine', 150, t + d, .1, .1); }); },
  chest(){ if(!ok()) return; const t = now(); for(let i = 0; i < 10; i++) bell(NOTE(84 + [0,4,7,12,16][i % 5]), t + i * .06, .05, .4); },
  pop(){ if(!ok()) return; const t = now(); osc('sine', 900, t, .05, .06, {to:1500}); }
};
window.tone = (f, d, type, vol, delay) => { if(!ok()) return; osc(type || 'sine', f, now() + (delay || 0), d, vol || .1); };

/* ---------- 背景音樂（簡單五聲音階，讀字時自動降低音量） ---------- */
let bgmTimer = 0, bgmStep = 0, bgmNext = 0, ducked = false;
const CH = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
const MEL = [72, 74, 76, 79, 81, 79, 76, 74];
function bgmStart(){
  if(!ctx || bgmTimer || !cfg.bgm) return;
  bgmNext = now() + .1;
  bgmBus.gain.cancelScheduledValues(now()); bgmBus.gain.setTargetAtTime(ducked ? .012 : .05, now(), .8);
  bgmTimer = setInterval(() => {
    if(!ctx) return;
    while(bgmNext < now() + .35){
      const beat = bgmStep % 16, bar = Math.floor(bgmStep / 16) % 4, ch = CH[bar], t = bgmNext;
      if(beat % 4 === 0) osc('triangle', NOTE(ch[0] - 12), t, .5, .5, {bus:bgmBus, a:.02, lp:600});
      if(beat % 2 === 0) osc('sine', NOTE(ch[(beat / 2) % 3] + 12), t, .25, .22, {bus:bgmBus, a:.01});
      if(beat % 4 === 2 && Math.random() < .75) osc('triangle', NOTE(pick(MEL)), t, .4, .25, {bus:bgmBus, a:.02, lp:2500});
      bgmStep++; bgmNext += 60 / 100 / 2;
    }
  }, 120);
}
function bgmStop(){ if(bgmTimer){ clearInterval(bgmTimer); bgmTimer = 0; } if(bgmBus && ctx) bgmBus.gain.setTargetAtTime(0, now(), .2); }
FX.duck = on => { ducked = on; if(bgmBus && ctx && bgmTimer) bgmBus.gain.setTargetAtTime(on ? .012 : .05, now(), .25); };
FX.bgmOff = bgmStop;

/* ---------- 畫面特效 ---------- */
let layer = null;
function getLayer(){ if(!layer){ layer = document.createElement('div'); layer.id = 'fxl'; document.body.appendChild(layer); } return layer; }
const anim = (el, kf, o) => { try{ return el.animate(kf, o); }catch(e){ return null; } };
function part(x, y, html, cls, style){
  const p = document.createElement('div'); p.className = 'fxp ' + (cls || ''); p.innerHTML = html || '';
  p.style.left = x + 'px'; p.style.top = y + 'px'; if(style) Object.assign(p.style, style);
  getLayer().appendChild(p); return p;
}
const STAR = c => `<svg viewBox="0 0 20 20" width="100%" height="100%"><polygon points="10,0 12.6,7 20,7.4 14.2,12 16.2,19.4 10,15.2 3.8,19.4 5.8,12 0,7.4 7.4,7" fill="${c}"/></svg>`;
const COLS = ['#ffd23f', '#ff7a45', '#7b5cff', '#22b573', '#ff4f6d', '#25c4d4'];
// 由一點爆出星星／彩點
FX.burst = function(x, y, o){
  if(!FX.rich()) return; o = o || {};
  const n = o.n || 14, cols = o.colors || COLS;
  for(let i = 0; i < n; i++){
    const a = Math.PI * 2 * i / n + rnd(-.3, .3), dist = rnd(o.min || 40, o.max || 110), s = rnd(8, o.size || 18);
    const kind = o.kind || (i % 3 ? 'star' : 'dot'), c = pick(cols);
    const p = part(x - s / 2, y - s / 2, kind === 'star' ? STAR(c) : '', 'fx-' + kind, {width:s + 'px', height:s + 'px', background:kind === 'dot' ? c : ''});
    const dx = Math.cos(a) * dist, dy = Math.sin(a) * dist + (o.gravity ? 30 : 0);
    const a1 = anim(p, [{transform:'translate(0,0) scale(.3) rotate(0deg)', opacity:1}, {transform:`translate(${dx}px,${dy}px) scale(1) rotate(${rnd(-200, 200)}deg)`, opacity:1, offset:.7}, {transform:`translate(${dx * 1.1}px,${dy * 1.1 + 20}px) scale(.6)`, opacity:0}], {duration:rnd(600, 900), easing:'cubic-bezier(.2,.8,.3,1)'});
    if(a1) a1.onfinish = () => p.remove(); else setTimeout(() => p.remove(), 900);
  }
};
FX.ring = function(x, y, color, size){
  if(!FX.rich()) return;
  const p = part(x, y, '', 'fx-ring', {borderColor:color || '#fff'});
  const s = size || 140;
  const a1 = anim(p, [{transform:'translate(-50%,-50%) scale(.1)', opacity:1}, {transform:`translate(-50%,-50%) scale(${s / 20})`, opacity:0}], {duration:600, easing:'ease-out'});
  if(a1) a1.onfinish = () => p.remove(); else setTimeout(() => p.remove(), 600);
};
FX.flash = function(color, dur){
  if(!FX.rich()) return;
  const p = document.createElement('div'); p.className = 'fx-flash'; p.style.background = color || '#fff'; getLayer().appendChild(p);
  const a1 = anim(p, [{opacity:.85}, {opacity:0}], {duration:dur || 380}); if(a1) a1.onfinish = () => p.remove(); else setTimeout(() => p.remove(), 400);
};
FX.shake = function(el, amt){
  if(!el || !FX.rich()) return; amt = amt || 8;
  anim(el, [0, 1, 2, 3, 4, 5].map(i => ({transform:`translate(${i === 5 ? 0 : rnd(-amt, amt)}px,${i === 5 ? 0 : rnd(-amt / 2, amt / 2)}px)`})), {duration:350});
};
FX.pop = function(el){ if(el) anim(el, [{transform:'scale(1)'}, {transform:'scale(1.18)', offset:.4}, {transform:'scale(1)'}], {duration:380, easing:'ease-out'}); };
FX.floatText = function(txt, x, y, cls){
  const p = part(x, y, '', 'fx-txt ' + (cls || '')); p.textContent = txt;
  const a1 = anim(p, [{transform:'translate(-50%,10px) scale(.6)', opacity:0}, {transform:'translate(-50%,-10px) scale(1.15)', opacity:1, offset:.25}, {transform:'translate(-50%,-60px) scale(1)', opacity:0}], {duration:1100, easing:'ease-out'});
  if(a1) a1.onfinish = () => p.remove(); else setTimeout(() => p.remove(), 1100);
};
FX.banner = function(txt, color){
  const p = part(window.innerWidth / 2, window.innerHeight * .32, '', 'fx-banner'); p.textContent = txt; if(color) p.style.background = color;
  const a1 = anim(p, [{transform:'translate(-50%,-50%) scale(.3) rotate(-8deg)', opacity:0}, {transform:'translate(-50%,-50%) scale(1.15) rotate(3deg)', opacity:1, offset:.2}, {transform:'translate(-50%,-50%) scale(1) rotate(0)', opacity:1, offset:.75}, {transform:'translate(-50%,-70%) scale(.9)', opacity:0}], {duration:1300, easing:'ease-out'});
  if(a1) a1.onfinish = () => p.remove(); else setTimeout(() => p.remove(), 1300);
};
FX.countUp = function(el, to, dur){
  if(!el) return; const from = 0, t0 = performance.now(); dur = dur || 900;
  const step = t => { const k = Math.min(1, (t - t0) / dur), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); el.textContent = v; if(k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
};
FX.confetti = function(n){
  if(!FX.rich()) n = Math.min(n || 40, 15);
  for(let i = 0; i < (n || 60); i++){
    const c = pick(COLS), w = rnd(7, 12), p = part(rnd(0, window.innerWidth), -20, '', 'fx-conf', {width:w + 'px', height:(w * 1.4) + 'px', background:c, borderRadius:Math.random() < .5 ? '50%' : '2px'});
    const a1 = anim(p, [{transform:'translate(0,0) rotate(0)'}, {transform:`translate(${rnd(-80, 80)}px,${window.innerHeight + 40}px) rotate(${rnd(360, 900)}deg)`}], {duration:rnd(1800, 3200), delay:rnd(0, 500), easing:'cubic-bezier(.3,.1,.7,1)', fill:'backwards'});
    if(a1) a1.onfinish = () => p.remove(); else setTimeout(() => p.remove(), 3600);
  }
};

/* ---------- 對戰招式特效 ---------- */
const TYPE_KEY = {'火':'fire','水':'water','草':'grass','電':'elec','超能':'psy','鬥氣':'aura'};
const TYPE_COL = {fire:['#ff6a2a','#ffd23f','#ff3d00'], water:['#3cc6e8','#bff3ff','#ffffff'], grass:['#6fdc5b','#3fbf4f','#c9ff8f'], elec:['#ffe14a','#fff6a8','#ffb300'], psy:['#c77dff','#ff5fd2','#f3eeff'], aura:['#5ab8ff','#8fdcff','#ffffff']};
function center(el){ const r = el.getBoundingClientRect(); return {x:r.left + r.width / 2, y:r.top + r.height / 2}; }
FX.attack = function(type, meEl, foeEl, adv, done){
  const k = TYPE_KEY[type] || 'egg', a = center(meEl), b = center(foeEl), cols = TYPE_COL[k] || COLS;
  if(SFX[k]) SFX[k](); else SFX.egg();
  if(!FX.rich()){ setTimeout(done, 200); return; }
  const dx = b.x - a.x, dy = b.y - a.y;
  const fly = (html, cls, size, delay, wob) => {
    const p = part(a.x - size / 2, a.y - size / 2, html, 'fx-proj ' + cls, {width:size + 'px', height:size + 'px'});
    const kf = [{transform:'translate(0,0) scale(.4)', opacity:1}];
    if(wob) kf.push({transform:`translate(${dx * .5}px,${dy * .5 - wob}px) scale(1) rotate(180deg)`, opacity:1});
    kf.push({transform:`translate(${dx}px,${dy}px) scale(${adv ? 1.6 : 1.1}) rotate(360deg)`, opacity:.9});
    const a1 = anim(p, kf, {duration:420, delay:delay || 0, easing:'cubic-bezier(.5,0,.8,.6)', fill:'backwards'});
    if(a1) a1.onfinish = () => p.remove(); else setTimeout(() => p.remove(), 450 + (delay || 0));
  };
  let impact = 430;
  if(k === 'fire'){ fly('', 'fx-fireball', 34); for(let i = 1; i < 5; i++) fly('', 'fx-ember', 12, i * 40); }
  else if(k === 'water'){ for(let i = 0; i < 6; i++) fly('', 'fx-bubble', rnd(14, 26), i * 50, rnd(-30, 30)); impact = 650; }
  else if(k === 'grass'){ for(let i = 0; i < 6; i++) fly('', 'fx-leaf', 20, i * 45, rnd(20, 50)); impact = 620; }
  else if(k === 'psy'){ for(let i = 0; i < 3; i++) fly('', 'fx-psyring', 40, i * 90); impact = 600; }
  else if(k === 'aura'){ fly('', 'fx-aurasphere', 44); impact = 450; }
  else if(k === 'elec'){
    const svgNS = 'http://www.w3.org/2000/svg', sv = document.createElementNS(svgNS, 'svg');
    sv.setAttribute('class', 'fx-bolt'); sv.setAttribute('width', window.innerWidth); sv.setAttribute('height', window.innerHeight);
    let pts = `${a.x},${a.y}`; for(let i = 1; i < 7; i++) pts += ` ${a.x + dx * i / 7 + rnd(-14, 14)},${a.y + dy * i / 7 + rnd(-22, 22)}`; pts += ` ${b.x},${b.y}`;
    sv.innerHTML = `<polyline points="${pts}" fill="none" stroke="#fff6a8" stroke-width="9" stroke-linejoin="round" opacity=".6"/><polyline points="${pts}" fill="none" stroke="#ffe14a" stroke-width="4" stroke-linejoin="round"/>`;
    getLayer().appendChild(sv);
    anim(sv, [{opacity:0}, {opacity:1}, {opacity:.2}, {opacity:1}, {opacity:.3}, {opacity:1}, {opacity:0}], {duration:520});
    setTimeout(() => sv.remove(), 540); FX.flash('#fff6a8', 260); impact = 300;
  } else { fly('', 'fx-dust', 26); impact = 380; }
  setTimeout(() => {
    FX.ring(b.x, b.y, cols[0], adv ? 220 : 140);
    FX.burst(b.x, b.y, {n:adv ? 20 : 12, colors:cols, kind:k === 'grass' ? 'leaf' : null, max:adv ? 130 : 90});
    if(adv) FX.flash(cols[0], 300);
    done && done();
  }, impact);
};
FX.counter = function(meEl, foeEl, done){
  const a = center(foeEl), b = center(meEl);
  SFX.hurt();
  if(!FX.rich()){ setTimeout(done, 150); return; }
  const p = part(a.x - 14, a.y - 14, '', 'fx-proj fx-darkorb', {width:'28px', height:'28px'});
  const a1 = anim(p, [{transform:'translate(0,0) scale(.5)'}, {transform:`translate(${b.x - a.x}px,${b.y - a.y}px) scale(1.2)`}], {duration:320, easing:'ease-in'});
  const fin = () => { p.remove(); FX.burst(b.x, b.y, {n:8, colors:['#5a3f8a', '#2d1b5e', '#9b8ac0'], max:60}); done && done(); };
  if(a1) a1.onfinish = fin; else setTimeout(fin, 320);
};

/* ---------- 全畫面：進化、收服、傳說 ---------- */
function overlay(cls){
  const o = document.createElement('div'); o.className = 'fx-ov ' + (cls || '');
  o.innerHTML = '<div class="fx-rays"></div><div class="fx-stage"></div><div class="fx-cap"></div><button class="fx-go">繼續 ✨</button>';
  document.body.appendChild(o); requestAnimationFrame(() => o.classList.add('on'));
  return o;
}
function closeOv(o, cb){ o.classList.remove('on'); setTimeout(() => { o.remove(); cb && cb(); }, 300); }
FX.evolve = function(oldSvg, newSvg, text, cb){
  if(!FX.rich()){ cb && cb(); return; }
  const o = overlay('evo'), st = o.querySelector('.fx-stage'), cap = o.querySelector('.fx-cap'), go = o.querySelector('.fx-go');
  st.innerHTML = `<div class="fx-cr a">${oldSvg}</div><div class="fx-cr b">${newSvg}</div>`;
  cap.textContent = '咦？有啲嘢發生緊……';
  const A = st.querySelector('.a'), Bn = st.querySelector('.b');
  SFX.evolve();
  let i = 0; const times = [0, 420, 780, 1080, 1320, 1520, 1680, 1810, 1920, 2010, 2090, 2160, 2220];
  times.forEach((t, k) => setTimeout(() => { const showNew = k % 2 === 1; A.classList.toggle('hide', showNew); Bn.classList.toggle('hide', !showNew); }, t + 300));
  A.classList.add('glow'); Bn.classList.add('glow', 'hide');
  setTimeout(() => { FX.flash('#fff', 700); }, 2600);
  setTimeout(() => {
    A.classList.add('hide'); Bn.classList.remove('hide', 'glow'); Bn.classList.add('reveal');
    const c = center(Bn); FX.burst(c.x, c.y, {n:26, max:170, size:24}); FX.ring(c.x, c.y, '#ffe14a', 260);
    SFX.fanfare(); cap.textContent = text; go.classList.add('on');
  }, 2750);
  go.onclick = () => closeOv(o, cb);
};
FX.capture = function(svg, text, color, cb){
  if(!FX.rich()){ cb && cb(); return; }
  const o = overlay('cap'), st = o.querySelector('.fx-stage'), cap = o.querySelector('.fx-cap'), go = o.querySelector('.fx-go');
  st.innerHTML = `<div class="fx-cr a">${svg}</div><div class="fx-bottle"><svg viewBox="0 0 100 120"><defs><linearGradient id="bt" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="${color}" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity=".8"/></linearGradient></defs><rect x="38" y="4" width="24" height="14" rx="4" fill="#c98f00"/><path d="M36 18 h28 v10 q22 12 22 42 q0 44 -36 44 q-36 0 -36 -44 q0 -30 22 -42 z" fill="url(#bt)" stroke="#fff" stroke-width="3"/><polygon points="50,52 55,64 68,64 58,72 62,85 50,77 38,85 42,72 32,64 45,64" fill="#ffe14a" opacity=".9"/></svg></div>`;
  cap.textContent = '星光瓶出動！';
  const cr = st.querySelector('.fx-cr'), bt = st.querySelector('.fx-bottle');
  SFX.capture();
  setTimeout(() => { cr.classList.add('suck'); }, 300);
  [900, 1600, 2300].forEach(t => setTimeout(() => { bt.classList.remove('wob'); void bt.offsetWidth; bt.classList.add('wob'); }, t));
  setTimeout(() => { const c = center(bt); FX.burst(c.x, c.y, {n:24, max:150, size:22}); FX.ring(c.x, c.y, color, 220); bt.classList.add('done'); SFX.fanfare(); cap.textContent = text; go.classList.add('on'); }, 3000);
  go.onclick = () => closeOv(o, cb);
};
FX.legend = function(svg, text, cb){
  if(!FX.rich()){ cb && cb(); return; }
  const o = overlay('leg'), st = o.querySelector('.fx-stage'), cap = o.querySelector('.fx-cap'), go = o.querySelector('.fx-go');
  st.innerHTML = `<div class="fx-cr a sil">${svg}</div>`; cap.textContent = '……天空出現咗一道神秘嘅光……';
  const cr = st.querySelector('.fx-cr');
  SFX.evolve();
  for(let i = 0; i < 20; i++) setTimeout(() => { const x = rnd(20, window.innerWidth - 20), y = rnd(60, window.innerHeight * .6); FX.burst(x, y, {n:5, max:30, size:10, colors:['#fff6a8', '#c77dff', '#ffffff']}); }, i * 120);
  setTimeout(() => { FX.flash('#e8d8ff', 800); cr.classList.remove('sil'); cr.classList.add('reveal'); const c = center(cr); FX.burst(c.x, c.y, {n:30, max:180, size:26, colors:['#c77dff', '#ff5fd2', '#ffe14a', '#fff']}); SFX.fanfare(); cap.textContent = text; go.classList.add('on'); }, 2600);
  go.onclick = () => closeOv(o, cb);
};

/* ---------- 環境動畫（主頁背景） ---------- */
FX.ambient = function(el, bg){
  if(!el || !FX.rich()) return;
  const box = document.createElement('div'); box.className = 'amb';
  const n = bg === 'space' ? 14 : 7;
  for(let i = 0; i < n; i++){
    const d = document.createElement('i'), kind = {space:'tw', sea:'bub', candy:'heart', forest:'leafy', rainbow:'cloud'}[bg] || 'cloud';
    d.className = 'amb-' + kind; d.style.left = rnd(0, 92) + '%'; d.style.top = rnd(kind === 'cloud' ? 2 : 5, kind === 'cloud' ? 35 : 85) + '%';
    d.style.animationDelay = (-rnd(0, 12)) + 's'; d.style.animationDuration = rnd(kind === 'cloud' ? 18 : 4, kind === 'cloud' ? 30 : 9) + 's';
    if(kind === 'heart') d.textContent = '💗'; if(kind === 'leafy') d.textContent = pick(['🍃', '🍂']);
    box.appendChild(d);
  }
  el.prepend(box);
};

/* ---------- 錯題怪獸圖案（按題目編號固定樣子） ---------- */
function hash(s){ let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed){ let s = seed || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const MON_CACHE = {};
FX.monSVG = function(id){
  if(MON_CACHE[id]) return MON_CACHE[id];
  const r = rng(hash(String(id))), hue = Math.floor(r() * 360), col = `hsl(${hue},70%,62%)`, dark = `hsl(${hue},60%,32%)`, light = `hsl(${hue},80%,82%)`;
  const pts = [], N = 9, cx = 50, cy = 58;
  for(let i = 0; i < N; i++){ const a = Math.PI * 2 * i / N - Math.PI / 2, rr = 30 + r() * 9; pts.push([cx + Math.cos(a) * rr * 1.05, cy + Math.sin(a) * rr * .95]); }
  let d = `M${((pts[0][0] + pts[N - 1][0]) / 2).toFixed(1)},${((pts[0][1] + pts[N - 1][1]) / 2).toFixed(1)}`;
  for(let i = 0; i < N; i++){ const p = pts[i], q = pts[(i + 1) % N]; d += ` Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)},${((p[1] + q[1]) / 2).toFixed(1)}`; }
  const eyes = 1 + Math.floor(r() * 3), horn = Math.floor(r() * 3);
  let s = '';
  if(horn === 1) s += `<path d="M34,32 L28,12 L42,28 Z M66,32 L72,12 L58,28 Z" fill="${light}" stroke="${dark}" stroke-width="2.5" stroke-linejoin="round"/>`;
  if(horn === 2) s += `<path d="M50,26 q-2,-14 6,-18" stroke="${dark}" stroke-width="3" fill="none"/><circle cx="57" cy="8" r="5" fill="#ffe14a" stroke="${dark}" stroke-width="2"/>`;
  s += `<path d="${d} Z" fill="${col}" stroke="${dark}" stroke-width="3"/><ellipse cx="50" cy="70" rx="18" ry="12" fill="${light}" opacity=".7"/>`;
  s += `<ellipse cx="22" cy="66" rx="7" ry="5" fill="${col}" stroke="${dark}" stroke-width="2.5" transform="rotate(-30 22 66)"/><ellipse cx="78" cy="66" rx="7" ry="5" fill="${col}" stroke="${dark}" stroke-width="2.5" transform="rotate(30 78 66)"/>`;
  const ex = eyes === 1 ? [50] : eyes === 2 ? [40, 60] : [36, 50, 64];
  s += `<g class="mon-eyes">` + ex.map((x, i) => { const er = eyes === 1 ? 11 : 7.5, y = eyes === 3 && i === 1 ? 42 : 48; return `<circle cx="${x}" cy="${y}" r="${er}" fill="#fff" stroke="${dark}" stroke-width="2"/><circle cx="${x + 1.5}" cy="${y + 1}" r="${er * .5}" fill="#2a1a40"/><circle cx="${x + 3}" cy="${y - 2}" r="${er * .2}" fill="#fff"/>`; }).join('') + `</g>`;
  s += `<path d="M38,${63} Q50,${72 + r() * 4} 62,63" stroke="${dark}" stroke-width="3" fill="#7a1f3d"/><path d="M42,64 l3,4 l3,-4 M53,64 l3,4 l3,-4" stroke="#fff" stroke-width="2" fill="#fff"/>`;
  s += `<path d="M40,38 l8,4 M60,38 l-8,4" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>`;
  const svg = `<svg viewBox="0 0 100 100" class="monsvg"><ellipse cx="50" cy="94" rx="26" ry="4" fill="rgba(0,0,0,.18)"/><g class="mon-b">${s}</g></svg>`;
  MON_CACHE[id] = svg; return svg;
};
})();
