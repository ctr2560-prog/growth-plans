import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Search, ArrowLeft, ChevronDown,
  Users, Info, Shield, CheckCircle, Trash2, X, Pencil, Code2, Copy, Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from './firebase';
import {
  GOAL_TYPES, metricsFor, LEVEL_NAMES, BANDS, getBandAndLevel, getGrowthTarget,
} from './scale';
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection } from 'firebase/firestore';

const FS_DOC = doc(db, 'dashboard', 'current');
const commentId = (name) => name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
const commentRef = (name) => doc(collection(db, 'studentComments'), commentId(name));

const SUPPORTS = {
  reading: {
    '1D': [
      'Intensive 1:1 phonics intervention (e.g., Reading Recovery)',
      'Specialist literacy teacher referral recommended',
      'Daily structured phonics program with decodable texts',
    ],
    '1G': [
      'Small group explicit phonics instruction',
      'Decodable text practice at instructional level',
      'Sight word consolidation and fluency activities',
    ],
    '1S': [
      'Guided reading groups at instructional level',
      'Comprehension strategy instruction (predict, question, clarify)',
      'Oral language development activities',
    ],
    '2D': [
      'Targeted vocabulary building activities',
      'Comprehension monitoring and repair strategies',
      'Small group guided reading with text discussion',
    ],
    '2G': [
      'Reading circles with scaffolded discussion prompts',
      'Inference, prediction and author intent tasks',
      'Close reading of visual and multimodal texts',
    ],
    '2S': [
      'Independent reading programs with goal-setting',
      'Higher-order thinking and analytical response tasks',
      'Peer reading partnerships and discussion groups',
    ],
    '3D': [
      'Extension reading challenge texts (above year level)',
      'Literary analysis and critical response activities',
      'Advanced comprehension — evaluating and synthesising',
    ],
    '3G': [
      'Student-led literature circles and Socratic seminars',
      'Complex multi-genre and multi-modal text analysis',
      'Research-based inquiry and project-based reading',
    ],
    '3S': [
      'Peer mentoring — supporting lower-band readers',
      'Advanced literary, rhetorical and stylistic projects',
      'Cross-KLA extension enrichment program',
    ],
  },
  writing: {
    '1D': [
      'Intensive 1:1 support with sentence construction and spelling',
      'Specialist literacy teacher referral recommended',
      'Daily scaffolded writing with word banks and sentence starters',
    ],
    '1G': [
      'Explicit teaching of simple and compound sentences',
      'Spelling patterns and high-frequency word practice',
      'Modelled and shared writing before independent attempts',
    ],
    '1S': [
      'Sentence combining and expanding activities',
      'Scaffolded paragraph structure (e.g. TEEL) with planners',
      'Oral rehearsal of ideas before writing',
    ],
    '2D': [
      'Graphic organisers and paragraph planners for extended responses',
      'Explicit topic vocabulary and word banks',
      'Editing checklists for punctuation and sentence boundaries',
    ],
    '2G': [
      'Explicit teaching of text structures (persuasive, informative)',
      'Sentence variety and cohesive devices (connectives, referring words)',
      'Peer feedback against shared success criteria',
    ],
    '2S': [
      'Extended responses with scaffolds gradually removed',
      'Self-editing and redrafting against marking criteria',
      'Writing for different audiences and purposes',
    ],
    '3D': [
      'Sophisticated vocabulary, modality and nominalisation',
      'Analytical and evaluative writing tasks',
      'Drafting conferences with teacher feedback',
    ],
    '3G': [
      'Independent extended writing across KLAs',
      'Developing voice, style and deliberate language choices',
      'Publishing opportunities (school magazine, newsletters)',
    ],
    '3S': [
      'Writing competitions and external publication',
      'Peer writing mentor — supporting lower-band writers',
      'Cross-KLA extension (debating, journalism, creative writing)',
    ],
  },
  numeracy: {
    '1D': [
      'Intensive numeracy intervention (e.g., MiniLit Sage, QuickSmart)',
      'Specialist numeracy teacher referral recommended',
      'Focus: number sense, counting, subitising and place value',
    ],
    '1G': [
      'Small group explicit instruction in basic operations',
      'Hands-on manipulatives (MAB blocks, counters, number lines)',
      'Number fact fluency building — addition and subtraction',
    ],
    '1S': [
      'Guided practice with number facts and operations',
      'Pattern, structure and multiplicative thinking activities',
      'Targeted problem-solving with concrete supports',
    ],
    '2D': [
      'Targeted multi-step problem solving support',
      'Math fluency and automaticity — times tables focus',
      'Collaborative problem solving with guided questioning',
    ],
    '2G': [
      'Collaborative problem solving groups',
      'Real-world math application tasks (measurement, finance)',
      'Flexible grouping for extension and challenge tasks',
    ],
    '2S': [
      'Open-ended mathematical investigations',
      'Multi-step and multi-strategy problem sets',
      'Challenge tasks requiring explanation and justification',
    ],
    '3D': [
      'Extension mathematics program',
      'Abstract reasoning and early mathematical proof',
      'Competition mathematics preparation (AMC/IMAS)',
    ],
    '3G': [
      'Mathematics competitions (AMC, IMAS, Tournament of Minds)',
      'Peer tutoring and leadership roles in maths groups',
      'Advanced problem sets from selective school resources',
    ],
    '3S': [
      'Advanced mathematics extension program',
      'Mathematical leadership — design problems for peers',
      'University or external enrichment programs (e.g., UNSW Global)',
    ],
  },
  attendance: {
    '1D': [
      'URGENT: Welfare check required — contact family today',
      'Refer to Home School Liaison Officer (HSLO) immediately',
      'Individual Attendance Improvement Plan required',
    ],
    '1G': [
      'Chronic absenteeism protocol — schedule family meeting',
      'Weekly check-ins with wellbeing team and class teacher',
      'Barrier identification: health, transport, bullying, anxiety',
    ],
    '1S': [
      'Attendance concern — investigate patterns with family',
      'Positive reinforcement strategies and attendance certificates',
      'Check for consistent triggers (Mondays, specific subjects)',
    ],
    '2D': [
      'Below expected attendance — discuss at next parent contact',
      'Set weekly attendance goals with student',
      'Check for patterns (Mondays, specific subjects)',
    ],
    '2G': [
      'Approaching target — celebrate recent progress',
      'Student-led goal-setting for attendance milestones',
      'Peer buddy system to increase connection and belonging',
    ],
    '2S': [
      'Good attendance — continue positive reinforcement',
      'Involve in class roles and responsibilities',
      'Co-curricular activities to build school connection',
    ],
    '3D': [
      'Strong attendance — student recognition program',
      'Acknowledge as a role model in class and at assembly',
      'Invite into peer mentoring programs',
    ],
    '3G': [
      'Excellent attendance — school recognition and award',
      'Leadership and ambassador opportunities',
      'Positive written communication home to celebrate',
    ],
    '3S': [
      'Outstanding attendance — school/community recognition',
      'Nominate for perfect attendance award',
      'Attendance ambassador role — inspire and support peers',
    ],
  },
};
SUPPORTS.literacy = SUPPORTS.reading; // old uploads with a single Literacy score

