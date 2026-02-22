import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Edit, Trash2, Archive, AlertCircle, Info, RefreshCw } from 'lucide-react';
import RuleEditorModal from './RuleEditorModal';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Rule {
  id         : string;
  name       : string;
  sourceDocument: string;
  severity   : 'High' | 'Medium' | 'Low';
  status     : 'Active' | 'Stale';
  logicType  : 'SQL' | 'JSON';
  logic      : string;
  violationCount: number;
  lastModifiedBy: string;
  lastModified  : string;
  articleRef    : string;
  version       : number;
  obligationType: string;
}

interface AuditEntry {
  id         : number;
  timestamp  : string;
  actor      : string | null;
  event_type : string;
  entity_type: string | null;   // ← ADD THIS
  entity_id  : string | null;
  detail     : Record<string, string> | null;
}

interface PolicyLibraryProps {
  isAdmin: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
  High  : 'text-rose-400 bg-rose-500/20 border-rose-500/50',
  Medium: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50',
  Low   : 'text-cyan-400 bg-cyan-500/20 border-cyan-500/50',
};

const ACTION_STYLES: Record<string, string> = {
  RULE_APPROVED  : 'bg-cyan-500/20 text-cyan-400',
  RULE_CREATED   : 'bg-green-500/20 text-green-400',
  RULE_UPDATED   : 'bg-yellow-500/20 text-yellow-400',
  RULE_DEPRECATED: 'bg-gray-500/20 text-gray-400',
  RULE_DELETED   : 'bg-red-500/20 text-red-400',
};

