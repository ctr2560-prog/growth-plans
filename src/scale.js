// Shared scale definitions: goal types, score areas and SEF bands. Used by the
// dashboard and the parent report PDF.

// The goal types, in display order. `key` is used in both the spreadsheet
// row mapping and the Firestore document. careerGoal keeps its old key (now shown
// as "Pathways") so goals already saved in Firestore keep loading.
export const GOAL_TYPES = [
  { key: 'literacyGoal', label: 'Literacy', placeholder: 'e.g. Use paragraph planners to structure extended responses by end of Term 3' },
  { key: 'numeracyGoal', label: 'Numeracy', placeholder: 'e.g. Fluency with fractions and decimals without a calculator' },
  { key: 'careerGoal',   label: 'Pathways', placeholder: 'e.g. Exploring TAFE nursing entry — school-based traineeship in Year 11' },
];

// The score bars, in display order. Data uploaded before Reading/Writing were
// split only has `literacy`, so metricsFor() falls back to a single bar for it.
export const METRICS = [
  { key: 'reading',    label: 'Reading',    abbr: 'R' },
  { key: 'writing',    label: 'Writing',    abbr: 'W' },
  { key: 'numeracy',   label: 'Numeracy',   abbr: 'N' },
  { key: 'attendance', label: 'Attendance', abbr: 'A' },
];
export const LEGACY_LITERACY = { key: 'literacy', label: 'Literacy', abbr: 'L' };

export const metricsFor = (student) =>
  student.reading == null && student.writing == null && student.literacy != null
    ? [LEGACY_LITERACY, ...METRICS.slice(2)]
    : METRICS.filter((m) => student[m.key] != null);


// School Excellence Framework bands, each split into three levels. Scores are
// on a 0–10 scale and each band covers 2 points. Colours run red → deep
// green so a higher level always reads as further along.
export const LEVEL_NAMES = ['Developing', 'Growing', 'Sustaining'];

export const BAND_WIDTH = 2;

export const makeBand = (id, name, abbr, min, bgColor, colors) => ({
  id, name, abbr, min, max: min + BAND_WIDTH, bgColor,
  range: `${min}–${min + BAND_WIDTH}`,
  levels: LEVEL_NAMES.map((lvl, i) => ({
    n: i + 1,
    name: lvl,
    full: `Level ${i + 1} ${lvl}`,
    label: `${abbr}${i + 1}`, // e.g. "D2" = Delivering, Level 2
    band: name,
    color: colors[i],
  })),
});

export const BANDS = [
  makeBand(1, 'Emerging',                   'EM', 0, '#FCEBEB', ['#8E1616', '#A61B1B', '#B91F1F']),
  makeBand(2, 'Working Towards Delivering', 'WT', 2, '#FFEFE8', ['#C2410C', '#D2491A', '#E05424']),
  makeBand(3, 'Delivering',                 'D',  4, '#FFF5E0', ['#A86200', '#BA6D00', '#C97A00']),
  makeBand(4, 'Sustaining & Growing',       'SG', 6, '#F1F8E9', ['#7CB342', '#689F38', '#558B2F']),
  makeBand(5, 'Excelling',                  'E',  8, '#E8F5E9', ['#388E3C', '#2E7D32', '#1B5E20']),
];

export const getBandAndLevel = (value) => {
  const v = Math.max(0, Math.min(10, value));
  const band = BANDS[Math.min(BANDS.length - 1, Math.floor(v / BAND_WIDTH))];
  const pos = (v - band.min) / (band.max - band.min);
  const level = band.levels[Math.min(2, Math.floor(pos * 3))];
  return { band, level };
};

export const getGrowthTarget = (value) => Math.min(10, value + 1);
