// EKAGRA — Exercise Database v3
// Full program: Raj's custom 6-day split with all muscle fibers covered
// repRange: {min, max} per set
// type: compound | isolation
// fiber: which fiber/head this targets (for display)
// alternatives: session-swap options (history stays under original name)

const WEEK_VARIANT = () => {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return weekNum % 2 === 0 ? 'B' : 'A';
};

// ── SCHEDULE ──────────────────────────────────────────────────────────────────
// Each day: id, label, theme, primaryFocus (shown as hero target), sessions (array of muscle blocks)
// variant: which exercises rotate each alternate week
const SCHEDULE = [
  {
    id: 'legs_heavy',
    day: 'Monday', label: 'LEGS HEAVY', theme: 'Strength + Volume',
    primaryFocus: 'Quads · Hamstrings · Side Delts',
    coachNote: 'Heavy compounds first while CNS is fresh. Side delts at the end — 2 working sets only, save energy for Tuesday.',
    blocks: [
      {
        muscle: 'Quads', muscleId: 'quads',
        exercises: [
          { name:'Back Squat', type:'compound', fiber:'Full quad', repRange:{min:4,max:6}, sets:4, alternatives:['Leg Press'] },
          { name:'Hack Squat', type:'compound', fiber:'Outer quad sweep', repRange:{min:8,max:10}, sets:3, alternatives:['V-Squat','Leg Press'] },
          { name:'Leg Extension', type:'isolation', fiber:'VMO peak', repRange:{min:10,max:15}, sets:3, alternatives:[] }
        ]
      },
      {
        muscle: 'Hamstrings', muscleId: 'hamstrings',
        exercises: [
          { name:'Romanian Deadlift', type:'compound', fiber:'Long head / stretch', repRange:{min:6,max:8}, sets:4, alternatives:['Stiff-Leg Deadlift'] },
          { name:'Lying Leg Curl', type:'isolation', fiber:'Biceps femoris', repRange:{min:10,max:12}, sets:3, alternatives:['Seated Leg Curl'] },
          { name:'Seated Leg Curl', type:'isolation', fiber:'Semitendinosus', repRange:{min:12,max:15}, sets:2, alternatives:['Lying Leg Curl'] }
        ]
      },
      {
        muscle: 'Calves', muscleId: 'calves',
        exercises: [
          { name:'Standing Calf Raise', type:'isolation', fiber:'Gastrocnemius', repRange:{min:12,max:18}, sets:4, alternatives:['Leg Press Calf Raise'] }
        ]
      },
      {
        muscle: 'Side Delts', muscleId: 'side_delts',
        exercises: [
          { name:'DB Lateral Raise', type:'isolation', fiber:'Medial delt', repRange:{min:12,max:15}, sets:2, alternatives:['Cable Lateral Raise'] }
        ]
      }
    ]
  },
  {
    id: 'push_upper',
    day: 'Tuesday', label: 'PUSH — UPPER CHEST', theme: 'Upper Chest Priority',
    primaryFocus: 'Clavicular Pec · Side Delts · Triceps Long Head',
    coachNote: 'Upper chest is your confirmed weak point. First 2 exercises are your priority — everything else is secondary today.',
    variantNote: { A:'45° incline angle — maximum upper pec activation', B:'30° incline — upper-mid pec, more stretch at bottom' },
    blocks: [
      {
        muscle: 'Upper Chest', muscleId: 'upper_chest',
        exercises: [
          { name:'Incline Smith Press', type:'compound', fiber:'Clavicular pec', repRange:{min:6,max:8}, sets:4, alternatives:['Incline Barbell Press','Incline DB Press'] },
          { name:'Incline DB Press', type:'compound', fiber:'Upper-mid pec', repRange:{min:8,max:12}, sets:3, alternatives:['Incline Smith Press'] },
          { name:'Cable Upper Chest Fly', type:'isolation', fiber:'Upper pec stretch', repRange:{min:10,max:14}, sets:3, alternatives:['Low-to-High Cable Fly'] }
        ]
      },
      {
        muscle: 'Side Delts', muscleId: 'side_delts',
        exercises: [
          { name:'Cable Lateral Raise', type:'isolation', fiber:'Medial delt', repRange:{min:10,max:15}, sets:4, alternatives:['DB Lateral Raise','Machine Lateral Raise'] },
          { name:'Leaning Lateral Raise', type:'isolation', fiber:'Medial delt peak', repRange:{min:12,max:18}, sets:3, alternatives:['Cable Lateral Raise'] }
        ]
      },
      {
        muscle: 'Rear Delts', muscleId: 'rear_delts',
        exercises: [
          { name:'Reverse Pec Deck', type:'isolation', fiber:'Posterior delt', repRange:{min:12,max:18}, sets:3, alternatives:['Cable Rear Fly','Bent-Over Rear Delt Raise'] }
        ]
      },
      {
        muscle: 'Triceps', muscleId: 'triceps',
        exercises: [
          { name:'Overhead Cable Extension', type:'isolation', fiber:'Long head', repRange:{min:10,max:14}, sets:4, alternatives:['Skull Crushers','Overhead DB Extension'] },
          { name:'Rope Pushdown', type:'isolation', fiber:'Lateral head', repRange:{min:10,max:15}, sets:3, alternatives:['Bar Pushdown','Cable Pushdown'] }
        ]
      }
    ]
  },
  {
    id: 'pull_width',
    day: 'Wednesday', label: 'PULL — WIDTH', theme: 'Lat Width · Rear Delts',
    primaryFocus: 'Lat Width · Rear Delts · Biceps Long Head',
    coachNote: 'Width focus today. Drive elbows down and back — not just down. Face pulls are non-negotiable for shoulder health given your HSPU goal.',
    blocks: [
      {
        muscle: 'Lats', muscleId: 'lats',
        exercises: [
          { name:'Neutral-Grip Lat Pulldown', type:'compound', fiber:'Lat width', repRange:{min:8,max:12}, sets:4, alternatives:['Wide-Grip Pulldown','Weighted Pull-Ups'] },
          { name:'Chest-Supported Row (Lat Bias)', type:'compound', fiber:'Lower lat', repRange:{min:10,max:12}, sets:3, alternatives:['Chest-Supported Row'] },
          { name:'Single-Arm Cable Lat Row', type:'compound', fiber:'Unilateral lat', repRange:{min:10,max:14}, sets:3, alternatives:['Single-Arm DB Row'] }
        ]
      },
      {
        muscle: 'Upper Back', muscleId: 'upper_back',
        exercises: [
          { name:'Seated Cable Row', type:'compound', fiber:'Mid trap / rhomboids', repRange:{min:10,max:14}, sets:4, alternatives:['Chest-Supported Row','T-Bar Row'] }
        ]
      },
      {
        muscle: 'Rear Delts', muscleId: 'rear_delts',
        exercises: [
          { name:'Face Pull', type:'isolation', fiber:'Posterior delt / rotator cuff', repRange:{min:15,max:20}, sets:4, alternatives:['Rear Delt Cable Fly','Reverse Pec Deck'] }
        ]
      },
      {
        muscle: 'Biceps', muscleId: 'biceps',
        exercises: [
          { name:'Bayesian Curl', type:'isolation', fiber:'Long head / stretch', repRange:{min:10,max:15}, sets:4, alternatives:['Incline DB Curl','Cable Curl Behind'] },
          { name:'Incline DB Curl', type:'isolation', fiber:'Long head peak', repRange:{min:10,max:14}, sets:3, alternatives:['Bayesian Curl'] }
        ]
      },
      {
        muscle: 'Forearms', muscleId: 'forearms',
        exercises: [
          { name:'Hammer Curl', type:'isolation', fiber:'Brachialis', repRange:{min:12,max:15}, sets:2, alternatives:[] },
          { name:'Reverse Curl', type:'isolation', fiber:'Brachioradialis', repRange:{min:12,max:15}, sets:2, alternatives:[] }
        ]
      },
      {
        muscle: 'Abs', muscleId: 'abs',
        exercises: [
          { name:'Hanging Leg Raise', type:'isolation', fiber:'Lower abs', repRange:{min:10,max:15}, sets:3, alternatives:['Hanging Knee Raise'] },
          { name:'Cable Crunch', type:'isolation', fiber:'Upper abs', repRange:{min:12,max:18}, sets:2, alternatives:['Decline Weighted Sit-Up'] }
        ]
      }
    ]
  },
  {
    id: 'legs_recovery',
    day: 'Thursday', label: 'LEGS RECOVERY', theme: 'Unilateral + Conditioning',
    primaryFocus: 'BSS · Hamstrings · Side Delts · Abs',
    coachNote: 'Recovery day — lighter than Monday. Bulgarian split squats are hard but controlled. No ego today. Side delts are a priority here.',
    blocks: [
      {
        muscle: 'Quads', muscleId: 'quads',
        exercises: [
          { name:'Bulgarian Split Squat', type:'compound', fiber:'Unilateral quad / glute', repRange:{min:8,max:10}, sets:3, alternatives:['Walking Lunges','Step-Up'] },
          { name:'Leg Extension', type:'isolation', fiber:'VMO', repRange:{min:12,max:15}, sets:2, alternatives:[] }
        ]
      },
      {
        muscle: 'Hamstrings', muscleId: 'hamstrings',
        exercises: [
          { name:'Seated Leg Curl', type:'isolation', fiber:'Semitendinosus', repRange:{min:12,max:15}, sets:3, alternatives:['Lying Leg Curl'] },
          { name:'Light RDL', type:'compound', fiber:'Long head / recovery', repRange:{min:10,max:12}, sets:2, alternatives:[] }
        ]
      },
      {
        muscle: 'Calves', muscleId: 'calves',
        exercises: [
          { name:'Seated Calf Raise', type:'isolation', fiber:'Soleus (different from Mon)', repRange:{min:12,max:18}, sets:4, alternatives:[] }
        ]
      },
      {
        muscle: 'Side Delts', muscleId: 'side_delts',
        exercises: [
          { name:'Cable Lateral Raise', type:'isolation', fiber:'Medial delt', repRange:{min:10,max:15}, sets:4, alternatives:['DB Lateral Raise'] },
          { name:'Partial Laterals', type:'isolation', fiber:'Medial delt finisher', repRange:{min:20,max:25}, sets:2, alternatives:[] }
        ]
      },
      {
        muscle: 'Abs', muscleId: 'abs',
        exercises: [
          { name:'Cable Crunch', type:'isolation', fiber:'Upper abs', repRange:{min:12,max:18}, sets:2, alternatives:['Decline Weighted Sit-Up'] },
          { name:'Hanging Leg Raise', type:'isolation', fiber:'Lower abs', repRange:{min:10,max:15}, sets:1, alternatives:[] }
        ]
      }
    ]
  },
  {
    id: 'push_shoulders',
    day: 'Friday', label: 'PUSH — SHOULDERS + ARMS', theme: 'Full Chest · Side Delts · HSPU',
    primaryFocus: 'Full Chest Coverage · Side Delts · HSPU Skill',
    coachNote: 'Chest hits all three fiber regions today. Incline at 30° — slightly lower than Tuesday. HSPU skill block goes at the end when shoulders are warm but before complete failure.',
    blocks: [
      {
        muscle: 'Chest (Full)', muscleId: 'upper_chest',
        exercises: [
          { name:'Incline DB Press (30°)', type:'compound', fiber:'Upper-mid pec', repRange:{min:8,max:12}, sets:3, alternatives:['Incline Smith Press'] },
          { name:'Flat DB Press', type:'compound', fiber:'Mid pec / sternal', repRange:{min:8,max:12}, sets:3, alternatives:['Flat Barbell Press','Machine Chest Press'] },
          { name:'High-to-Low Cable Fly', type:'isolation', fiber:'Lower pec / stretch', repRange:{min:12,max:15}, sets:2, alternatives:['Low Cable Fly','Dips (pec focus)'] }
        ]
      },
      {
        muscle: 'Side Delts', muscleId: 'side_delts',
        exercises: [
          { name:'DB Lateral Raise', type:'isolation', fiber:'Medial delt', repRange:{min:12,max:15}, sets:3, alternatives:['Machine Lateral Raise'] },
          { name:'Cable Lateral Raise', type:'isolation', fiber:'Medial delt (cable constant tension)', repRange:{min:10,max:15}, sets:2, alternatives:['DB Lateral Raise'] }
        ]
      },
      {
        muscle: 'Rear Delts', muscleId: 'rear_delts',
        exercises: [
          { name:'Reverse Pec Deck', type:'isolation', fiber:'Posterior delt', repRange:{min:12,max:18}, sets:4, alternatives:['Cable Rear Fly','Bent-Over Rear Delt Raise'] }
        ]
      },
      {
        muscle: 'Triceps', muscleId: 'triceps',
        exercises: [
          { name:'Skull Crushers', type:'isolation', fiber:'Long head', repRange:{min:8,max:12}, sets:4, alternatives:['Overhead DB Extension','Overhead Cable Extension'] },
          { name:'Rope Pushdown', type:'isolation', fiber:'Lateral + medial head', repRange:{min:10,max:15}, sets:3, alternatives:['Bar Pushdown'] }
        ]
      },
      {
        muscle: 'HSPU Skill', muscleId: 'hspu',
        exercises: [
          { name:'Pike Push-Ups', type:'compound', fiber:'Front delt / triceps (HSPU prep)', repRange:{min:5,max:8}, sets:3, alternatives:['Wall HSPU Negatives','Elevated Pike Push-Up'] },
          { name:'Wall Handstand Hold', type:'isolation', fiber:'Scapular stability / balance', repRange:{min:1,max:1}, sets:2, alternatives:[] }
        ]
      },
      {
        muscle: 'Chest Stretch', muscleId: 'upper_chest',
        exercises: [
          { name:'Cable Fly (stretch focus)', type:'isolation', fiber:'Full pec length', repRange:{min:12,max:15}, sets:2, alternatives:['DB Fly','Pec Deck'] }
        ]
      }
    ]
  },
  {
    id: 'pull_arms',
    day: 'Saturday', label: 'PULL — ARM SPECIALIZATION', theme: 'Biceps Priority · Thickness',
    primaryFocus: 'Biceps Strength · Lat Thickness · Forearms',
    coachNote: 'Arm specialization day. EZ bar curls at 6-8 reps is your strength work — treat it like a compound lift. Full lat and upper back coverage to close out the week.',
    blocks: [
      {
        muscle: 'Lats', muscleId: 'lats',
        exercises: [
          { name:'Neutral-Grip Pulldown', type:'compound', fiber:'Lat width', repRange:{min:8,max:12}, sets:3, alternatives:['Weighted Pull-Ups'] },
          { name:'Single-Arm Cable Pulldown', type:'isolation', fiber:'Unilateral lat stretch', repRange:{min:10,max:14}, sets:3, alternatives:['Single-Arm DB Row'] }
        ]
      },
      {
        muscle: 'Upper Back', muscleId: 'upper_back',
        exercises: [
          { name:'Chest-Supported Row', type:'compound', fiber:'Rhomboids / mid trap', repRange:{min:8,max:12}, sets:4, alternatives:['Seated Cable Row','T-Bar Row'] }
        ]
      },
      {
        muscle: 'Rear Delts', muscleId: 'rear_delts',
        exercises: [
          { name:'Rear Delt Row', type:'isolation', fiber:'Posterior delt', repRange:{min:12,max:15}, sets:3, alternatives:['Reverse Pec Deck','Cable Rear Fly'] }
        ]
      },
      {
        muscle: 'Biceps', muscleId: 'biceps',
        exercises: [
          { name:'EZ Bar Curl', type:'compound', fiber:'Short head / peak strength', repRange:{min:6,max:8}, sets:3, alternatives:['Barbell Curl'] },
          { name:'Incline DB Curl', type:'isolation', fiber:'Long head', repRange:{min:8,max:12}, sets:3, alternatives:['Bayesian Curl'] },
          { name:'Hammer Curl', type:'isolation', fiber:'Brachialis / brachioradialis', repRange:{min:10,max:12}, sets:3, alternatives:[] }
        ]
      },
      {
        muscle: 'Forearms', muscleId: 'forearms',
        exercises: [
          { name:'Wrist Curl', type:'isolation', fiber:'Wrist flexors', repRange:{min:15,max:20}, sets:2, alternatives:[] },
          { name:'Reverse Wrist Curl', type:'isolation', fiber:'Wrist extensors', repRange:{min:15,max:20}, sets:2, alternatives:[] }
        ]
      },
      {
        muscle: 'Abs', muscleId: 'abs',
        exercises: [
          { name:'Decline Weighted Sit-Up', type:'isolation', fiber:'Upper abs (weighted)', repRange:{min:10,max:15}, sets:2, alternatives:['Cable Crunch'] },
          { name:'Cable Crunch', type:'isolation', fiber:'Upper abs', repRange:{min:12,max:18}, sets:2, alternatives:['Decline Weighted Sit-Up'] }
        ]
      }
    ]
  },
  {
    id: 'rest',
    day: 'Sunday', label: 'REST', theme: 'Recovery',
    primaryFocus: 'Active Recovery',
    coachNote: 'Recovery is where the adaptation happens. Sleep, protein, light walk if you want. No session needed.',
    blocks: []
  }
];

