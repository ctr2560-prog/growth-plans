// One-page parent report (A4) for parent–teacher interviews, rendered as a
// vector PDF with @react-pdf/renderer. This file is loaded on demand from the
// download buttons so the PDF library isn't in the main bundle.
//
// Teacher-facing "suggested supports" are deliberately left out: some of them
// (e.g. welfare referrals) are not meant to go home to families.

import { Document, Page, View, Text, Image, Font, StyleSheet, pdf } from '@react-pdf/renderer';

import inter400 from '@fontsource/inter/files/inter-latin-400-normal.woff?url';
import inter600 from '@fontsource/inter/files/inter-latin-600-normal.woff?url';
import inter700 from '@fontsource/inter/files/inter-latin-700-normal.woff?url';
import mont700 from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff?url';
import mont800 from '@fontsource/montserrat/files/montserrat-latin-800-normal.woff?url';
import {
  BANDS, LEVEL_NAMES, GOAL_TYPES, getBandAndLevel, getGrowthTarget, metricsFor,
} from './scale';

Font.register({
  family: 'Inter',
  fonts: [
    { src: inter400, fontWeight: 400 },
    { src: inter600, fontWeight: 600 },
    { src: inter700, fontWeight: 700 },
  ],
});
Font.register({
  family: 'Montserrat',
  fonts: [
    { src: mont700, fontWeight: 700 },
    { src: mont800, fontWeight: 800 },
  ],
});
// Keep long words (and hyphenated surnames) whole rather than auto-hyphenating.
Font.registerHyphenationCallback((word) => [word]);

const C = {
  blue: '#1d499f',
  red: '#bf2026',
  ink: '#0F1A3D',
  slate: '#5B6478',
  paper: '#F4F7FB',
  line: '#E3E8F0',
};

// A4 is 595 × 842pt; 40pt margins leave a 515pt content width.
const LABEL_W = 104;
const BAR_W = 236;
const GAP = 12;
const SEG_GAP = 2;
const DOT = 10;

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 44, paddingHorizontal: 40, fontFamily: 'Inter', fontSize: 9, color: C.ink },

  header: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 48, height: 44, marginRight: 12 },
  school: { fontFamily: 'Montserrat', fontWeight: 700, fontSize: 9, color: C.slate },
  title: { fontFamily: 'Montserrat', fontWeight: 800, fontSize: 19, color: C.ink, marginTop: 1 },
  headerRight: { marginLeft: 'auto', alignItems: 'flex-end' },
  headerMeta: { fontSize: 8, color: C.slate, marginTop: 2 },
  rule: { height: 2, backgroundColor: C.red, marginTop: 12 },

  name: { fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginTop: 14 },
  intro: { fontSize: 9.5, color: C.slate, marginTop: 4, lineHeight: 1.45, maxWidth: 440 },

  sectionTitle: { fontFamily: 'Montserrat', fontWeight: 700, fontSize: 11.5, marginTop: 16, marginBottom: 7 },

  bandHead: { flexDirection: 'row', marginLeft: LABEL_W + GAP, width: BAR_W },
  bandHeadCell: { paddingBottom: 3, borderBottomWidth: 1.5, justifyContent: 'flex-end' },
  bandHeadText: { fontSize: 6.5, fontWeight: 600, color: C.ink, lineHeight: 1.2 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 0.75, borderBottomColor: C.line },
  rowLabel: { width: LABEL_W, marginRight: GAP },
  metric: { fontFamily: 'Montserrat', fontWeight: 700, fontSize: 10.5 },
  score: { fontSize: 7.5, color: C.slate, marginTop: 2 },
  bar: { width: BAR_W, height: 16, position: 'relative', marginRight: GAP },
  status: { flex: 1 },
  statusLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  statusKey: { fontSize: 7, color: C.slate, width: 26 },
  statusVal: { fontSize: 8, fontWeight: 600, flex: 1 },

  goals: { flexDirection: 'row', backgroundColor: C.paper, borderRadius: 6 },
  goal: { flex: 1, padding: 10 },
  goalDivider: { borderLeftWidth: 0.75, borderLeftColor: C.line },
  goalLabel: { fontSize: 9, fontWeight: 700, color: C.blue, marginBottom: 4 },
  goalText: { fontSize: 8.5, lineHeight: 1.4 },
  goalEmpty: { fontSize: 8.5, color: C.slate },

  notesLine: { borderBottomWidth: 0.75, borderBottomColor: '#C9D2E0', height: 19 },

  keyRow: { flexDirection: 'row', marginTop: 2 },
  keyCell: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', paddingRight: 6 },
  keySwatch: { width: 7, height: 7, borderRadius: 1.5, marginRight: 4, marginTop: 1 },
  keyName: { fontSize: 7, fontWeight: 600, lineHeight: 1.25 },
  keyRange: { fontSize: 6.5, color: C.slate, marginTop: 1 },
  keyNote: { fontSize: 7.5, color: C.slate, marginTop: 6, lineHeight: 1.4 },

  footer: {
    position: 'absolute', bottom: 24, left: 40, right: 40,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 0.75, borderTopColor: C.line, paddingTop: 6,
    fontSize: 7, color: C.slate,
  },
});

