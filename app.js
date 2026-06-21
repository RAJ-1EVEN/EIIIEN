// EKAGRA — App Logic v3

const SK = 'ekagra_v3';
let state = {
  logs: {},         // logs[weekKey][dayKey][exName] = [{reps,weight,effort,swappedFrom?}]
  cuePrefs: {},     // cuePrefs[exName] = 'internal'|'external'
  overload: {},     // overload[exName] = {weight, weekKey}
  readiness: {},    // readiness[weekKey] = {sleep,soreness,energy}
  sessionNotes: {}, // sessionNotes[weekKey_dayKey_exName] = string
  customEx: {},     // customEx[weekKey][muscleId] = [name, ...]
  startingWeights:{} // startingWeights[exName] = kg (set on first-session prompt)
};
let weekOffset = 0;
let expandedMuscle = null;
let activeDayIdx = null;
let lastRenderedTab = {train:null, track:null, schedule:null, progress:null};

// ── PERSISTENCE ──────────────────────────────────────────────────────────────
function load() {
  try { const r = localStorage.getItem(SK); if (r) state = Object.assign(state, JSON.parse(r)); } catch(e){}
}
function save() {
  try { localStorage.setItem(SK, JSON.stringify(state)); } catch(e){}
  lastRenderedTab = {train:null, track:null, schedule:null, progress:null};
}

// ── DATE / WEEK HELPERS ──────────────────────────────────────────────────────
function getWeekKey(off = 0) {
  const d = new Date(); const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - (day+6)%7 + off*7);
  return `w${mon.getFullYear()}${String(mon.getMonth()+1).padStart(2,'0')}${String(mon.getDate()).padStart(2,'0')}`;
}
function getWeekLabel(off = 0) {
  const d = new Date(); const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - (day+6)%7 + off*7);
  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
  const fmt = x => x.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
  return `${fmt(mon)} – ${fmt(sun)}`;
}
function getTodayIdx() { return (new Date().getDay()+6)%7; }
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ── LOG HELPERS ──────────────────────────────────────────────────────────────
function getLog(wk, dayKey, exName) {
  if (!state.logs[wk]) state.logs[wk] = {};
  if (!state.logs[wk][dayKey]) state.logs[wk][dayKey] = {};
  if (!state.logs[wk][dayKey][exName]) state.logs[wk][dayKey][exName] = [];
  return state.logs[wk][dayKey][exName];
}
function totalSetsForMuscle(wk, muscleId) {
  let n = 0;
  const wl = state.logs[wk]; if (!wl) return 0;
  for (const dk in wl) for (const ex in wl[dk]) {
    // find which schedule day/block this exercise belongs to
    for (const day of SCHEDULE) {
      for (const blk of day.blocks) {
        if (blk.muscleId === muscleId && (blk.exercises.some(e=>e.name===ex)||(state.customEx[wk]?.[muscleId]||[]).includes(ex)))
          n += wl[dk][ex].length;
      }
    }
  }
  return n;
}

// ── TOAST ────────────────────────────────────────────────────────────────────
function toast(msg, d=2000) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(()=>t.classList.remove('show'), d);
}

// ── HEADER ───────────────────────────────────────────────────────────────────
const QUOTES = [
  { text:'Discipline is the bridge between goals and accomplishment.', author:'Jim Rohn' },
  { text:'The body achieves what the mind believes.', author:'Unknown' },
  { text:'We are what we repeatedly do. Excellence, then, is not an act but a habit.', author:'Aristotle' },
  { text:'The obstacle in the path becomes the path.', author:'Marcus Aurelius' },
  { text:'No mud, no lotus.', author:'Thich Nhat Hanh' },
  { text:'The cave you fear to enter holds the treasure you seek.', author:'Joseph Campbell' },
  { text:'Suffering is the sandpaper that polishes the soul.', author:'Osho' },
  { text:'You have power over your mind, not outside events. Realize this, and you will find strength.', author:'Marcus Aurelius' },
  { text:'What stands in the way becomes the way.', author:'Marcus Aurelius' },
  { text:'The struggle you are in today is developing the strength you need for tomorrow.', author:'Unknown' },
  { text:'Energy flows where attention goes.', author:'Unknown' },
  { text:'One-pointed focus is the root of all mastery.', author:'Patanjali' },
  { text:'The wound is the place where the light enters you.', author:'Rumi' },
  { text:'Fall seven times, stand up eight.', author:'Japanese Proverb' },
  { text:'Mastery is not a destination, it is a daily practice.', author:'Unknown' },
];

function renderHeader() {
  const d = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const todaySched = SCHEDULE[getTodayIdx()];
  document.getElementById('headerDay').textContent = todaySched.label;
  document.getElementById('headerDate').textContent = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;

  // mesh background tied to today's training id
  document.body.className = document.body.className.replace(/day-\S+/g,'').trim();
  document.body.classList.add('day-'+todaySched.id);

  // daily quote — deterministic per calendar day so it doesn't change on every reload
  const dayNum = Math.floor(d.getTime()/86400000);
  const q = QUOTES[dayNum % QUOTES.length];
  const qEl = document.getElementById('quoteStrip');
  if (qEl) qEl.innerHTML = `"${q.text}"<span class="q-author">${q.author}</span>`;
}