// Muscle volume targets (weekly sets min-max)
const MUSCLE_TARGETS = {
  quads:       { min:10, max:14, name:'Quads',       color:'#3DDC97' },
  hamstrings:  { min:8,  max:12, name:'Hamstrings',  color:'#3DDC97' },
  calves:      { min:8,  max:12, name:'Calves',       color:'#3DDC97' },
  glutes:      { min:4,  max:8,  name:'Glutes',       color:'#3DDC97' },
  upper_chest: { min:12, max:18, name:'Chest',        color:'#FF4D6D' },
  lats:        { min:14, max:18, name:'Lats',         color:'#3D9DFF' },
  upper_back:  { min:8,  max:12, name:'Upper Back',   color:'#3D9DFF' },
  side_delts:  { min:16, max:22, name:'Side Delts',   color:'#FFC23D' },
  rear_delts:  { min:12, max:18, name:'Rear Delts',   color:'#FFC23D' },
  triceps:     { min:14, max:18, name:'Triceps',      color:'#C83DFF' },
  biceps:      { min:14, max:18, name:'Biceps',       color:'#C83DFF' },
  forearms:    { min:8,  max:12, name:'Forearms',     color:'#C83DFF' },
  abs:         { min:8,  max:12, name:'Abs',          color:'#3DDC97' },
  hspu:        { min:3,  max:6,  name:'HSPU Skill',   color:'#FFC23D' }
};