const firstName = (name) => name.trim().split(/\s+/)[0];

const listAreas = (labels) => {
  const l = labels.map((x) => x.toLowerCase());
  return l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`;
};

const formatScore = (key, v) =>
  key === 'attendance' ? `${Math.round(v * 10)}% attendance` : `${v.toFixed(1)} out of 10`;

const Bar = ({ value, target, bands }) => {
  const segW = (BAR_W - SEG_GAP * (bands.length - 1)) / bands.length;
  // Circle centres stay inside the bar so a score of 0 or 10 isn't cut off.
  const x = (v) => Math.max(DOT / 2, Math.min(BAR_W - DOT / 2, (v / 10) * BAR_W));
  const now = getBandAndLevel(value).level;
  const next = getBandAndLevel(target).level;
  return (
    <View style={s.bar}>
      {bands.map((b, i) => (
        <View key={b.id} style={{
          position: 'absolute', top: 2, height: 12, width: segW,
          left: i * (segW + SEG_GAP), backgroundColor: b.bgColor, borderRadius: 2,
        }} />
      ))}
      <View style={{
        position: 'absolute', top: 7, height: 2, left: x(value), width: Math.max(0, x(target) - x(value)),
        backgroundColor: now.color, opacity: 0.35,
      }} />
      <View style={{
        position: 'absolute', top: 3, left: x(value) - DOT / 2, width: DOT, height: DOT,
        borderRadius: DOT / 2, backgroundColor: now.color, borderWidth: 1.5, borderColor: '#FFFFFF',
      }} />
      <View style={{
        position: 'absolute', top: 3, left: x(target) - DOT / 2, width: DOT, height: DOT,
        borderRadius: DOT / 2, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: next.color,
      }} />
    </View>
  );
};

const ReportPage = ({ student, goals, logoSrc, preparedOn }) => {
  const metrics = metricsFor(student);
  const first = firstName(student.name);
  const segW = (BAR_W - SEG_GAP * (BANDS.length - 1)) / BANDS.length;
  // Very long goals get slightly smaller type and fewer note lines so every
  // report stays on one page.
  const longestGoal = Math.max(0, ...GOAL_TYPES.map((g) => (goals[g.key] || '').length));
  const goalSize = longestGoal > 520 ? 7.6 : longestGoal > 400 ? 8 : 8.5;
  const noteLines = longestGoal > 400 ? 3 : 4;

  return (
    <Page size="A4" style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <Image src={logoSrc} style={s.logo} />
        <View>
          <Text style={s.school}>Sarah Redfern High School</Text>
          <Text style={s.title}>Student Growth Plan</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={{ fontSize: 8, fontWeight: 600 }}>Parent–teacher interview</Text>
          <Text style={s.headerMeta}>{preparedOn}</Text>
        </View>
      </View>
      <View style={s.rule} />

      {/* Student */}
      <Text style={s.name}>{student.name}</Text>
      <Text style={s.intro}>
        This plan shows where {first} is now in {listAreas(metrics.map((m) => m.label))}, the next
        step we are working towards together, and the goals {first} has set.
      </Text>

      {/* Progress */}
      <Text style={s.sectionTitle}>Progress and next steps</Text>
      <View style={s.bandHead}>
        {BANDS.map((b, i) => (
          <View key={b.id} style={[s.bandHeadCell, {
            width: segW, marginRight: i < BANDS.length - 1 ? SEG_GAP : 0, borderBottomColor: b.levels[1].color,
          }]}>
            <Text style={s.bandHeadText}>{b.name}</Text>
          </View>
        ))}
      </View>
      {metrics.map((m) => {
        const value = student[m.key];
        const target = getGrowthTarget(value);
        const now = getBandAndLevel(value).level;
        const next = getBandAndLevel(target).level;
        return (
          <View key={m.key} style={s.row} wrap={false}>
            <View style={s.rowLabel}>
              <Text style={s.metric}>{m.label}</Text>
              <Text style={s.score}>{formatScore(m.key, value)}</Text>
            </View>
            <Bar value={value} target={target} bands={BANDS} />
            <View style={s.status}>
              <View style={s.statusLine}>
                <Text style={s.statusKey}>Now</Text>
                <Text style={[s.statusVal, { color: now.color }]}>{now.band}, Level {now.n}</Text>
              </View>
              <View style={[s.statusLine, { marginBottom: 0 }]}>
                <Text style={s.statusKey}>Next</Text>
                <Text style={[s.statusVal, { color: next.color }]}>
                  {next.label === now.label ? 'Maintain' : `${next.band}, Level ${next.n}`}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* Goals */}
      <Text style={s.sectionTitle}>{first}&rsquo;s goals</Text>
      <View style={s.goals} wrap={false}>
        {GOAL_TYPES.map((g, i) => (
          <View key={g.key} style={[s.goal, i > 0 ? s.goalDivider : null]}>
            <Text style={s.goalLabel}>{g.label}</Text>
            {goals[g.key]
              ? <Text style={[s.goalText, { fontSize: goalSize }]}>{goals[g.key]}</Text>
              : <Text style={s.goalEmpty}>To be set together.</Text>}
          </View>
        ))}
      </View>

      {/* Notes */}
      <Text style={s.sectionTitle}>Notes from our conversation</Text>
      <View wrap={false}>
        {Array.from({ length: noteLines }, (_, i) => <View key={i} style={s.notesLine} />)}
      </View>

      {/* Key */}
      <Text style={[s.sectionTitle, { fontSize: 9.5, marginBottom: 6 }]}>Understanding the bands</Text>
      <View style={s.keyRow} wrap={false}>
        {BANDS.map((b) => (
          <View key={b.id} style={s.keyCell}>
            <View style={[s.keySwatch, { backgroundColor: b.levels[1].color }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.keyName}>{b.name}</Text>
              <Text style={s.keyRange}>{b.range} out of 10</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={s.keyNote}>
        Bands follow the NSW School Excellence Framework. Each band has three levels:
        {' '}{LEVEL_NAMES.map((n, i) => `Level ${i + 1} ${n}`).join(', ')}. The filled circle shows
        where {first} is now and the outlined circle shows the next target, one point higher.
      </Text>

      <View style={s.footer} fixed>
        <Text>Sarah Redfern High School, Growth Plan for {student.name}</Text>
        <Text>Prepared {preparedOn}</Text>
      </View>
    </Page>
  );
};

export const ReportDocument = ({ students, goalsFor, logoSrc }) => {
  const preparedOn = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <Document title={students.length === 1 ? `Growth Plan - ${students[0].name}` : 'Growth Plans'} author="Sarah Redfern High School">
      {students.map((st) => (
        <ReportPage key={st.name} student={st} goals={goalsFor(st)} logoSrc={logoSrc} preparedOn={preparedOn} />
      ))}
    </Document>
  );
};

const safeName = (n) => n.replace(/[\\/:*?"<>|]+/g, '').trim();

export const fileNameFor = (students) =>
  students.length === 1 ? `Growth Plan - ${safeName(students[0].name)}.pdf` : 'Growth Plans - All students.pdf';

// Renders the PDF and triggers a browser download.
export async function downloadReports({ students, goalsFor, logoSrc }) {
  const blob = await pdf(
    <ReportDocument students={students} goalsFor={goalsFor} logoSrc={logoSrc} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileNameFor(students);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