// The suggested-support lists above were written for the old 9-level scale
// (1D…3S). Each SEF level borrows the list from the old level its midpoint
// score fell in, so no support text is lost.
const SUPPORT_KEY = {
  EM1: '1D', EM2: '1D', EM3: '1G',
  WT1: '1G', WT2: '1S', WT3: '1S',
  D1: '2D',  D2: '2G',  D3: '2G',
  SG1: '2S', SG2: '3D', SG3: '3D',
  E1: '3G',  E2: '3S',  E3: '3S',
};


// Match a spreadsheet column by any of the given names, ignoring case, spaces
// and punctuation — staff headings vary ("Pathways Goal", "pathway goal").
const normaliseHeader = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const pickGoal = (row, ...names) => {
  const wanted = names.map(normaliseHeader);
  const key = Object.keys(row).find((k) => wanted.includes(normaliseHeader(k)));
  return key ? String(row[key]).trim() : '';
};

// A score column, or null when the spreadsheet doesn't have it (so missing
// columns aren't shown as a score of 0).
const pickScore = (row, ...names) => {
  const raw = pickGoal(row, ...names);
  const n = parseFloat(raw);
  return raw === '' || Number.isNaN(n) ? null : n;
};

const getInitials = (name) =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
};

// ── Tooltip ──────────────────────────────────────────────────────────────────