// ── TABS ─────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('view-'+tab).classList.add('active');
  document.querySelector('.tab-btn[data-tab="'+tab+'"]').classList.add('active');
  // skip re-render if this tab's data hasn't changed since last render (save() resets the cache)
  if (lastRenderedTab[tab]) return;
  lastRenderedTab[tab] = true;
  if (tab==='train') renderTrain();
  if (tab==='track') renderTrack();
  if (tab==='schedule') renderSchedule();
  if (tab==='progress') renderProgress();
}

// ── TRAIN TAB ────────────────────────────────────────────────────────────────
function getSplitClass(day) {
  const l = day.id;
  if (l.includes('push')) return 'push';
  if (l.includes('pull')) return 'pull';
  if (l.includes('legs')) return 'legs';
  if (l.includes('rest')) return 'rest';
  return 'skill';
}

function renderChain() {
  const todayDate = new Date(); todayDate.setHours(0,0,0,0);
  const links = []; const dayLabels = [];
  for (let i=-6; i<=0; i++) {
    const d = new Date(todayDate); d.setDate(d.getDate()+i);
    const dow = (d.getDay()+6)%7;
    const sched = SCHEDULE[dow];
    const monOfThat = new Date(d); monOfThat.setDate(d.getDate()-dow);
    const monOfThis = new Date(todayDate); monOfThis.setDate(todayDate.getDate()-((todayDate.getDay()+6)%7));
    const wOff = Math.round((monOfThat-monOfThis)/(7*86400000));
    const wk = getWeekKey(wOff);
    dayLabels.push(DAYS[dow].substring(0,1));
    if (sched.id==='rest') { links.push('rest'); continue; }
    const wl = state.logs[wk];
    let any = false;
    if (wl && wl[dow]) { for (const ex in wl[dow]) { if (wl[dow][ex].length>0){any=true;break;} } }
    links.push(any?'filled':'empty');
  }
  const filled = links.filter(l=>l==='filled').length;
  return `<div class="chain-section">
    <div class="chain-header"><span class="chain-title">Discipline Chain</span><span class="chain-count">${filled}/7</span></div>
    <div class="chain-row">${links.map(l=>`<div class="chain-dot ${l}"></div>`).join('')}</div>
    <div class="chain-day-labels">${dayLabels.map(l=>`<div class="chain-day-lbl">${l}</div>`).join('')}</div>
  </div>`;
}

function renderTrain() {
  const todayIdx = getTodayIdx();
  const today = SCHEDULE[todayIdx];
  const sc = getSplitClass(today);
  const wk = getWeekKey(0);
  const dayFocus = DAY_FOCUS[new Date().getDay()];

  if (today.id === 'rest') {
    document.getElementById('trainContent').innerHTML = `
      ${renderChain()}
      <div class="today-hero rest">
        <div class="hero-label">Sunday · Rest Day</div>
        <div class="hero-title">RECOVERY</div>
        <div class="hero-note">${dayFocus.cue}<br><br>${today.coachNote}</div>
      </div>`;
    return;
  }

  const stops = today.blocks.map(blk => {
    const tgt = MUSCLE_TARGETS[blk.muscleId];
    const done = totalSetsForMuscle(wk, blk.muscleId);
    const max = tgt?.max || 10; const pct = Math.min(done/max,1);
    const circ = 2*Math.PI*15; const offset = circ*(1-pct);
    const hasSets = done > 0;
    const catColor = tgt?.color || '#FFC23D';
    const strokeColor = hasSets ? catColor : 'var(--card2)';
    return `<div class="path-stop ${hasSets?'has-sets':''}" style="${hasSets?`--accent-color:${catColor}`:''}">
      <div class="path-left">
        <div class="path-muscle" style="${hasSets?`color:${catColor}`:''}">${blk.muscle}</div>
        <div class="path-name">${blk.exercises.length} exercises</div>
        <div class="path-progress">${done} sets this week · target ${tgt?.min||'?'}–${tgt?.max||'?'}</div>
      </div>
      <svg class="path-ring" viewBox="0 0 36 36" style="filter:drop-shadow(0 0 5px ${catColor}50)">
        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--card2)" stroke-width="3"/>
        <circle cx="18" cy="18" r="15" fill="none" stroke="${strokeColor}" stroke-width="3"
          stroke-linecap="round" transform="rotate(-90 18 18)"
          stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"/>
        <text x="18" y="22" text-anchor="middle" font-family="Bebas Neue" font-size="11" fill="var(--text2)">${done}</text>
      </svg>
    </div>`;
  }).join('');

  document.getElementById('trainContent').innerHTML = `
    ${renderChain()}
    <div class="today-hero ${sc}">
      <div class="hero-label">${today.day} · ${today.theme}</div>
      <div class="hero-title">${today.label}</div>
      <div class="hero-focus">${today.primaryFocus}</div>
      <div class="hero-note">${dayFocus.cue}</div>
      <button class="hero-start-btn" onclick="startSession()">Start Session</button>
    </div>
    <div class="sect">// today's exercises</div>
    ${stops}`;
}

// ── TRACK TAB ────────────────────────────────────────────────────────────────
function changeWeek(d) { weekOffset += d; expandedMuscle = null; renderTrack(); }

