// EKAGRA — Coaching Engine v3
// Conservative progressive overload: only suggest increase when very clearly ready
// 2.5kg minimum increments (compounds and isolations)

function roundWeight(w) { return Math.round(w * 2) / 2; } // nearest 0.5kg
function getIncrement() { return 2.5; } // minimum 2.5kg always

function getExerciseHistory(exName, weeksBack = 8) {
  const sessions = [];
  for (let w = 0; w >= -weeksBack; w--) {
    const wk = getWeekKey(w);
    const allLogs = state.logs[wk];
    if (!allLogs) continue;
    for (const dayKey in allLogs) {
      const exLog = allLogs[dayKey][exName];
      if (!exLog || !exLog.length) continue;
      const withWeight = exLog.filter(s => s.weight !== '' && s.weight != null && s.weight > 0);
      if (withWeight.length > 0) {
        sessions.push({ weekOffset: w, dayKey, sets: withWeight, weekKey: wk });
      }
    }
  }
  sessions.sort((a, b) => b.weekOffset - a.weekOffset || b.dayKey - a.dayKey);
  return sessions;
}

function sessionMaxWeight(s) { return Math.max(...s.sets.map(x => x.weight || 0)); }
function sessionHitTopReps(s, repRange) { return s.sets.every(x => (x.reps || 0) >= repRange.max); }
function sessionAllGoodEffort(s) { return s.sets.every(x => x.effort !== 'F'); }
function sessionHadFailure(s) { return s.sets.some(x => x.effort === 'F'); }
function sessionMissedRepTarget(s, repRange) { return s.sets.some(x => x.effort === 'F' && (x.reps || 0) < repRange.max); }

function isReadinessPoor() {
  const wk = getWeekKey(0);
  const r = state.readiness?.[wk];
  return r && r.sleep === 'Poor' && r.soreness === 'High';
}

function getStartingWeightPrompt(exName) {
  return {
    status: 'no_data',
    weight: null,
    repsText: '',
    reasoning: `First time logging ${exName}. Enter a comfortable starting weight below — a weight you could do for 10 clean reps without grinding.`,
    badge: 'FIRST SESSION',
    badgeColor: '#6C63FF'
  };
}

function getWeightSuggestion(exName, exType, repRange) {
  if (!repRange) return getStartingWeightPrompt(exName);
  const history = getExerciseHistory(exName, 10);
  if (history.length === 0) return getStartingWeightPrompt(exName);

  const last = history[0];
  const lastWeight = sessionMaxWeight(last);
  const readinessPoor = isReadinessPoor();

  // FAILURE RECOVERY — missed reps at near failure last time → repeat same weight
  if (sessionMissedRepTarget(last, repRange)) {
    return {
      status: 'recover',
      weight: lastWeight,
      repsText: `${repRange.min}–${repRange.max} reps`,
      reasoning: `Last session: ${lastWeight}kg near failure, didn't complete the rep target. Repeat ${lastWeight}kg today and complete all reps cleanly before moving up.`,
      badge: 'COMPLETE THE REPS',
      badgeColor: '#FF6B35'
    };
  }

  // READINESS GATE — poor sleep + high soreness → hold
  if (readinessPoor) {
    return {
      status: 'repeat',
      weight: lastWeight,
      repsText: `${repRange.min}–${repRange.max} reps`,
      reasoning: `Readiness signals are low this week (poor sleep, high soreness). Hold at ${lastWeight}kg — recovery first.`,
      badge: 'HOLD STEADY',
      badgeColor: '#FF6B35'
    };
  }

  // PLATEAU — same weight 3+ consecutive sessions
  const atSameWeight = [];
  for (const s of history) {
    if (sessionMaxWeight(s) === lastWeight) atSameWeight.push(s);
    else break;
  }
  if (atSameWeight.length >= 3) {
    const allTopRange = atSameWeight.slice(0, 3).every(s => sessionHitTopReps(s, repRange));
    if (allTopRange) {
      const deload = roundWeight(lastWeight * 0.9);
      return {
        status: 'plateau',
        weight: deload,
        repsText: `${repRange.min}–${repRange.max} reps`,
        reasoning: `3+ sessions at ${lastWeight}kg hitting top reps but no progression signal. Deload to ${deload}kg this week, rebuild with perfect form, then push back through.`,
        badge: 'PLATEAU — DELOAD',
        badgeColor: '#FF6B35'
      };
    } else {
      return {
        status: 'plateau',
        weight: lastWeight,
        repsText: `${repRange.min}–${repRange.max} reps`,
        reasoning: `${atSameWeight.length} sessions at ${lastWeight}kg. Focus on hitting ${repRange.max} clean reps on every set before we progress.`,
        badge: 'BUILD THE REPS',
        badgeColor: '#FF6B35'
      };
    }
  }

  // CONSERVATIVE INCREASE — only if last 2 sessions: same weight, hit top reps, no failure
  if (history.length >= 2) {
    const [s1, s2] = history;
    const sameW = sessionMaxWeight(s1) === sessionMaxWeight(s2);
    const bothTop = sessionHitTopReps(s1, repRange) && sessionHitTopReps(s2, repRange);
    const bothClean = sessionAllGoodEffort(s1) && sessionAllGoodEffort(s2);
    if (sameW && bothTop && bothClean) {
      const newW = roundWeight(lastWeight + getIncrement());
      return {
        status: 'increase',
        weight: newW,
        repsText: `${repRange.min}–${repRange.max} reps`,
        reasoning: `Two clean sessions at ${lastWeight}kg — top of range, no grinding. Time to move. Try ${newW}kg today.`,
        badge: 'READY TO PROGRESS',
        badgeColor: '#34C759'
      };
    }
  }

  // DEFAULT — repeat with contextual reasoning
  const hitTop = sessionHitTopReps(last, repRange);
  const reason = hitTop
    ? `Good session at ${lastWeight}kg last time — one more clean run here before we add weight.`
    : `Last session you didn't reach ${repRange.max} reps at ${lastWeight}kg yet. Aim for the top of your range today.`;

  return {
    status: 'repeat',
    weight: lastWeight,
    repsText: `${repRange.min}–${repRange.max} reps`,
    reasoning: reason,
    badge: 'HOLD STEADY',
    badgeColor: '#C8A96E'
  };
}

// For HSPU skill tracking (time-based holds, not weight)
function getHSPUSuggestion(exName, repRange) {
  const history = getExerciseHistory(exName, 10);
  if (exName === 'Wall Handstand Hold') {
    if (history.length === 0) return { status:'no_data', weight:null, repsText:'max hold', reasoning:'Log your first handstand hold time in the notes field.', badge:'SKILL TRACKING', badgeColor:'#6C63FF' };
    return { status:'repeat', weight:null, repsText:'max hold', reasoning:'Beat your last hold time. Focus on active shoulder engagement and core bracing.', badge:'BEAT YOUR TIME', badgeColor:'#6C63FF' };
  }
  return getWeightSuggestion(exName, 'compound', repRange);
}