const SupportTooltip = ({ x, y, metricName, level }) => {
  const supports = SUPPORTS[metricName]?.[SUPPORT_KEY[level.label]];
  if (!supports) return null;
  const left = Math.min(x + 14, window.innerWidth - 300);
  return (
    <div
      className="fixed z-50 bg-white border border-brand-line rounded-xl shadow-lg p-4 w-72 pointer-events-none"
      style={{ left, top: Math.max(8, y - 10) }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: level.color }} />
        <span className="font-display font-bold text-brand-ink text-sm capitalize">{metricName}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white ml-auto"
          style={{ backgroundColor: level.color }}>
          {level.label}
        </span>
      </div>
      <div className="text-xs text-brand-slate mb-3 pb-3 border-b border-brand-line">{level.band}, {level.full}</div>
      <div className="text-xs font-semibold text-brand-ink mb-2">Suggested supports</div>
      <ul className="space-y-1.5">
        {supports.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-snug">
            <span className="text-brand-sky mt-0.5 flex-shrink-0">•</span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ── MetricBar ─────────────────────────────────────────────────────────────────

const LABEL_COL = 'w-32 flex-shrink-0';

const BandHeaderRow = () => (
  <div className="flex items-stretch gap-5">
    <div className={LABEL_COL} />
    <div className="flex-1 flex gap-1">
      {BANDS.map((band) => (
        <div key={band.id} className="flex-1 flex flex-col">
          <div className="flex-1 flex items-end pb-1.5 border-b-2" style={{ borderColor: band.levels[1].color }}>
            <span className="font-display font-bold text-[12px] leading-tight text-brand-ink">{band.name}</span>
          </div>
          <span className="text-[11px] text-brand-slate mt-1">{band.range}</span>
        </div>
      ))}
    </div>
  </div>
);

const MetricBar = ({ metricName, metricLabel, value }) => {
  const [tooltip, setTooltip] = useState(null);
  const target = getGrowthTarget(value);
  const { level: currentLevel } = getBandAndLevel(value);
  const { level: targetLevel } = getBandAndLevel(target);

  const showTooltip = (e, lvl) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ x: rect.right, y: rect.top, level: lvl });
  };

  return (
    <div className="py-5 border-b border-brand-line last:border-b-0 last:pb-1">
      <div className="flex items-center gap-5">
        <div className={LABEL_COL}>
          <div className="font-display font-bold text-brand-ink text-[15px]">{metricLabel}</div>
          <div className="flex items-baseline gap-1.5 mt-1 text-xs">
            <span className="font-bold tabular-nums" style={{ color: currentLevel.color }}>{currentLevel.label}</span>
            <span className="text-brand-slate tabular-nums">{value.toFixed(1)}</span>
            <span className="text-brand-sky">→</span>
            <span className="font-bold tabular-nums" style={{ color: targetLevel.color }}>{targetLevel.label}</span>
            <span className="text-brand-slate tabular-nums">{target.toFixed(1)}</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="relative h-10">
            <div className="absolute inset-0 flex gap-1">
              {BANDS.map((band) => (
                <div key={band.id} className="flex-1 h-full rounded-md flex overflow-hidden"
                  style={{ backgroundColor: band.bgColor }}>
                  <div className="flex-1 border-r border-white" />
                  <div className="flex-1 border-r border-white" />
                  <div className="flex-1" />
                </div>
              ))}
            </div>

            <div className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full pointer-events-none"
              style={{
                left: `${(Math.min(value, target) / 10) * 100}%`,
                width: `${(Math.abs(target - value) / 10) * 100}%`,
                backgroundColor: currentLevel.color,
                opacity: 0.35,
              }} />

            <button
              type="button"
              aria-label={`${metricLabel} now: ${currentLevel.band}, ${currentLevel.full}`}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full ring-[3px] ring-white shadow-sm z-10 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-brand-blue"
              style={{ left: `${(value / 10) * 100}%`, backgroundColor: currentLevel.color }}
              onMouseEnter={(e) => showTooltip(e, currentLevel)}
              onMouseLeave={() => setTooltip(null)}
              onFocus={(e) => showTooltip(e, currentLevel)}
              onBlur={() => setTooltip(null)}
            />

            <button
              type="button"
              aria-label={`${metricLabel} target: ${targetLevel.band}, ${targetLevel.full}`}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white z-10 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
              style={{
                left: `${(target / 10) * 100}%`,
                border: `3px solid ${targetLevel.color}`,
              }}
              onMouseEnter={(e) => showTooltip(e, targetLevel)}
              onMouseLeave={() => setTooltip(null)}
              onFocus={(e) => showTooltip(e, targetLevel)}
              onBlur={() => setTooltip(null)}
            />
          </div>
        </div>
      </div>

      {tooltip && (
        <SupportTooltip x={tooltip.x} y={tooltip.y} metricName={metricName} level={tooltip.level} />
      )}
    </div>
  );
};

// ── Student notes (editable, persisted to Firestore separately) ───────────────

// Embedded copies (?embed=1) hide the Admin button, so a page that embeds the
// dashboard can't be used to upload over or clear the data.
const IS_EMBED = new URLSearchParams(window.location.search).get('embed') === '1';

const embedUrl = () =>
  `${window.location.origin}${import.meta.env.BASE_URL}${import.meta.env.BASE_URL.endsWith('/') ? '' : '/'}?embed=1`;

const embedSnippet = () =>
  `<iframe src="${embedUrl()}" title="Growth Plans" width="100%" height="900" loading="lazy" style="border:0;border-radius:12px"></iframe>`;