function renderTrack() {
  document.getElementById('weekDisp').textContent = getWeekLabel(weekOffset);
  const wk = getWeekKey(weekOffset);
  // summary
  let totalSets=0, onTarget=0;
  for (const id in MUSCLE_TARGETS) { const d=totalSetsForMuscle(wk,id); totalSets+=d; if(d>=MUSCLE_TARGETS[id].min)onTarget++; }
  document.getElementById('summaryBar').innerHTML = `
    <div class="summ-item"><div class="summ-lbl">Total Sets</div><div class="summ-val">${totalSets}</div><div class="summ-sub">this week</div></div>
    <div class="summ-item"><div class="summ-lbl">On Target</div><div class="summ-val">${onTarget}/${Object.keys(MUSCLE_TARGETS).length}</div><div class="summ-sub">groups</div></div>
    <div class="summ-item"><div class="summ-lbl">Week</div><div class="summ-val" style="font-size:14px;margin-top:4px;letter-spacing:0">${weekOffset===0?'NOW':weekOffset<0?Math.abs(weekOffset)+'w ago':'+'+weekOffset+'w'}</div><div class="summ-sub">&nbsp;</div></div>`;
  // rings
  const circ = 2*Math.PI*24;
  document.getElementById('ringsGrid').innerHTML = Object.entries(MUSCLE_TARGETS).map(([id,tgt])=>{
    const done = totalSetsForMuscle(wk,id);
    const pct = Math.min(done/tgt.max,1);
    const offset = circ*(1-pct);
    const over = done>=tgt.max, ok = done>=tgt.min;
    const stroke = ok ? tgt.color : 'var(--border-lit)';
    let statusCls='none', statusTxt='—';
    if(done>0&&!ok){statusCls='low';statusTxt='LOW';}
    if(ok&&!over){statusCls='ok';statusTxt='ON TRACK';}
    if(over){statusCls='done';statusTxt='DONE';}
    return `<div class="ring-card ${expandedMuscle===id?'expanded':''}" onclick="toggleMuscle('${id}')" style="${expandedMuscle===id?`border-color:${tgt.color};box-shadow:0 0 0 1px ${tgt.color},0 8px 24px -6px ${tgt.color}55`:''}">
      <svg class="ring-svg" viewBox="0 0 60 60" style="filter:drop-shadow(0 0 8px ${tgt.color}40)">
        <circle cx="30" cy="30" r="24" fill="none" stroke="var(--card2)" stroke-width="4"/>
        <circle cx="30" cy="30" r="24" fill="none" stroke="${stroke}" stroke-width="4"
          stroke-linecap="round" transform="rotate(-90 30 30)"
          stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"/>
        <text class="ring-val" x="30" y="34">${done}</text>
      </svg>
      <div class="ring-name">${tgt.name}</div>
      <div class="ring-status ${statusCls}" style="${statusCls==='ok'||statusCls==='done'?`background:${tgt.color}28;color:${tgt.color}`:''}">${statusTxt}</div>
    </div>`;
  }).join('');
  renderMuscleDetail();
}

function toggleMuscle(id) {
  expandedMuscle = expandedMuscle===id?null:id;
  activeDayIdx = activeDayIdx===null?getTodayIdx():activeDayIdx;
  renderTrack();
  if(expandedMuscle) setTimeout(()=>document.getElementById('muscleDetail').scrollIntoView({behavior:'smooth',block:'start'}),60);
}

function renderMuscleDetail() {
  const c = document.getElementById('muscleDetail');
  if (!expandedMuscle) { c.innerHTML=''; return; }
  const tgt = MUSCLE_TARGETS[expandedMuscle];
  const wk = getWeekKey(weekOffset);
  const dayIdx = activeDayIdx??getTodayIdx();
  // gather all exercises for this muscle across schedule
  const exList = [];
  for (const day of SCHEDULE) for (const blk of day.blocks) if (blk.muscleId===expandedMuscle) for (const ex of blk.exercises) if (!exList.find(e=>e.name===ex.name)) exList.push(ex);
  const custom = (state.customEx[wk]?.[expandedMuscle])||[];

  c.innerHTML = `<div class="muscle-detail-card">
    <div class="detail-head">
      <div><div class="detail-title">${tgt.name.toUpperCase()}</div><div class="detail-meta">${tgt.min}–${tgt.max} sets/week · ${totalSetsForMuscle(wk,expandedMuscle)} done</div></div>
      <button class="detail-close" onclick="toggleMuscle('${expandedMuscle}')">✕</button>
    </div>
    <div class="day-tabs">${DAYS.map((d,i)=>{
      const wl=state.logs[wk]?.[i]||{};
      let cnt=0; for(const ex of [...exList,...custom.map(n=>({name:n}))]) cnt+=(wl[ex.name]||[]).length;
      return `<button class="day-tab ${i===dayIdx?'active':''}" onclick="setDay(${i})">${d}${cnt>0?`<span class="dot-count">${cnt}</span>`:''}</button>`;
    }).join('')}</div>
    ${[...exList,...custom.map(n=>({name:n,type:'isolation',fiber:'custom',repRange:{min:8,max:12},alternatives:[]}))].map(ex=>renderExBlock(ex,wk,dayIdx)).join('')}
    <div class="add-ex-row">
      <input class="add-ex-inp" id="newEx-${expandedMuscle}" placeholder="Add custom exercise...">
      <button class="add-ex-btn" onclick="addCustomEx('${expandedMuscle}')">Add</button>
    </div>
  </div>`;
}

