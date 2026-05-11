import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Search, ArrowLeft, ChevronRight,
  Users, Info, Shield, CheckCircle, Trash2, X, Pencil, MessageSquare,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, collection } from 'firebase/firestore';

const FS_DOC = doc(db, 'dashboard', 'current');
const commentRef = (name) => doc(collection(db, 'studentComments'), name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));

const SUPPORTS = {
  literacy: {
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
      'Writing for purpose linked to reading texts',
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

const BANDS = [
  {
    id: 1, name: 'Band 1', range: '0–3.9',
    levels: [
      { name: 'Developing', color: '#D32F2F', label: '1D' },
      { name: 'Growing',    color: '#E57373', label: '1G' },
      { name: 'Sustaining', color: '#EF9A9A', label: '1S' },
    ],
    bgColor: '#FFEBEE', min: 0, max: 4,
  },
  {
    id: 2, name: 'Band 2', range: '4–6.9',
    levels: [
      { name: 'Developing', color: '#F57C00', label: '2D' },
      { name: 'Growing',    color: '#FFB74D', label: '2G' },
      { name: 'Sustaining', color: '#FFD54F', label: '2S' },
    ],
    bgColor: '#FFF3E0', min: 4, max: 7,
  },
  {
    id: 3, name: 'Band 3', range: '7–10',
    levels: [
      { name: 'Developing', color: '#388E3C', label: '3D' },
      { name: 'Growing',    color: '#66BB6A', label: '3G' },
      { name: 'Sustaining', color: '#81C784', label: '3S' },
    ],
    bgColor: '#E8F5E9', min: 7, max: 10,
  },
];

const getBandAndLevel = (value) => {
  const band = value < 4 ? BANDS[0] : value < 7 ? BANDS[1] : BANDS[2];
  const pos = ((value - band.min) / (band.max - band.min)) * 100;
  const level = pos < 33.33 ? band.levels[0] : pos < 66.67 ? band.levels[1] : band.levels[2];
  return { band, level };
};

const getGrowthTarget = (value) => Math.min(10, value + 1);

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
  const supports = SUPPORTS[metricName]?.[level.label];
  if (!supports) return null;
  const left = Math.min(x + 14, window.innerWidth - 300);
  return (
    <div
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-2xl p-4 w-72 pointer-events-none"
      style={{ left, top: Math.max(8, y - 10) }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: level.color }} />
        <span className="font-bold text-gray-800 text-sm capitalize">{metricName}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white ml-auto"
          style={{ backgroundColor: level.color }}>
          {level.label}
        </span>
      </div>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Suggested Supports</div>
      <ul className="space-y-1.5">
        {supports.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-snug">
            <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ── MetricBar ─────────────────────────────────────────────────────────────────

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
    <div className="mb-7 last:mb-0">
      <div className="flex items-center gap-4">
        <div className="w-32 flex-shrink-0">
          <div className="font-semibold text-gray-700 text-sm">{metricLabel}</div>
          <div className="text-xs text-gray-500 mt-0.5">{value.toFixed(1)} → {target.toFixed(1)}</div>
          <div className="text-xs font-bold mt-0.5" style={{ color: currentLevel.color }}>
            {currentLevel.label} → {targetLevel.label}
          </div>
        </div>

        <div className="flex-1 relative h-12">
          <div className="absolute inset-0 flex">
            {BANDS.map((band) => {
              const pct = ((band.max - band.min) / 10) * 100;
              return (
                <div key={band.id} className="relative h-full border-r border-gray-300 last:border-r-0"
                  style={{ width: `${pct}%`, backgroundColor: band.bgColor }}>
                  <div className="absolute inset-0 flex pointer-events-none">
                    <div className="flex-1 border-r border-gray-200/70" />
                    <div className="flex-1 border-r border-gray-200/70" />
                    <div className="flex-1" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute top-1/2 -translate-y-1/2 h-0.5 opacity-25 z-0 pointer-events-none"
            style={{
              left: `${(Math.min(value, target) / 10) * 100}%`,
              width: `${(Math.abs(target - value) / 10) * 100}%`,
              backgroundColor: currentLevel.color,
            }} />

          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full border-2 border-white shadow-md z-10 cursor-pointer transition-transform hover:scale-125"
            style={{ left: `${(value / 10) * 100}%`, backgroundColor: currentLevel.color }}
            onMouseEnter={(e) => showTooltip(e, currentLevel)}
            onMouseLeave={() => setTooltip(null)}
          />

          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white shadow-md z-10 cursor-pointer transition-transform hover:scale-125"
            style={{
              left: `${(target / 10) * 100}%`,
              borderColor: targetLevel.color, borderWidth: '3px', borderStyle: 'solid',
            }}
            onMouseEnter={(e) => showTooltip(e, targetLevel)}
            onMouseLeave={() => setTooltip(null)}
          />
        </div>
      </div>

      <div className="ml-36 flex justify-between text-xs text-gray-400 pr-0.5 mt-1">
        <span>0</span><span>4</span><span>7</span><span>10</span>
      </div>

      {tooltip && (
        <SupportTooltip x={tooltip.x} y={tooltip.y} metricName={metricName} level={tooltip.level} />
      )}
    </div>
  );
};

// ── Student notes (editable, persisted to Firestore separately) ───────────────

const StudentNotes = ({ student }) => {
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Firestore comment takes priority over spreadsheet comment
    getDoc(commentRef(student.name)).then((snap) => {
      if (snap.exists()) {
        setText(snap.data().text);
      } else {
        setText(student.comment || '');
      }
    }).catch(() => {
      setText(student.comment || '');
    }).finally(() => setLoaded(true));
  }, [student.name]);

  const save = async () => {
    setSaving(true);
    await setDoc(commentRef(student.name), { text, updatedAt: new Date().toISOString() });
    setSaving(false);
    setEditing(false);
  };

  if (!loaded) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-blue-500" />
          <span className="font-semibold text-gray-800 text-sm">Notes</span>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Pencil size={12} />
            {text ? 'Edit' : 'Add note'}
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Add a note about this student…"
            className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={save}
              disabled={saving}
              className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-gray-400 hover:text-gray-600 border border-gray-200 px-4 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className={`text-sm leading-relaxed ${text ? 'text-gray-700' : 'text-gray-300 italic'}`}>
          {text || 'No notes yet.'}
        </p>
      )}
    </div>
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
          literacy: parseFloat(row.Literacy || row.literacy || 0),
          numeracy: parseFloat(row.Numeracy || row.numeracy || 0),
          attendance: parseFloat(row.Attendance || row.attendance || 0),
          comment: String(row.Comments || row.comments || row.Comment || row.comment || '').trim(),
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
        alert('Error reading file. Please ensure it has columns: Name, Literacy, Numeracy, Attendance');
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
    <div className="min-h-screen bg-gray-50">

      {/* ── Admin slide-over panel ── */}
      {adminOpen && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={() => setAdminOpen(false)}
          />
          {/* Panel */}
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
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
                  <strong className="text-gray-700">Literacy</strong>,{' '}
                  <strong className="text-gray-700">Numeracy</strong>,{' '}
                  <strong className="text-gray-700">Attendance</strong>.
                  All scores 0–10.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="inline-block cursor-pointer">
                    <div className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors select-none text-white
                      ${uploading ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}>
                      <Upload size={15} />
                      {uploading ? 'Processing…' : data ? 'Upload new spreadsheet' : 'Choose spreadsheet'}
                    </div>
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                  </label>

                  <a
                    href="/student-data-template.xlsx"
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
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Sarah Redfern High School" className="h-12 w-auto" />
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">Growth Plans</h1>
              <p className="text-xs text-gray-400">Literacy · Numeracy · Attendance</p>
            </div>
          </div>
          <button
            onClick={() => { setConfirmClear(false); setAdminOpen(true); }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 border border-gray-200 hover:border-blue-200 px-3 py-1.5 rounded-full transition-all"
          >
            <Shield size={12} />
            Admin
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* ── Search / home view ── */}
        {view === 'search' && (
          <>
            {/* Search bar */}
            <div className="relative mb-6">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search for a student…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 border border-gray-200 rounded-xl bg-white text-gray-800 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Student list */}
            {!data ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={22} className="text-gray-400" />
                </div>
                <p className="font-semibold text-gray-700 mb-1">No data loaded</p>
                <p className="text-sm text-gray-400">
                  Contact your administrator to upload student data.
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-sm">No students match &ldquo;{searchQuery}&rdquo;</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {!searchQuery && (
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <Users size={13} className="text-gray-300" />
                    <span className="text-xs text-gray-400">{data.length} students</span>
                  </div>
                )}
                <div className="divide-y divide-gray-50">
                  {filteredStudents.map((student, idx) => {
                    const { level: litL } = getBandAndLevel(student.literacy);
                    const { level: numL } = getBandAndLevel(student.numeracy);
                    const { level: attL } = getBandAndLevel(student.attendance);
                    return (
                      <button
                        key={idx}
                        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-blue-50/60 transition-colors text-left group"
                        onClick={() => { setSelectedStudent(student); setView('student'); }}
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 font-bold text-xs">{getInitials(student.name)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 text-sm truncate">{student.name}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {[{ abbr: 'L', level: litL }, { abbr: 'N', level: numL }, { abbr: 'A', level: attL }].map(({ abbr, level }) => (
                              <span key={abbr} className="text-xs px-1.5 py-0.5 rounded font-semibold text-white"
                                style={{ backgroundColor: level.color }}>
                                {abbr}: {level.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ChevronRight size={15} className="text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Student view ── */}
        {view === 'student' && selectedStudent && (
          <>
            <button
              onClick={() => { setView('search'); setSelectedStudent(null); }}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-6 text-sm transition-colors"
            >
              <ArrowLeft size={16} />
              Back to search
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-5">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-bold">{getInitials(selectedStudent.name)}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedStudent.name}</h2>
                  <p className="text-sm text-gray-400">Performance overview</p>
                </div>
              </div>

              <div className="flex items-end gap-4 mb-4 pb-3 border-b border-gray-200">
                <div className="w-32 flex-shrink-0" />
                <div className="flex-1 flex">
                  {BANDS.map((band) => {
                    const pct = ((band.max - band.min) / 10) * 100;
                    return (
                      <div key={band.id} className="text-center px-1" style={{ width: `${pct}%` }}>
                        <div className="font-bold text-xs text-gray-700 py-1 px-2 bg-gray-50 rounded border border-gray-200">
                          {band.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{band.range}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <MetricBar metricName="literacy"   metricLabel="Literacy"   value={selectedStudent.literacy} />
              <MetricBar metricName="numeracy"   metricLabel="Numeracy"   value={selectedStudent.numeracy} />
              <MetricBar metricName="attendance" metricLabel="Attendance" value={selectedStudent.attendance} />
            </div>

            <StudentNotes student={selectedStudent} />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-5">
              <div className="flex items-start gap-2 mb-5">
                <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-500">
                  <strong className="text-gray-700">How to read:</strong> Filled circles = current. Outlined = growth target (+1 point). Hover a dot for suggested supports.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                {BANDS.map((band) => (
                  <div key={band.id}>
                    <div className="font-bold text-xs text-gray-700 mb-2">
                      {band.name} <span className="text-gray-400 font-normal">({band.range})</span>
                    </div>
                    {band.levels.map((level) => (
                      <div key={level.label} className="flex items-center gap-2 mb-1.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: level.color }} />
                        <span className="text-xs font-bold text-gray-600">{level.label}</span>
                        <span className="text-xs text-gray-400">{level.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700;800&display=swap');
        body { font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>
    </div>
  );
};

export default StudentDataViz;