const EmbedCode = () => {
  const [copied, setCopied] = useState(false);
  const code = embedSnippet();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // clipboard API needs a secure context — fall back to selecting the text
      const el = document.getElementById('embed-code');
      if (el) { el.focus(); el.select(); document.execCommand('copy'); }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Code2 size={15} className="text-brand-blue" />
        <h3 className="font-semibold text-gray-800 text-sm">Embed on another page</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Paste this into a staff intranet or website page to show the dashboard there.
        The embedded copy hides the Admin button, so no one can upload or clear data from it.
      </p>
      <textarea
        id="embed-code"
        readOnly
        value={code}
        rows={3}
        onFocus={(e) => e.target.select()}
        className="w-full border border-gray-200 rounded-lg p-3 font-mono text-[11px] leading-relaxed text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none"
      />
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={copy}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors
            ${copied ? 'bg-green-600 text-white' : 'bg-brand-blue hover:bg-brand-ink text-white'}`}
        >
          {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
          {copied ? 'Copied' : 'Copy embed code'}
        </button>
        <a
          href={embedUrl()}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
        >
          Preview embedded view
        </a>
      </div>
      <p className="text-xs text-amber-600 mt-3 leading-relaxed">
        Only embed this on a page that is restricted to staff — it shows named student data.
      </p>
    </div>
  );
};

const emptyGoals = () => Object.fromEntries(GOAL_TYPES.map((g) => [g.key, '']));

// Goals from the spreadsheet upload, used until a teacher edits them here.
const goalsFromStudent = (student) =>
  Object.fromEntries(GOAL_TYPES.map((g) => [g.key, student[g.key] || '']));

const StudentGoals = ({ student }) => {
  const [goals, setGoals] = useState(emptyGoals);
  const [draft, setDraft] = useState(emptyGoals);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Remounted per student via `key`, so state starts clean on every selection.
  useEffect(() => {
    // Firestore goals take priority over the spreadsheet, field by field, so a
    // teacher's edit survives the next upload but blank edits don't hide it.
    getDoc(commentRef(student.name)).then((snap) => {
      const saved = snap.exists() ? snap.data() : {};
      setGoals(Object.fromEntries(
        GOAL_TYPES.map((g) => [g.key, saved[g.key] || student[g.key] || ''])
      ));
    }).catch(() => {
      setGoals(goalsFromStudent(student));
    }).finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.name]);

  const startEditing = () => {
    setDraft(goals);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      // merge so any unrelated fields on the document are left intact
      await setDoc(
        commentRef(student.name),
        { ...draft, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      setGoals(draft);
      setEditing(false);
    } catch {
      alert('Could not save goals. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <section className="bg-white rounded-2xl border border-brand-line">
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <h3 className="font-display font-bold text-brand-ink text-base">Goals</h3>
        {!editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:text-brand-ink px-3 py-1.5 rounded-lg hover:bg-brand-tint transition-colors"
          >
            <Pencil size={13} />
            {GOAL_TYPES.some((g) => goals[g.key]) ? 'Edit goals' : 'Add goals'}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 border-t border-brand-line md:divide-x divide-y md:divide-y-0 divide-brand-line">
        {GOAL_TYPES.map((g) => (
          <div key={g.key} className="px-6 py-5">
            <div className="font-semibold text-sm text-brand-blue mb-2">{g.label}</div>
            {editing ? (
              <textarea
                value={draft[g.key]}
                onChange={(e) => setDraft({ ...draft, [g.key]: e.target.value })}
                rows={6}
                placeholder={g.placeholder}
                className="w-full border border-brand-line rounded-lg p-3 text-sm text-brand-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none"
              />
            ) : (
              <p className={`text-sm leading-relaxed ${goals[g.key] ? 'text-brand-ink' : 'text-brand-slate/60 italic'}`}>
                {goals[g.key] || 'No goal set yet.'}
              </p>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-brand-line bg-brand-paper rounded-b-2xl">
          <button
            onClick={() => setEditing(false)}
            className="text-sm font-medium text-brand-slate hover:text-brand-ink border border-brand-line bg-white px-4 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="text-sm font-semibold text-white bg-brand-blue hover:bg-brand-ink px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save goals'}
          </button>
        </div>
      )}
    </section>
  );
};

// ── How to read (dropdown from the top bar) ───────────────────────────────────

const HowToRead = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors
          ${open ? 'bg-brand-tint text-brand-blue' : 'text-brand-slate hover:text-brand-ink hover:bg-brand-paper'}`}
      >
        <Info size={15} />
        How to read
        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <HowToReadPanel />
        </>
      )}
    </div>
  );
};

// The worked example used in the key: a student at 4.2 (D1) with a target of 5.2 (D2).
const EXAMPLE_NOW = 4.2;
const EXAMPLE_TARGET = 5.2;