function renderExBlock(ex,wk,dayIdx) {
  const sets = getLog(wk, dayIdx, ex.name);
  const pref = state.cuePrefs[ex.name];
  const cue = CUES[ex.name]||{internal:'Focus on the target muscle, control the tempo',external:'Move the weight through the full range smoothly'};
  return `<div class="ex-block">
    <div class="ex-head"><div class="ex-title">${ex.name}</div>${ex.fiber?`<div class="ex-fiber">${ex.fiber}</div>`:''}</div>
    <div class="cues-row">
      <div class="cue-pill ${pref==='internal'?'pref':''}" onclick="setCuePref('${esc(ex.name)}','internal')">
        <div class="cue-lbl">Internal${pref==='internal'?' ★':''}</div><div class="cue-text">${cue.internal}</div>
      </div>
      <div class="cue-pill ${pref==='external'?'pref':''}" onclick="setCuePref('${esc(ex.name)}','external')">
        <div class="cue-lbl">External${pref==='external'?' ★':''}</div><div class="cue-text">${cue.external}</div>
      </div>
    </div>
    <div class="set-header"><span>#</span><span>Reps</span><span>kg</span><span>Effort</span><span></span></div>
    ${sets.map((s,i)=>`<div class="set-row">
      <div class="set-num">${i+1}</div>
      <input class="set-inp" type="number" inputmode="numeric" value="${s.reps??''}" onchange="updSet('${wk}',${dayIdx},'${esc(ex.name)}',${i},'reps',this.value)">
      <input class="set-inp" type="number" inputmode="decimal" value="${s.weight??''}" onchange="updSet('${wk}',${dayIdx},'${esc(ex.name)}',${i},'weight',this.value)">
      <input class="set-inp ${effortClass(s.effort)}" type="text" value="${s.effort??''}" readonly onclick="cycleEffort('${wk}',${dayIdx},'${esc(ex.name)}',${i})" style="cursor:pointer">
      <button class="set-del" onclick="delSet('${wk}',${dayIdx},'${esc(ex.name)}',${i})">×</button>
    </div>`).join('')}
    <div class="add-set-wrap"><button class="add-set-btn" onclick="addSet('${wk}',${dayIdx},'${esc(ex.name)}','${expandedMuscle}')">+ Add Set</button></div>
  </div>`;
}

function effortClass(e) { return e==='E'?'effort-e':e==='M'?'effort-m':e==='F'?'effort-f':''; }

function setDay(i) { activeDayIdx=i; renderMuscleDetail(); }
function setCuePref(n,p) { state.cuePrefs[n]=state.cuePrefs[n]===p?null:p; save(); renderMuscleDetail(); }
function addSet(wk,dayIdx,exName,muscleId) {
  const sets=getLog(wk,dayIdx,exName); const last=sets[sets.length-1];
  sets.push({reps:last?.reps??'',weight:last?.weight??'',effort:''});
  save(); renderMuscleDetail(); renderRingsOnly();
}
function delSet(wk,dayIdx,exName,idx) { const sets=getLog(wk,dayIdx,exName); sets.splice(idx,1); save(); renderMuscleDetail(); renderRingsOnly(); }
function updSet(wk,dayIdx,exName,idx,field,val) {
  const sets=getLog(wk,dayIdx,exName);
  sets[idx][field]=field==='effort'?val:(val===''?'':Number(val));
  if(field==='weight'&&val!==''){const w=Number(val);if(!state.overload[exName]||w>=state.overload[exName].weight)state.overload[exName]={weight:w,weekKey:wk};}
  save();
}
function cycleEffort(wk,dayIdx,exName,idx) {
  const sets=getLog(wk,dayIdx,exName); const cur=sets[idx].effort||'';
  const order=['','E','M','F']; sets[idx].effort=order[(order.indexOf(cur)+1)%order.length];
  save(); renderMuscleDetail();
}
function addCustomEx(muscleId) {
  const inp=document.getElementById('newEx-'+muscleId); const name=inp.value.trim(); if(!name)return;
  const wk=getWeekKey(weekOffset); if(!state.customEx[wk])state.customEx[wk]={};
  if(!state.customEx[wk][muscleId])state.customEx[wk][muscleId]=[];
  state.customEx[wk][muscleId].push(name); save(); inp.value=''; renderMuscleDetail(); toast('Exercise added');
}
function renderRingsOnly() {
  const wk=getWeekKey(weekOffset); const circ=2*Math.PI*24;
  document.getElementById('ringsGrid').innerHTML=Object.entries(MUSCLE_TARGETS).map(([id,tgt])=>{
    const done=totalSetsForMuscle(wk,id); const pct=Math.min(done/tgt.max,1); const offset=circ*(1-pct);
    const over=done>=tgt.max,ok=done>=tgt.min; const stroke=ok?tgt.color:'var(--border-lit)';
    let statusCls='none',statusTxt='—';
    if(done>0&&!ok){statusCls='low';statusTxt='LOW';} if(ok&&!over){statusCls='ok';statusTxt='ON TRACK';} if(over){statusCls='done';statusTxt='DONE';}
    return `<div class="ring-card ${expandedMuscle===id?'expanded':''}" onclick="toggleMuscle('${id}')" style="${expandedMuscle===id?`border-color:${tgt.color};box-shadow:0 0 0 1px ${tgt.color},0 8px 24px -6px ${tgt.color}55`:''}">
      <svg class="ring-svg" viewBox="0 0 60 60" style="filter:drop-shadow(0 0 8px ${tgt.color}40)">
        <circle cx="30" cy="30" r="24" fill="none" stroke="var(--card2)" stroke-width="4"/>
        <circle cx="30" cy="30" r="24" fill="none" stroke="${stroke}" stroke-width="4"
          stroke-linecap="round" transform="rotate(-90 30 30)"
          stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"/>
        <text class="ring-val" x="30" y="34">${done}</text>
      </svg>
      <div class="ring-name">${tgt.name}</div>
      <div class="ring-status ${statusCls}" style="${statusCls==='ok'||statusCls==='done'?`background:${tgt.color}28;color:${tgt.color}`:''}">${statusTxt}</div>
    </div>`;
  }).join('');
}