// Maps backend rule fields → UI Rule shape
function mapRule(r: Record<string, unknown>): Rule {
  const conditions = (r.violation_conditions as {severity?: string}[] | null) ?? [];
  const severityOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const maxSev = conditions.reduce((acc, c) =>
          (severityOrder[c.severity ?? ''] ?? 0) > (severityOrder[acc] ?? 0) ? (c.severity ?? 'LOW') : acc,
      'LOW'
  );
  const uiSeverity = maxSev === 'CRITICAL' || maxSev === 'HIGH' ? 'High'
      : maxSev === 'MEDIUM' ? 'Medium' : 'Low';

  return {
    id            : r.rule_id as string,
    name          : (r.rule_text as string).slice(0, 80),
    sourceDocument: r.source_doc as string,
    severity      : uiSeverity,
    status        : (r.status as string) === 'ACTIVE' ? 'Active' : 'Stale',
    logicType     : conditions[0]?.['check_type' as keyof typeof conditions[0]] === 'json' ? 'JSON' : 'SQL',
    logic         : r.rule_text as string,
    violationCount: (r.violation_count as number) ?? 0,
    lastModifiedBy: 'system',
    lastModified  : (r.effective_date as string) ?? '',
    articleRef    : r.article_ref as string,
    version       : r.version as number,
    obligationType: r.obligation_type as string,
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PolicyLibrary({ isAdmin }: PolicyLibraryProps) {
  const [activeSubTab, setActiveSubTab]     = useState<'active' | 'stale' | 'audit'>('active');
  const [rules, setRules]                   = useState<Rule[]>([]);
  const [loading, setLoading]               = useState(true);
  const [searchTerm, setSearchTerm]         = useState('');
  const [sourceFilter, setSourceFilter]     = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter]     = useState('all');
  const [selectedRule, setSelectedRule]     = useState<Rule | null>(null);
  const [isEditorOpen, setIsEditorOpen]     = useState(false);
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [archivingId, setArchivingId]       = useState<string | null>(null);

  // ── Fetch rules ───────────────────────────────────────────────────────
  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch ACTIVE + DEPRECATED in parallel
      const [activeRes, draftRes, deprecatedRes] = await Promise.all([
        fetch(`${API_BASE}/policies/rules?status=ACTIVE`),
        fetch(`${API_BASE}/policies/rules?status=DRAFT`),
        fetch(`${API_BASE}/policies/rules?status=DEPRECATED`),
      ]);
      const active     = activeRes.ok     ? await activeRes.json()     : [];
      const draft      = draftRes.ok      ? await draftRes.json()      : [];
      const deprecated = deprecatedRes.ok ? await deprecatedRes.json() : [];

      setRules([...active, ...draft, ...deprecated].map(mapRule));
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  // ── Filtered rules ────────────────────────────────────────────────────
  const filteredRules = rules.filter(rule => {
    const matchesSearch   = rule.id.toLowerCase().includes(searchTerm.toLowerCase())
        || rule.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource   = sourceFilter === 'all' || rule.sourceDocument === sourceFilter;
    const matchesSeverity = severityFilter === 'all' || rule.severity === severityFilter;
    const matchesStatus   = statusFilter === 'all' || rule.status === statusFilter;
    const matchesTab      = activeSubTab === 'active' ? rule.status === 'Active'
        : activeSubTab === 'stale'  ? rule.status === 'Stale'
            : true;
    return matchesSearch && matchesSource && matchesSeverity && matchesStatus && matchesTab;
  });

  const uniqueSources = ['all', ...Array.from(new Set(rules.map(r => r.sourceDocument)))];

  // ── Actions ───────────────────────────────────────────────────────────
  const handleArchive = async (rule: Rule) => {
    setArchivingId(rule.id);
    try {
      // DEPRECATED = stale in backend terms
      await fetch(`${API_BASE}/policies/rules/${rule.id}/deprecate`, { method: 'PATCH' });
      await fetchRules();
    } finally {
      setArchivingId(null);
    }
  };

  const handleDelete = async (rule: Rule) => {
    if (!confirm(`Delete rule ${rule.id}? This cannot be undone.`)) return;
    setDeletingId(rule.id);
    try {
      await fetch(`${API_BASE}/policies/rules/${rule.id}`, { method: 'DELETE' });
      await fetchRules();
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditRule = (rule: Rule) => {
    setSelectedRule(rule);
    setIsEditorOpen(true);
  };

  const handleRuleSaved = async () => {
    setIsEditorOpen(false);
    setSelectedRule(null);
    await fetchRules();
  };

  // ── Export CSV ────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['Rule_ID', 'Rule_Name', 'Source_PDF', 'Logic_Type', 'Severity', 'Violation_Count', 'Status'];
    const rows    = filteredRules.map(r => [
      r.id, `"${r.name}"`, r.sourceDocument, r.logicType, r.severity, r.violationCount, r.status,
    ]);
    const csv  = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `policy-library-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
      <>
        <div className="p-8">
          {/* Header + Sub-tabs */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">Policy Library</h2>
              <div className="flex gap-2">
                {(['active', 'stale', 'audit'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveSubTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                            activeSubTab === tab
                                ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/50'
                                : 'text-gray-400 hover:text-gray-200 bg-white/5'
                        }`}
                    >
                      {tab === 'active' ? 'Active Rules' : tab === 'stale' ? 'Stale Rules' : 'Audit Log'}
                    </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchRules} className="p-2 text-gray-500 hover:text-cyan-400 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {activeSubTab !== 'audit' && (
                  <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-semibold">
                {filteredRules.length} Rules
              </span>
              )}
            </div>
          </div>

          {activeSubTab === 'audit' ? (
              <AuditLog />
          ) : (
              <>
                {/* Filter Bar */}
                <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                          type="text"
                          placeholder="Search by Rule ID or Name..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50"
                      />
                    </div>

                    <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                            className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50">
                      {uniqueSources.map(s => (
                          <option key={s} value={s} className="bg-[#0a0a0a]">
                            {s === 'all' ? 'All Documents' : s}
                          </option>
                      ))}
                    </select>

                    <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
                            className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50">
                      <option value="all"   className="bg-[#0a0a0a]">All Severities</option>
                      <option value="High"  className="bg-[#0a0a0a]">High</option>
                      <option value="Medium"className="bg-[#0a0a0a]">Medium</option>
                      <option value="Low"   className="bg-[#0a0a0a]">Low</option>
                    </select>

                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50">
                      <option value="all"   className="bg-[#0a0a0a]">All Status</option>
                      <option value="Active"className="bg-[#0a0a0a]">Active</option>
                      <option value="Stale" className="bg-[#0a0a0a]">Stale</option>
                    </select>

                    <button onClick={handleExportCSV}
                            className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-all flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                      <Download className="w-4 h-4" /> Export CSV
                    </button>
                  </div>
                </div>

                {/* Rules Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Loading rules...
                    </div>
                ) : (
                    <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-black/40 border-b border-white/10">
                        <tr>
                          {['Rule ID', 'Name', 'Source', 'Severity', 'Type', 'Violations', 'Actions'].map(h => (
                              <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                {h}
                              </th>
                          ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                        {filteredRules.map(rule => (
                            <tr key={rule.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-mono text-cyan-400 text-sm">{rule.id}</span>
                              </td>
                              <td className="px-6 py-4 max-w-xs">
                                <div className="text-sm text-white font-medium truncate">{rule.name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {rule.articleRef && <span className="font-mono">{rule.articleRef} · </span>}
                                  v{rule.version}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-300 max-w-[160px] truncate" title={rule.sourceDocument}>
                                  {rule.sourceDocument}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${SEVERITY_STYLES[rule.severity]}`}>
                            {rule.severity}
                          </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-mono text-sm text-gray-300">{rule.logicType}</span>
                              </td>
                              <td className="px-6 py-4">
                          <span className={`text-sm font-semibold ${rule.violationCount > 0 ? 'text-rose-400' : 'text-white'}`}>
                            {rule.violationCount}
                          </span>
                              </td>
                              <td className="px-6 py-4">
                                <ActionButtons
                                    rule={rule}
                                    isAdmin={isAdmin}
                                    isArchiving={archivingId === rule.id}
                                    isDeleting={deletingId === rule.id}
                                    onEdit={handleEditRule}
                                    onArchive={handleArchive}
                                    onDelete={handleDelete}
                                />
                              </td>
                            </tr>
                        ))}
                        </tbody>
                      </table>

                      {filteredRules.length === 0 && (
                          <div className="text-center py-12">
                            <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">No rules match the current filters</p>
                          </div>
                      )}
                    </div>
                )}
              </>
          )}
        </div>

        <RuleEditorModal
            isOpen={isEditorOpen}
            rule={selectedRule}
            onClose={() => { setIsEditorOpen(false); setSelectedRule(null); }}
            onSaved={handleRuleSaved}
            isAdmin={isAdmin}
        />
      </>
  );
}

// ── Action Buttons ────────────────────────────────────────────────────────────

function ActionButtons({ rule, isAdmin, isArchiving, isDeleting, onEdit, onArchive, onDelete }: {
  rule: Rule;
  isAdmin: boolean;
  isArchiving: boolean;
  isDeleting: boolean;
  onEdit: (r: Rule) => void;
  onArchive: (r: Rule) => void;
  onDelete: (r: Rule) => void;
}) {
  if (!isAdmin) {
    return (
        <span className="text-xs text-gray-600 italic">View only</span>
    );
  }

  return (
      <div className="flex items-center gap-1">
        <button onClick={() => onEdit(rule)}
                className="p-2 hover:bg-cyan-400/10 text-cyan-400 rounded-lg transition-all" title="Edit">
          <Edit className="w-4 h-4" />
        </button>
        <button onClick={() => onArchive(rule)} disabled={isArchiving || rule.status === 'Stale'}
                className="p-2 hover:bg-yellow-400/10 text-yellow-400 rounded-lg transition-all disabled:opacity-30" title="Mark Stale">
          {isArchiving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
        </button>
        <button onClick={() => onDelete(rule)} disabled={isDeleting}
                className="p-2 hover:bg-rose-400/10 text-rose-400 rounded-lg transition-all disabled:opacity-30" title="Delete">
          {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

function AuditLog() {
  const [entries, setEntries]         = useState<AuditEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [entityFilter, setEntityFilter] = useState('rule');
  const [eventFilter, setEventFilter] = useState('all');
  const [limitFilter, setLimitFilter] = useState(50);

  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter !== 'all') params.set('entity_type', entityFilter);
      if (eventFilter  !== 'all') params.set('event_type',  eventFilter);
      params.set('limit', String(limitFilter));

      const res = await fetch(`${API_BASE}/policies/audit-log?${params.toString()}`);
      if (res.ok) setEntries(await res.json());
    } finally {
      setLoading(false);
    }
  }, [entityFilter, eventFilter, limitFilter]);

  useEffect(() => { fetchAuditLog(); }, [fetchAuditLog]);

  const ACTION_LABEL: Record<string, string> = {
    RULE_CREATED       : 'Created',
    RULE_UPDATED       : 'Updated',
    RULE_DEPRECATED    : 'Archived',
    RULE_DELETED       : 'Deleted',
    RULE_APPROVED      : 'Approved',
    CONNECTION_CREATED : 'Connected',
    SCHEMA_MAPPED      : 'Mapped',
    VIOLATION_DETECTED : 'Violation',
    SCAN_STARTED       : 'Scan Start',
    SCAN_COMPLETED     : 'Scan Done',
  };

  return (
      <div>
        {/* ── Header + filters ── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Audit Log</h3>
            {!loading && (
                <span className="text-xs text-gray-500 font-mono bg-white/5 px-2 py-0.5 rounded-full">
              {entries.length} entries
            </span>
            )}
          </div>
          <button
              onClick={fetchAuditLog}
              className="p-2 text-gray-500 hover:text-cyan-400 transition-colors"
              title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex items-center gap-3 mb-5 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-xl p-3">
          {/* Entity type */}
          <select
              value={entityFilter}
              onChange={e => setEntityFilter(e.target.value)}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50"
          >
            <option value="all"       className="bg-[#0a0a0a]">All Entities</option>
            <option value="rule"      className="bg-[#0a0a0a]">Rules</option>
            <option value="connection"className="bg-[#0a0a0a]">Connections</option>
            <option value="violation" className="bg-[#0a0a0a]">Violations</option>
            <option value="workflow"  className="bg-[#0a0a0a]">Workflows</option>
          </select>

          {/* Event type */}
          <select
              value={eventFilter}
              onChange={e => setEventFilter(e.target.value)}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50"
          >
            <option value="all"               className="bg-[#0a0a0a]">All Events</option>
            <option value="RULE_CREATED"      className="bg-[#0a0a0a]">Rule Created</option>
            <option value="RULE_UPDATED"      className="bg-[#0a0a0a]">Rule Updated</option>
            <option value="RULE_DEPRECATED"   className="bg-[#0a0a0a]">Rule Archived</option>
            <option value="RULE_DELETED"      className="bg-[#0a0a0a]">Rule Deleted</option>
            <option value="CONNECTION_CREATED"className="bg-[#0a0a0a]">Connection Created</option>
            <option value="SCHEMA_MAPPED"     className="bg-[#0a0a0a]">Schema Mapped</option>
            <option value="VIOLATION_DETECTED"className="bg-[#0a0a0a]">Violation Detected</option>
            <option value="SCAN_STARTED"      className="bg-[#0a0a0a]">Scan Started</option>
            <option value="SCAN_COMPLETED"    className="bg-[#0a0a0a]">Scan Completed</option>
          </select>

          {/* Limit */}
          <select
              value={limitFilter}
              onChange={e => setLimitFilter(Number(e.target.value))}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50"
          >
            {[25, 50, 100, 200].map(n => (
                <option key={n} value={n} className="bg-[#0a0a0a]">Last {n}</option>
            ))}
          </select>
        </div>

        {/* ── Table ── */}
        <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
          {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading audit log...
              </div>
          ) : (
              <table className="w-full">
                <thead className="bg-black/40 border-b border-white/10">
                <tr>
                  {['Timestamp', 'User', 'Action', 'Entity', 'Detail'].map(h => (
                      <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {h}
                      </th>
                  ))}
                </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                {entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-white/5 transition-colors">

                      {/* Timestamp */}
                      <td className="px-6 py-4">
                    <span className="font-mono text-xs text-gray-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                      </td>

                      {/* Actor */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-cyan-400">{entry.actor ?? '—'}</span>
                      </td>

                      {/* Event badge */}
                      <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${ACTION_STYLES[entry.event_type] ?? 'bg-gray-500/20 text-gray-400'}`}>
                      {ACTION_LABEL[entry.event_type] ?? entry.event_type}
                    </span>
                      </td>

                      {/* Entity */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-white font-mono">{entry.entity_id ?? '—'}</div>
                        {entry.entity_type && (
                            <div className="text-xs text-gray-500 mt-0.5 capitalize">{entry.entity_type}</div>
                        )}
                      </td>

                      {/* Detail */}
                      <td className="px-6 py-4 max-w-xs">
                        {entry.detail ? (
                            <span className="text-xs text-gray-400 font-mono truncate block" title={JSON.stringify(entry.detail)}>
                        {Object.entries(entry.detail)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ')}
                      </span>
                        ) : (
                            <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>

                    </tr>
                ))}

                {entries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-500 text-sm">
                        No audit entries found for the selected filters
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
          )}
        </div>
      </div>
  );
}