const HowToReadPanel = () => {
  const now = getBandAndLevel(EXAMPLE_NOW).level;
  const target = getBandAndLevel(EXAMPLE_TARGET).level;
  const pct = (v) => `${v * 10}%`;

  return (
    <div className="absolute right-0 top-full mt-2 z-40 w-[min(720px,calc(100vw-32px))] bg-white border border-brand-line rounded-2xl shadow-lg">

      {/* 1. Reading a bar */}
      <div className="p-6">
        <h4 className="font-display font-bold text-brand-ink text-[15px]">Reading a bar</h4>
        <p className="text-sm text-brand-slate mt-1">
          Each bar runs from 0 to 10 across five School Excellence Framework bands.
        </p>

        <div className="mt-5">
          {/* callouts */}
          <div className="relative h-11 text-xs">
            <div className="absolute -translate-x-1/2 text-center" style={{ left: pct(EXAMPLE_NOW) }}>
              <div className="font-semibold text-brand-ink">Now</div>
              <div className="text-brand-slate">{now.label}</div>
            </div>
            <div className="absolute -translate-x-1/2 text-center" style={{ left: pct(EXAMPLE_TARGET) }}>
              <div className="font-semibold text-brand-ink">Target</div>
              <div className="text-brand-slate">{target.label}</div>
            </div>
          </div>

          {/* bar */}
          <div className="relative h-8">
            <div className="absolute inset-0 flex gap-1">
              {BANDS.map((band) => (
                <div key={band.id} className="flex-1 rounded" style={{ backgroundColor: band.bgColor }} />
              ))}
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
              style={{ left: pct(EXAMPLE_NOW), width: pct(EXAMPLE_TARGET - EXAMPLE_NOW), backgroundColor: now.color, opacity: 0.35 }} />
            <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full ring-[3px] ring-white"
              style={{ left: pct(EXAMPLE_NOW), backgroundColor: now.color }} />
            <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white"
              style={{ left: pct(EXAMPLE_TARGET), border: `3px solid ${target.color}` }} />
          </div>

          {/* band names */}
          <div className="flex gap-1 mt-2">
            {BANDS.map((band) => (
              <div key={band.id} className="flex-1 min-w-0">
                <div className="h-0.5 rounded-full mb-1.5" style={{ backgroundColor: band.levels[1].color }} />
                <div className="text-xs font-semibold text-brand-ink leading-tight">{band.name}</div>
                <div className="text-[11px] text-brand-slate mt-0.5">{band.range}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-brand-slate mt-5">
          The <strong className="text-brand-ink">filled circle</strong> is where the student is now.
          The <strong className="text-brand-ink">outlined circle</strong> is their target, one point higher.
          Hover over either circle to see suggested supports.
        </p>
      </div>

      {/* 2. Reading a code */}
      <div className="p-6 border-t border-brand-line bg-brand-paper rounded-b-2xl">
        <h4 className="font-display font-bold text-brand-ink text-[15px]">Reading a code</h4>
        <p className="text-sm text-brand-slate mt-1">Each band is split into three levels. A code is the band, then the level.</p>

        <div className="mt-5 grid sm:grid-cols-[auto_1fr_1fr] gap-x-10 gap-y-6 items-start">
          {/* worked example */}
          <div className="flex gap-1.5">
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-white border border-brand-line flex items-center justify-center font-display font-extrabold text-2xl" style={{ color: BANDS[2].levels[1].color }}>D</div>
              <div className="text-[11px] text-brand-slate mt-1.5">Band</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-white border border-brand-line flex items-center justify-center font-display font-extrabold text-2xl" style={{ color: BANDS[2].levels[1].color }}>2</div>
              <div className="text-[11px] text-brand-slate mt-1.5">Level</div>
            </div>
            <div className="self-start pl-2 pt-2 text-sm text-brand-ink leading-snug max-w-[9rem]">
              Delivering, Level 2 Growing
            </div>
          </div>

          {/* bands */}
          <dl className="text-sm grid grid-cols-[2.25rem_1fr] gap-y-1.5">
            {BANDS.map((band) => (
              <React.Fragment key={band.id}>
                <dt className="font-bold" style={{ color: band.levels[1].color }}>{band.abbr}</dt>
                <dd className="text-brand-ink">{band.name}</dd>
              </React.Fragment>
            ))}
          </dl>

          {/* levels */}
          <dl className="text-sm grid grid-cols-[1.5rem_1fr] gap-y-1.5">
            {LEVEL_NAMES.map((name, i) => (
              <React.Fragment key={name}>
                <dt className="font-bold text-brand-ink">{i + 1}</dt>
                <dd className="text-brand-ink">{name}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};

// A small tinted code chip, e.g. "R D3", coloured by SEF level.
const LevelChip = ({ abbr, value }) => {
  const { level } = getBandAndLevel(value);
  return (
    <span className="inline-flex items-center gap-1 text-[11px] leading-none font-semibold px-1.5 py-1 rounded"
      style={{ backgroundColor: `${level.color}14`, color: level.color }}
      title={`${level.band}, ${level.full}`}>
      <span className="opacity-70">{abbr}</span>{level.label}
    </span>
  );
};

const Avatar = ({ name, size = 'md' }) => {
  const cls = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-9 h-9 text-xs';
  return (
    <div className={`${cls} rounded-full bg-brand-tint text-brand-blue font-display font-bold flex items-center justify-center flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
};

// ── Cohort snapshot (shown before a student is picked) ───────────────────────

const CohortSnapshot = ({ data, uploadedAt }) => {
  const metrics = data.length ? metricsFor(data[0]) : [];
  return (
    <section className="bg-white rounded-2xl border border-brand-line p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="font-display font-bold text-2xl text-brand-ink">Cohort snapshot</h2>
        <DownloadButton students={data} primary
          label={`Download all reports (${data.length})`} busyLabel={`Preparing ${data.length} reports…`} />
      </div>
      <p className="text-sm text-brand-slate mt-1">
        {data.length} students{uploadedAt ? `, data uploaded ${new Date(uploadedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.
        Choose a student from the list to open their growth plan.
      </p>

      <div className="mt-8 space-y-6">
        {metrics.map((m) => {
          const counts = BANDS.map((b) => data.filter((s) => s[m.key] != null && getBandAndLevel(s[m.key]).band.id === b.id).length);
          const total = counts.reduce((a, b) => a + b, 0) || 1;
          return (
            <div key={m.key} className="flex items-center gap-5">
              <div className="w-28 flex-shrink-0 font-display font-bold text-brand-ink text-[15px]">{m.label}</div>
              <div className="flex-1 flex h-9 rounded-md overflow-hidden gap-0.5">
                {BANDS.map((b, i) => counts[i] > 0 && (
                  <div key={b.id}
                    className="h-full flex items-center justify-center text-xs font-semibold text-white min-w-[28px]"
                    style={{ width: `${(counts[i] / total) * 100}%`, backgroundColor: b.levels[1].color }}
                    title={`${b.name}: ${counts[i]} students`}>
                    {counts[i]}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 pl-[8.25rem] text-xs text-brand-slate">
        {BANDS.map((b) => (
          <span key={b.id} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: b.levels[1].color }} />
            {b.name}
          </span>
        ))}
      </div>
    </section>
  );
};

// ── Parent report PDFs ────────────────────────────────────────────────────────

// Builds the PDF for one or more students. Goals edited in the app (stored in
// studentComments) win over the spreadsheet, the same as on screen.
const downloadParentReports = async (students) => {
  const [{ downloadReports }, snap] = await Promise.all([
    import('./StudentReport.jsx'),
    getDocs(collection(db, 'studentComments')).catch(() => null),
  ]);
  const saved = {};
  snap?.forEach((d) => { saved[d.id] = d.data(); });
  const goalsFor = (st) => {
    const sv = saved[commentId(st.name)] || {};
    return Object.fromEntries(GOAL_TYPES.map((g) => [g.key, sv[g.key] || st[g.key] || '']));
  };
  await downloadReports({
    students,
    goalsFor,
    logoSrc: `${window.location.origin}${import.meta.env.BASE_URL}logo.png`,
  });
};

const DownloadButton = ({ students, label, busyLabel, primary = false }) => {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await downloadParentReports(students);
    } catch (err) {
      console.error(err);
      alert('The report could not be created. Refresh the page and try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={run}
      disabled={busy}
      className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-wait
        ${primary
          ? 'bg-brand-blue hover:bg-brand-ink text-white'
          : 'bg-white border border-brand-line text-brand-blue hover:border-brand-blue'}`}
    >
      <Download size={15} />
      {busy ? busyLabel : label}
    </button>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const StudentDataViz = () => {
  const [data, setData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploadedAt, setUploadedAt] = useState(null);
  const [view, setView] = useState('loading'); // 'loading' | 'search' | 'student'
  const [adminOpen, setAdminOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Load from Firestore on mount
  useEffect(() => {
    getDoc(FS_DOC).then((snap) => {
      if (snap.exists()) {
        const { data, fileName, uploadedAt } = snap.data();
        setData(data);
        setFileName(fileName);
        setUploadedAt(uploadedAt);
      }
    }).catch(() => {
      // network error — proceed with empty state
    }).finally(() => {
      setView('search');
    });
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const processed = jsonData.map((row) => ({
          name: row.Name || row.name || row.Student || 'Unknown',
          reading: pickScore(row, 'Reading'),
          writing: pickScore(row, 'Writing'),
          literacy: pickScore(row, 'Literacy'), // older single-score spreadsheets
          // Blank cells stay blank (and the bar is hidden) rather than showing as 0.
          numeracy: pickScore(row, 'Numeracy'),
          attendance: pickScore(row, 'Attendance'),
          literacyGoal: pickGoal(row, 'Literacy Goal'),
          numeracyGoal: pickGoal(row, 'Numeracy Goal', 'NumeracyGoal'),
          careerGoal: pickGoal(row, 'Pathways Goal', 'Pathway Goal', 'Pathways', 'Career Goal', 'Career/Pathway Goal'),
        }));

        const at = new Date().toISOString();
        await setDoc(FS_DOC, { data: processed, fileName: file.name, uploadedAt: at });
        setData(processed);
        setFileName(file.name);
        setUploadedAt(at);
        setSearchQuery('');
        setAdminOpen(false);
        setView('search');
      } catch {
        alert('Error reading file. Please ensure it has columns: Name, Reading, Writing, Numeracy, Attendance, Literacy Goal, Numeracy Goal, Pathways Goal');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const clearData = async () => {
    await deleteDoc(FS_DOC);
    setData(null);
    setFileName('');
    setUploadedAt(null);
    setSearchQuery('');
    setSelectedStudent(null);
    setConfirmClear(false);
  };

  const filteredStudents = data
    ? data.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const searchRef = useRef(null);

  if (view === 'loading') return null;

  return (
    <div className="min-h-screen bg-brand-paper text-brand-ink">

      {/* ── Admin slide-over panel ── */}
      {adminOpen && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-brand-ink/40"
            onClick={() => setAdminOpen(false)}
          />
          {/* Panel */}
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center">
                  <Shield size={16} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Growth Plans — Admin</h2>
              </div>
              <button
                onClick={() => setAdminOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 px-8 py-6 space-y-5">
              {/* Status */}
              {data ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-green-900 text-sm">Data active</div>
                      <div className="text-green-700 text-xs mt-0.5 flex items-center gap-1">
                        <FileSpreadsheet size={11} />
                        {fileName}
                      </div>
                      <div className="text-green-600 text-xs mt-0.5">
                        {data.length} students · {formatDate(uploadedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center gap-2">
                  <Info size={15} className="flex-shrink-0" />
                  No data loaded. Upload a spreadsheet to activate the dashboard.
                </div>
              )}

              {/* Upload */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-800 mb-1 text-sm">
                  {data ? 'Replace current data' : 'Upload student data'}
                </h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Excel (.xlsx / .xls / .csv) with columns:{' '}
                  <strong className="text-gray-700">Name</strong>,{' '}
                  <strong className="text-gray-700">Reading</strong>,{' '}
                  <strong className="text-gray-700">Writing</strong>,{' '}
                  <strong className="text-gray-700">Numeracy</strong>,{' '}
                  <strong className="text-gray-700">Attendance</strong> (scores 0–10), plus{' '}
                  <strong className="text-gray-700">Literacy Goal</strong>,{' '}
                  <strong className="text-gray-700">Numeracy Goal</strong> and{' '}
                  <strong className="text-gray-700">Pathways Goal</strong>.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="inline-block cursor-pointer">
                    <div className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors select-none text-white
                      ${uploading ? 'bg-blue-400 cursor-wait' : 'bg-brand-blue hover:bg-brand-ink'}`}>
                      <Upload size={15} />
                      {uploading ? 'Processing…' : data ? 'Upload new spreadsheet' : 'Choose spreadsheet'}
                    </div>
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                  </label>

                  <a
                    href={`${import.meta.env.BASE_URL}student-data-template.xlsx`}
                    download="Growth-Plans-Template.xlsx"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    <FileSpreadsheet size={15} />
                    Download template
                  </a>
                </div>
                {data && (
                  <p className="text-xs text-gray-400 mt-2">New file immediately replaces current data.</p>
                )}
              </div>

              {/* Embed */}
              <EmbedCode />

              {/* Clear */}
              {data && (
                <div className="border border-red-100 rounded-xl p-4">
                  <div className="text-sm font-semibold text-gray-700 mb-1">Remove all data</div>
                  <p className="text-xs text-gray-400 mb-3">Clears the dashboard. Teachers will see an empty state until new data is uploaded.</p>
                  {!confirmClear ? (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
                    >
                      <Trash2 size={13} />
                      Clear all data
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={clearData}
                        className="text-sm font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors">
                        Yes, clear
                      </button>
                      <button onClick={() => setConfirmClear(false)}
                        className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-white border-b-2 border-brand-red sticky top-0 z-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Sarah Redfern High School" className="h-11 w-auto" />
            <div className="min-w-0">
              <h1 className="font-display font-extrabold text-lg text-brand-ink leading-tight">Growth Plans</h1>
              <p className="text-xs text-brand-slate truncate">Sarah Redfern High School</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <HowToRead />
            {!IS_EMBED && (
              <button
                onClick={() => { setConfirmClear(false); setAdminOpen(true); }}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-slate hover:text-brand-ink hover:bg-brand-paper px-3 py-2 rounded-lg transition-colors"
              >
                <Shield size={15} />
                Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      {!data ? (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16">
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-brand-line p-12 text-center">
            <div className="w-12 h-12 bg-brand-tint rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={22} className="text-brand-blue" />
            </div>
            <p className="font-display font-bold text-brand-ink mb-1">No student data yet</p>
            <p className="text-sm text-brand-slate">An administrator needs to upload the growth plan spreadsheet.</p>
          </div>
        </div>
      ) : (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-6 lg:items-start">

          {/* Student list */}
          <aside className={`${selectedStudent ? 'hidden lg:flex' : 'flex'} flex-col bg-white rounded-2xl border border-brand-line lg:sticky lg:top-[96px] lg:max-h-[calc(100vh-120px)]`}>
            <div className="p-3 border-b border-brand-line">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-slate pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search students"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-brand-paper text-sm text-brand-ink placeholder-brand-slate/70 border border-transparent focus:outline-none focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-slate hover:text-brand-ink">
                    <X size={15} />
                  </button>
                )}
              </div>
              <div className="text-xs text-brand-slate mt-2.5 px-1">
                {searchQuery ? `${filteredStudents.length} of ${data.length} students` : `${data.length} students`}
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-brand-slate p-6 text-center">No students match &ldquo;{searchQuery}&rdquo;.</p>
              ) : filteredStudents.map((student, idx) => {
                const active = selectedStudent?.name === student.name;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedStudent(student)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors
                      ${active ? 'bg-brand-tint' : 'hover:bg-brand-paper'}`}
                  >
                    <Avatar name={student.name} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${active ? 'font-bold text-brand-blue' : 'font-semibold text-brand-ink'}`}>{student.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {metricsFor(student).map((m) => (
                          <LevelChip key={m.key} abbr={m.abbr} value={student[m.key]} />
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Detail */}
          <main className={`${selectedStudent ? 'flex' : 'hidden lg:flex'} flex-col gap-5 min-w-0`}>
            {!selectedStudent ? (
              <CohortSnapshot data={data} uploadedAt={uploadedAt} />
            ) : (
              <>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="lg:hidden flex items-center gap-2 text-brand-blue font-medium text-sm"
                >
                  <ArrowLeft size={16} />
                  All students
                </button>

                {/* Student header + level summary */}
                <section className="bg-white rounded-2xl border border-brand-line p-6 flex flex-col xl:flex-row xl:items-center gap-6">
                  <div className="flex items-center gap-4 xl:w-72 flex-shrink-0">
                    <Avatar name={selectedStudent.name} size="lg" />
                    <div className="min-w-0">
                      <h2 className="font-display font-extrabold text-2xl text-brand-ink leading-tight">{selectedStudent.name}</h2>
                      <div className="mt-2">
                        <DownloadButton students={[selectedStudent]} label="Parent report" busyLabel="Preparing…" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 sm:divide-x divide-brand-line gap-y-4">
                    {metricsFor(selectedStudent).map((m) => {
                      const { level } = getBandAndLevel(selectedStudent[m.key]);
                      return (
                        <div key={m.key} className="sm:px-5 first:pl-0">
                          <div className="text-xs text-brand-slate">{m.label}</div>
                          <div className="font-display font-extrabold text-2xl leading-tight mt-1" style={{ color: level.color }}>{level.label}</div>
                          <div className="text-xs text-brand-slate leading-snug mt-0.5">{level.band}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Progress bars */}
                <section className="bg-white rounded-2xl border border-brand-line p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <h3 className="font-display font-bold text-brand-ink text-base">Progress and next target</h3>
                    <div className="flex items-center gap-4 text-xs text-brand-slate">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-brand-slate" />Now</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-brand-slate" />Target (+1)</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto -mx-3 px-3">
                    <div className="min-w-[520px]">
                      <BandHeaderRow />
                      <div className="mt-2">
                        {metricsFor(selectedStudent).map((m) => (
                          <MetricBar key={m.key} metricName={m.key} metricLabel={m.label} value={selectedStudent[m.key]} />
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <StudentGoals key={selectedStudent.name} student={selectedStudent} />
              </>
            )}
          </main>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@700;800&display=swap');
        body { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; background: #F4F7FB; }
      `}</style>
    </div>
  );
};

export default StudentDataViz;