// ── SCHEDULE ─────────────────────────────────────────────────────────────────
function renderSchedule() {
  const todayIdx = getTodayIdx();
  document.getElementById('schedContent').innerHTML = `<div class="sect">// weekly split</div>` +
    SCHEDULE.map((day,i)=>{
    const sc=getSplitClass(day); const isToday=i===todayIdx;
    const volChips = day.blocks.map(b=>`<div class="vol-chip">${b.muscle} · ${b.exercises.reduce((a,e)=>a+e.sets,0)}s</div>`).join('');
    return `<div class="sched-day ${isToday?'today':''}">
      <div class="sched-head">
        <div>
          <div class="sched-day-name">${day.day}${isToday?' · TODAY':''}</div>
          <div class="sched-label">${day.label}</div>
          <div class="sched-focus">${day.primaryFocus}</div>
        </div>
        <div class="sched-badge ${sc}">${day.theme}</div>
      </div>
      ${day.blocks.length?`<div class="sched-vol">${volChips}</div>`:''} 
      <div class="sched-note">${day.coachNote}</div>
    </div>`;
  }).join('');
}

// ── SESSION ───────────────────────────────────────────────────────────────────
let session = null;
let restTimer = {remaining:0,total:0,running:false,interval:null};

function startSession() {
  const todayIdx = getTodayIdx(); const today = SCHEDULE[todayIdx];
  if (today.id==='rest') { toast('Rest day — no session needed'); return; }
  const wk = getWeekKey(0);
  const queue = [];
  today.blocks.forEach(blk=>{
    const customs = (state.customEx[wk]?.[blk.muscleId]||[]).map(n=>({name:n,type:'isolation',fiber:'custom',repRange:{min:8,max:12},alternatives:[],sets:3}));
    [...blk.exercises,...customs].forEach(ex=>queue.push({...ex,muscleId:blk.muscleId,muscleName:blk.muscle}));
  });
  session={queue,idx:0,dayIdx:todayIdx,elapsed:0,timerInterval:null,swapped:{},wk};
  const sc=getSplitClass(today);
  document.getElementById('sessBadge').textContent=today.label;
  document.getElementById('sessBadge').className='sess-split-badge '+sc;
  document.getElementById('sessionOverlay').classList.add('active');
  session.timerInterval=setInterval(()=>{
    session.elapsed++;
    const m=Math.floor(session.elapsed/60),s=session.elapsed%60;
    document.getElementById('sessTimer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },1000);
  renderStep();
}

function exitSession() {
  if(session?.timerInterval)clearInterval(session.timerInterval);
  if(restTimer.interval)clearInterval(restTimer.interval);
  restTimer.running=false;
  document.getElementById('sessionOverlay').classList.remove('active');
  document.getElementById('restOverlay').classList.remove('active');
  session=null;
  renderTrain(); renderTrack();
}

function renderStep() {
  if(!session)return;
  if(session.idx>=session.queue.length){
    document.getElementById('sessBody').innerHTML=`
      <div style="text-align:center;padding:60px 20px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:4px;color:var(--gold);margin-bottom:8px">SESSION COMPLETE</div>
        <div style="font-family:'Crimson Pro',serif;font-style:italic;font-size:15px;color:var(--text2);margin-bottom:32px;line-height:1.6">Quality over quantity.<br>One-pointed focus, executed.</div>
        <button class="log-btn" onclick="exitSession()">Finish</button>
      </div>`; return;
  }
  const step=session.queue[session.idx];
  const ex=session.swapped[session.idx]||step;
  const origName=step.name;
  const sets=getLog(session.wk, session.dayIdx, origName);
  const lastSet=sets[sets.length-1];
  const pref=state.cuePrefs[ex.name];
  const cue=CUES[ex.name]||{internal:'Focus on the target muscle',external:'Move the weight smoothly'};
  const sugg = ex.name==='Wall Handstand Hold' ? getHSPUSuggestion(origName,step.repRange) : getWeightSuggestion(origName,step.type,step.repRange);
  const noteKey=`${session.wk}_${session.dayIdx}_${origName}`;
  const noteVal=(state.sessionNotes[noteKey])||'';
  const alts=(step.alternatives||[]).map(n=>{for(const d of SCHEDULE)for(const b of d.blocks)for(const e of b.exercises)if(e.name===n)return e; return {name:n,type:'isolation',fiber:'alternative',repRange:step.repRange,alternatives:[]};}).filter(Boolean);

  document.getElementById('sessBody').innerHTML=`
    <div class="sess-nav-row">
      <button class="sess-nav-btn" onclick="prevStep()">← Prev</button>
      <div class="sess-progress">EX ${session.idx+1} / ${session.queue.length}</div>
      <button class="sess-nav-btn" onclick="nextStep()">Skip →</button>
    </div>
    <div class="sess-muscle-tag">${ex.muscleName||step.muscleName}</div>
    <div class="sess-ex-name">${ex.name}${session.swapped[session.idx]?` <span style="font-size:14px;color:var(--muted)">(swap)</span>`:''}</div>
    <div class="sess-fiber-tag">${ex.fiber||'—'} · ${ex.type} · ${step.sets} sets planned</div>
    <div class="swap-row"><button class="swap-btn" onclick="toggleSwap()">${session.swapOpen?'Close':'⇄ Swap'}</button></div>
    ${session.swapOpen?`<div class="swap-menu">
      ${alts.map(a=>`<div class="swap-opt" onclick="doSwap('${esc(a.name)}')">${a.name}<span class="swap-opt-tag">${a.type}</span></div>`).join('')}
      <div class="swap-opt" onclick="doSwap(null)" style="color:var(--muted)">Use planned: ${step.name}</div>
    </div>`:''}
    <div class="sugg-card" style="background:${sugg.badgeColor}18;border-color:${sugg.badgeColor}44">
      <div class="sugg-badge" style="background:${sugg.badgeColor}22;color:${sugg.badgeColor}">${sugg.badge}</div>
      ${sugg.weight!=null?`<div class="sugg-weight-row"><div class="sugg-weight">${sugg.weight}</div><div class="sugg-unit">kg</div><div class="sugg-reps" style="color:${sugg.badgeColor}">${sugg.repsText}</div></div>`:''}
      <div class="sugg-reasoning">${sugg.reasoning}</div>
    </div>
    <div class="cues-row" style="margin-bottom:14px">
      <div class="cue-pill ${pref==='internal'?'pref':''}" onclick="sessCuePref('${esc(ex.name)}','internal')">
        <div class="cue-lbl">Internal${pref==='internal'?' ★':''}</div><div class="cue-text">${cue.internal}</div>
      </div>
      <div class="cue-pill ${pref==='external'?'pref':''}" onclick="sessCuePref('${esc(ex.name)}','external')">
        <div class="cue-lbl">External${pref==='external'?' ★':''}</div><div class="cue-text">${cue.external}</div>
      </div>
    </div>
    <div class="sess-inp-row">
      <div class="sess-inp-group"><label>Reps</label><input type="number" inputmode="numeric" id="sReps" value="${lastSet?.reps??''}"></div>
      <div class="sess-inp-group"><label>Weight kg</label><input type="number" inputmode="decimal" id="sWeight" value="${sugg.weight??lastSet?.weight??''}"></div>
      <div class="sess-inp-group"><label>Set #</label><input type="text" value="${sets.length+1}" readonly style="color:var(--muted)"></div>
    </div>
    <div class="effort-row">
      <button class="eff-btn" id="effE" onclick="selEff('E')">Easy</button>
      <button class="eff-btn" id="effM" onclick="selEff('M')">Moderate</button>
      <button class="eff-btn" id="effF" onclick="selEff('F')">Near Failure</button>
    </div>
    <button class="log-btn" onclick="logSet()">Log Set + Rest</button>
    <div>${sets.map((s,i)=>`<div class="set-log-item"><span>Set ${i+1}</span><span class="set-log-val">${s.reps||'?'} reps × ${s.weight||'?'}kg${s.effort?' · '+{E:'Easy',M:'Moderate',F:'Near Failure'}[s.effort]:''}${s.swappedFrom?' ('+s.swappedFrom+')':''}</span></div>`).join('')}</div>
    <div class="sess-notes-wrap">
      <div class="sess-notes-lbl">Notes</div>
      <textarea class="sess-notes-inp" placeholder="how did this feel today..." onchange="saveNote('${esc(noteKey)}',this.value)">${noteVal}</textarea>
    </div>`;
  session.selEff=null;
}

function esc(s){return s.replace(/'/g,"\\'")}
function sessCuePref(n,p){state.cuePrefs[n]=state.cuePrefs[n]===p?null:p;save();renderStep();}
function selEff(e){
  session.selEff=session.selEff===e?null:e;
  ['E','M','F'].forEach(x=>document.getElementById('eff'+x).className='eff-btn');
  if(session.selEff)document.getElementById('eff'+session.selEff).className=`eff-btn sel-${session.selEff.toLowerCase()}`;
}
function toggleSwap(){session.swapOpen=!session.swapOpen;renderStep();}
function doSwap(altName){
  if(altName){
    let altEx=null;
    for(const d of SCHEDULE)for(const b of d.blocks)for(const e of b.exercises){if(e.name===altName){altEx={...e,muscleName:session.queue[session.idx].muscleName,muscleId:session.queue[session.idx].muscleId};break;}}
    if(altEx)session.swapped[session.idx]=altEx;
  } else { delete session.swapped[session.idx]; }
  session.swapOpen=false; renderStep();
}
function logSet(){
  const step=session.queue[session.idx];
  const ex=session.swapped[session.idx]||step;
  const origName=step.name;
  const sets=getLog(session.wk,session.dayIdx,origName);
  const reps=document.getElementById('sReps').value;
  const weight=document.getElementById('sWeight').value;
  const effort=session.selEff||'';
  sets.push({reps:reps===''?'':Number(reps),weight:weight===''?'':Number(weight),effort,swappedFrom:session.swapped[session.idx]?ex.name:undefined});
  if(weight!==''){const w=Number(weight);if(!state.overload[origName]||w>=state.overload[origName].weight)state.overload[origName]={weight:w,weekKey:session.wk};}
  save();
  openRest(ex.type,effort);
}
function saveNote(key,val){state.sessionNotes[key]=val;save();}
function prevStep(){if(session.idx>0)session.idx--;renderStep();}
function nextStep(){session.idx++;renderStep();}

// ── REST TIMER ────────────────────────────────────────────────────────────────
function openRest(exType,effort){
  let base=REST_DEFAULTS[exType]||75; let ext=false;
  if(effort==='F'){base+=30;ext=true;}
  restTimer={remaining:base,total:base,running:false,interval:null};
  document.getElementById('restExtNote').textContent=ext?'Extended +30s — near failure set':'';
  document.getElementById('restLabel').textContent='REST — TAP START WHEN READY';
  document.getElementById('restToggle').textContent='Start';
  document.getElementById('restOverlay').classList.add('active');
  updRestDisplay();
}
function toggleRest(){restTimer.running?pauseRest():resumeRest();}
function resumeRest(){
  if(restTimer.remaining<=0)return;
  restTimer.running=true; document.getElementById('restToggle').textContent='Pause';
  document.getElementById('restLabel').textContent='REST';
  if(restTimer.interval)clearInterval(restTimer.interval);
  restTimer.interval=setInterval(()=>{
    restTimer.remaining--; updRestDisplay();
    if(restTimer.remaining<=0){clearInterval(restTimer.interval);restTimer.running=false;playBeep();document.getElementById('restLabel').textContent='REST COMPLETE';document.getElementById('restToggle').textContent='Start';}
  },1000);
}
function pauseRest(){restTimer.running=false;clearInterval(restTimer.interval);document.getElementById('restToggle').textContent='Start';document.getElementById('restLabel').textContent='REST — PAUSED';}
function resetRest(){clearInterval(restTimer.interval);restTimer.running=false;restTimer.remaining=restTimer.total;document.getElementById('restToggle').textContent='Start';document.getElementById('restLabel').textContent='REST — TAP START WHEN READY';updRestDisplay();}
function adjRest(s){restTimer.remaining=Math.max(restTimer.remaining+s,0);restTimer.total=Math.max(restTimer.total+s,restTimer.remaining,1);updRestDisplay();}
function skipRest(){clearInterval(restTimer.interval);restTimer.running=false;document.getElementById('restOverlay').classList.remove('active');renderStep();}
function updRestDisplay(){
  const m=Math.floor(Math.max(restTimer.remaining,0)/60),s=Math.max(restTimer.remaining,0)%60;
  document.getElementById('restTime').textContent=`${m}:${String(s).padStart(2,'0')}`;
  const pct=restTimer.total>0?Math.max(Math.min(restTimer.remaining/restTimer.total,1),0):0;
  document.getElementById('restRing').setAttribute('stroke-dashoffset',(553*(1-pct)).toFixed(1));
}
function playBeep(){try{const c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;o.type='sine';g.gain.setValueAtTime(0.12,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.5);o.start();o.stop(c.currentTime+0.5);}catch(e){}}

// ── PROGRESS ──────────────────────────────────────────────────────────────────
function renderProgress() {
  renderReadiness(); renderCharts(); renderOverload(); renderStreaks();
  const lbl=document.getElementById('resetWeekLbl');
  if(lbl)lbl.textContent=`Week ${getWeekLabel(weekOffset)}`;
}
function renderReadiness(){
  const wk=getWeekKey(0); const r=state.readiness[wk]||{};
  const qs=[{k:'sleep',lbl:'Sleep quality',opts:['Poor','Okay','Good']},{k:'soreness',lbl:'Soreness level',opts:['Low','Moderate','High']},{k:'energy',lbl:'Energy / motivation',opts:['Low','Okay','High']}];
  let summary='';
  if(r.sleep&&r.soreness&&r.energy){
    if(r.sleep==='Poor'&&r.soreness==='High')summary='Recovery signals low — hold weights steady, prioritize form this week.';
    else if(r.sleep==='Good'&&r.energy==='High')summary='Strong recovery — a good week to chase progressive overload.';
    else summary='Train as planned, adjust intensity by feel.';
  }
  document.getElementById('readinessCard').innerHTML=`<div class="rc-title">Weekly Check-In</div>
    ${qs.map(q=>`<div class="rc-q"><div class="rc-q-lbl">${q.lbl}</div><div class="rc-opts">${q.opts.map(o=>`<div class="rc-opt ${r[q.k]===o?'sel':''}" onclick="setReadiness('${q.k}','${o}')">${o}</div>`).join('')}</div></div>`).join('')}
    ${summary?`<div class="rc-summary">${summary}</div>`:''}`;
}
function setReadiness(k,v){const wk=getWeekKey(0);if(!state.readiness[wk])state.readiness[wk]={};state.readiness[wk][k]=state.readiness[wk][k]===v?null:v;save();renderReadiness();}
function renderCharts(){
  const muscleIds=Object.keys(MUSCLE_TARGETS);
  document.getElementById('chartsContent').innerHTML=muscleIds.map(id=>{
    const tgt=MUSCLE_TARGETS[id];
    const weeks=[-3,-2,-1,0].map(o=>({lbl:getWeekLabel(o).split('–')[0].trim(),val:totalSetsForMuscle(getWeekKey(o),id)}));
    const maxV=Math.max(tgt.max,...weeks.map(w=>w.val),1);
    return `<div class="chart-card">
      <div class="chart-title">${tgt.name}<span class="chart-target">target ${tgt.min}–${tgt.max}</span></div>
      <div class="chart-bars">${weeks.map(w=>{const h=Math.max((w.val/maxV)*100,2);const cls=w.val>=tgt.max?'over':w.val>=tgt.min?'in':'';return`<div class="chart-bar-col"><div class="chart-bar-val">${w.val}</div><div class="chart-bar ${cls}" style="height:${h}%"></div></div>`}).join('')}</div>
      <div class="chart-wk-labels">${weeks.map(w=>`<div class="chart-wk-lbl">${w.lbl}</div>`).join('')}</div>
    </div>`;
  }).join('');
}
function renderOverload(){
  const entries=Object.entries(state.overload);
  document.getElementById('overloadCard').innerHTML=entries.length===0?`<div style="font-size:12px;color:var(--muted)">No weight data yet — start logging sets in Train mode.</div>`:
    `<div class="rc-title">Max Weights</div>`+entries.slice(0,20).map(([ex,data])=>{
      const exObj=[].concat(...SCHEDULE.map(d=>d.blocks.map(b=>b.exercises)).flat());
      const full=exObj.find(e=>e?.name===ex);
      let flag=''; if(full){
        const hist=getExerciseHistory(ex,2);
        if(hist.length>=2){const [s1,s2]=hist;if(s1.sets.every(s=>(s.reps||0)>=full.repRange.max)&&s2.sets.every(s=>(s.reps||0)>=full.repRange.max)&&[s1,s2].every(h=>h.sets.every(s=>s.effort!=='F'))&&getWeightSuggestion(ex,full.type,full.repRange).status==='increase')flag='<div class="overload-flag">+2.5KG</div>';}
      }
      return `<div class="overload-row"><div class="overload-name">${ex}</div><div class="overload-weight">${data.weight}kg</div>${flag}</div>`;
    }).join('');
}
function renderStreaks(){
  document.getElementById('streakGrid').innerHTML=Object.entries(MUSCLE_TARGETS).map(([id,tgt])=>{
    let streak=0;
    for(let i=0;i>=-12;i--){const done=totalSetsForMuscle(getWeekKey(i),id);if(i===0&&done===0)continue;if(done>=tgt.min)streak++;else break;}
    return `<div class="streak-item"><div class="streak-num">${streak}</div><div class="streak-lbl">${tgt.name}</div></div>`;
  }).join('');
}

// ── RESET ─────────────────────────────────────────────────────────────────────
function confirmReset(type){
  const msgs={today:'Clear all sets logged for today?',week:`Clear all logs for ${getWeekLabel(weekOffset)}?`,overload:'Clear all overload weight history?',all:'Wipe ALL data permanently? This cannot be undone.'};
  if(!confirm(msgs[type]))return;
  if(type==='today'){const wk=getWeekKey(0),d=getTodayIdx(),wl=state.logs[wk];if(wl&&wl[d])for(const ex in wl[d])wl[d][ex]=[];}
  if(type==='week'){const wk=getWeekKey(weekOffset);delete state.logs[wk];delete state.customEx[wk];delete state.readiness[wk];}
  if(type==='overload')state.overload={};
  if(type==='all'){if(!confirm('Absolutely sure?'))return;state={logs:{},cuePrefs:{},overload:{},readiness:{},sessionNotes:{},customEx:{},startingWeights:{}};}
  save(); toast('Reset done'); renderTrain(); renderTrack(); renderProgress();
}

// helper to expose getExerciseHistory to coach.js which needs state/getWeekKey
function getExerciseHistory(exName, weeksBack=8){
  const sessions=[];
  for(let w=0;w>=-weeksBack;w--){
    const wk=getWeekKey(w); const wl=state.logs[wk]; if(!wl)continue;
    for(const dk in wl){const exLog=wl[dk][exName]; if(!exLog||!exLog.length)continue;
      const withW=exLog.filter(s=>s.weight!==''&&s.weight!=null&&s.weight>0);
      if(withW.length>0)sessions.push({weekOffset:w,dayKey:dk,sets:withW,weekKey:wk});}
  }
  sessions.sort((a,b)=>b.weekOffset-a.weekOffset||Number(b.dayKey)-Number(a.dayKey));
  return sessions;
}
function isReadinessPoor(){const wk=getWeekKey(0);const r=state.readiness?.[wk];return r&&r.sleep==='Poor'&&r.soreness==='High';}

// ── INIT ──────────────────────────────────────────────────────────────────────
load();
renderHeader();
renderTrain();