// Cue database per exercise
const CUES = {
  'Back Squat':                    { internal:'Drive knees out, brace before descending', external:'Sit back into a chair behind you' },
  'Hack Squat':                    { internal:'Keep tension on the quad through the full range', external:'Press the platform away, don\'t bounce' },
  'Leg Extension':                 { internal:'Squeeze hard at lockout, slow negative', external:'Kick the pad up and hold' },
  'Romanian Deadlift':             { internal:'Push hips back first, feel the hamstring stretch', external:'Slide the bar down your legs' },
  'Lying Leg Curl':                { internal:'Squeeze hamstring at the top, slow negative', external:'Curl your heels toward your glutes' },
  'Seated Leg Curl':               { internal:'Keep hips pinned to the pad', external:'Pull the pad down and under' },
  'Standing Calf Raise':           { internal:'Pause at top, full stretch at bottom', external:'Push through the balls of your feet and rise tall' },
  'Seated Calf Raise':             { internal:'Slow tempo, deep stretch every rep', external:'Press your knees up by raising your heels' },
  'DB Lateral Raise':              { internal:'Lead with elbows, slight lean away', external:'Raise like wings — stop before traps dominate' },
  'Cable Lateral Raise':           { internal:'Squeeze delt at the top, lead with elbow', external:'Pour water from a jug at the top' },
  'Leaning Lateral Raise':         { internal:'Lean into the rack, isolate the top arc', external:'Arc the dumbbell away from your hip' },
  'Partial Laterals':              { internal:'Top half only, burn it out', external:'Pulse in the top 6 inches' },
  'Incline Smith Press':           { internal:'Drive through upper chest, elbows at 45°', external:'Push the bar up and slightly back toward your face' },
  'Incline DB Press':              { internal:'2 sec stretch at bottom, squeeze at top', external:'Press the dumbbells together like closing a book' },
  'Incline DB Press (30°)':        { internal:'Slightly lower angle — feel mid-upper pec', external:'Push up and slightly inward' },
  'Cable Upper Chest Fly':         { internal:'Feel the stretch across upper pec, squeeze inward', external:'Bring your hands together from below' },
  'Flat DB Press':                 { internal:'Full stretch at bottom, press straight up', external:'Push the dumbbells apart then together at the top' },
  'High-to-Low Cable Fly':         { internal:'Feel lower pec working, controlled squeeze', external:'Bring handles down and together' },
  'Cable Fly (stretch focus)':     { internal:'Maximum stretch is the goal, squeeze lightly', external:'Let the cables pull you open, then close' },
  'Reverse Pec Deck':              { internal:'Open the chest, feel posterior delt stretch', external:'Sweep your arms back like opening curtains' },
  'Face Pull':                     { internal:'Pull to your face, elbows high and wide', external:'Pull the rope apart toward your ears' },
  'Rear Delt Row':                 { internal:'Drive elbows up and back, rear delt contracts', external:'Pull handles toward your ears not your ribs' },
  'Neutral-Grip Lat Pulldown':     { internal:'Drive elbows into your hips, wrists quiet', external:'Pull your chest up to meet the bar' },
  'Chest-Supported Row (Lat Bias)':{ internal:'Slight forward lean — feel lat not rhomboid', external:'Row the handles toward your hip pockets' },
  'Single-Arm Cable Lat Row':      { internal:'Rotate torso slightly into the pull', external:'Row the handle toward your back pocket' },
  'Seated Cable Row':              { internal:'Lead with elbows, chest tall throughout', external:'Pull the handle to your belly button' },
  'Bayesian Curl':                 { internal:'Full stretch from behind, curl from extension', external:'Pull the cable from behind your body to your shoulder' },
  'Incline DB Curl':               { internal:'Arm fully behind torso at the bottom', external:'Curl while elbow stays pinned back' },
  'EZ Bar Curl':                   { internal:'Elbows pinned, squeeze at the top', external:'Curl the bar in a clean arc, no swinging' },
  'Hammer Curl':                   { internal:'Squeeze brachialis at top, elbows fixed', external:'Curl like hammering a nail upward' },
  'Reverse Curl':                  { internal:'Keep wrists firm, drive top of forearm', external:'Curl bar up with palms facing the floor' },
  'Wrist Curl':                    { internal:'Full wrist range, isolate the joint', external:'Curl fingers and wrist, forearm resting still' },
  'Reverse Wrist Curl':            { internal:'Control the extension, feel extensors', external:'Lift the back of your hand toward the ceiling' },
  'Overhead Cable Extension':      { internal:'Stretch long head overhead, full extension', external:'Pull the rope down and apart at the bottom' },
  'Rope Pushdown':                 { internal:'Keep elbows pinned, full lockout', external:'Push the rope down and apart at the bottom' },
  'Skull Crushers':                { internal:'Lower to behind head — more long head', external:'Lower the bar toward the bench behind your head' },
  'Neutral-Grip Pulldown':         { internal:'Elbows to hips, 2 sec stretch at top', external:'Pull chest up to the bar' },
  'Single-Arm Cable Pulldown':     { internal:'Full stretch at top, arc elbow to hip', external:'Pull the handle down in a sweeping arc' },
  'Chest-Supported Row':           { internal:'Squeeze shoulder blades, pause at top', external:'Pull handles into your ribcage' },
  'Pike Push-Ups':                 { internal:'Push hips high, lower head between hands', external:'Make a triangle with your body, lower forehead to floor' },
  'Wall Handstand Hold':           { internal:'Engage core, push floor away, active shoulders', external:'Push the ground down to grow taller' },
  'Hanging Leg Raise':             { internal:'Curl pelvis up at top, slow descent', external:'Bring knees to chest, then chest to knees' },
  'Cable Crunch':                  { internal:'Round the spine, ribs to hips', external:'Curl your head down toward your belly button' },
  'Decline Weighted Sit-Up':       { internal:'Lead with chest, full range', external:'Roll your spine up one segment at a time' },
  'Bulgarian Split Squat':         { internal:'Drive front heel, keep torso upright', external:'Lower straight down, don\'t lean into the movement' },
  'Light RDL':                     { internal:'Hips back, bar stays close, feel the stretch', external:'Slide bar down your legs, slow and controlled' }
};

// Rest defaults (seconds) — adaptive per type + effort
const REST_DEFAULTS = { compound: 165, isolation: 75 };

// Vedic day focus (Sun-based index 0=Sun)
const DAY_FOCUS = [
  { ruler:'Sun',     cue:'Sun rules today — identity, center, the heart. Train with presence.' },
  { ruler:'Moon',    cue:'Moon rules today — adaptability, flow. Listen to your body today.' },
  { ruler:'Mars',    cue:'Mars rules today — aggression, drive. Channel intensity, not recklessness.' },
  { ruler:'Mercury', cue:'Mercury rules today — precision. Perfect form over heavier load.' },
  { ruler:'Jupiter', cue:'Jupiter rules today — expansion, growth. A strong day to push volume.' },
  { ruler:'Venus',   cue:'Venus rules today — aesthetics, balance. Train for the visual goal.' },
  { ruler:'Saturn',  cue:'Saturn rules today — discipline. Show up regardless of how you feel.' }
];
