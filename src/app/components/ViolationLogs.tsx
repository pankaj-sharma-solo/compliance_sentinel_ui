import { useState, useEffect, useCallback } from 'react';
import { Search, Download, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type ViolStatus = 'OPEN' | 'REMEDIATED' | 'ACCEPTED_RISK' | 'FALSE_POSITIVE';

interface ViolationLog {
  id                  : number;
  rule_id             : string;
  table_name          : string;
  column_name         : string | null;
  severity            : Severity;
  status              : ViolStatus;
  condition_matched   : string;
  evidence_snapshot   : Record<string, unknown> | null;
  remediation_template: string | null;
  detected_at         : string;
  resolved_at         : string | null;
  resolved_by         : string | null;
  db_connection_id    : number;
}

// ── Style maps ────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<Severity, string> = {
  CRITICAL: 'bg-red-500/20 text-red-400 border border-red-500/30',
  HIGH    : 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  MEDIUM  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  LOW     : 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

const STATUS_STYLES: Record<ViolStatus, string> = {
  OPEN           : 'bg-red-500/20 text-red-400 border border-red-500/30',
  REMEDIATED     : 'bg-green-500/20 text-green-400 border border-green-500/30',
  ACCEPTED_RISK  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  FALSE_POSITIVE : 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

const STATUS_LABEL: Record<ViolStatus, string> = {
  OPEN           : 'Open',
  REMEDIATED     : 'Remediated',
  ACCEPTED_RISK  : 'Accepted Risk',
  FALSE_POSITIVE : 'False Positive',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ViolationLogs() {
  const [logs, setLogs]                 = useState<ViolationLog[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId]     = useState<number | null>(null);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (statusFilter   !== 'all') params.set('status',   statusFilter);
      params.set('limit', '200');
      const res = await fetch(`${API_BASE}/violations?${params.toString()}`);
      if (res.ok) setLogs(await res.json());
    } finally {
      setLoading(false);
    }
  }, [severityFilter, statusFilter]);

  useEffect(() => { fetchViolations(); }, [fetchViolations]);

  // ── Triage action ─────────────────────────────────────────────────────────

  const updateStatus = async (id: number, newStatus: ViolStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`${API_BASE}/violations/${id}/status`, {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setLogs(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
    } finally {
      setUpdatingId(null);
    }
  };

  // ── CSV export ────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    const headers = ['ID', 'Rule', 'Table', 'Column', 'Severity', 'Status', 'Condition', 'Detected At', 'Resolved By'];
    const rows = filteredLogs.map(v => [
      v.id, v.rule_id, v.table_name, v.column_name ?? '',
      v.severity, v.status, `"${v.condition_matched.replace(/"/g, '""')}"`,
      v.detected_at, v.resolved_by ?? '',
    ]);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `violations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Filter ────────────────────────────────────────────────────────────────

  const filteredLogs = logs.filter(v => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term
        || v.rule_id.toLowerCase().includes(term)
        || v.table_name.toLowerCase().includes(term)
        || (v.column_name ?? '').toLowerCase().includes(term)
        || v.condition_matched.toLowerCase().includes(term);
    return matchesSearch;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = {
    total      : logs.length,
    open       : logs.filter(v => v.status === 'OPEN').length,
    remediated : logs.filter(v => v.status === 'REMEDIATED').length,
    critical   : logs.filter(v => v.severity === 'CRITICAL').length,
  };

  return (
      <div className="p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            <h2 className="text-2xl font-bold text-white">Violation Logs</h2>
            <span className="text-xs text-gray-500 font-mono bg-white/5 px-2 py-0.5 rounded-full">
                        {filteredLogs.length} entries
                    </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchViolations}
                    className="p-2 text-gray-400 hover:text-cyan-400 transition-colors" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 text-xs rounded-lg hover:text-white hover:border-white/20 transition-all">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: stats.total,      color: 'text-white',       icon: <AlertTriangle className="w-4 h-4" /> },
            { label: 'Open',       value: stats.open,       color: 'text-red-400',     icon: <XCircle className="w-4 h-4" /> },
            { label: 'Remediated', value: stats.remediated, color: 'text-green-400',   icon: <CheckCircle className="w-4 h-4" /> },
            { label: 'Critical',   value: stats.critical,   color: 'text-red-500',     icon: <AlertTriangle className="w-4 h-4" /> },
          ].map(s => (
              <div key={s.label} className="bg-[#0a0a0a]/40 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                <span className={s.color}>{s.icon}</span>
                <div>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-xl p-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search rule, table, column, condition..."
                className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400/50"
            />
          </div>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
                  className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50">
            <option value="all">All Severities</option>
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map(s => (
                <option key={s} value={s} className="bg-[#0a0a0a]">{s}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50">
            <option value="all">All Statuses</option>
            {(['OPEN', 'REMEDIATED', 'ACCEPTED_RISK', 'FALSE_POSITIVE'] as ViolStatus[]).map(s => (
                <option key={s} value={s} className="bg-[#0a0a0a]">{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
          {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading violations...
              </div>
          ) : (
              <table className="w-full text-sm">
                <thead className="bg-black/40 border-b border-white/10">
                <tr>
                  {['Severity', 'Location', 'Rule', 'Condition', 'Status', 'Detected', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {h}
                      </th>
                  ))}
                </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                {filteredLogs.map(v => (
                    <tr key={v.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3.5">
                                        <span className={`px-2 py-0.5 rounded text-xs font-mono ${SEVERITY_STYLES[v.severity]}`}>
                                            {v.severity}
                                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        <div className="text-white text-xs">{v.table_name}</div>
                        {v.column_name && (
                            <div className="text-gray-500 text-xs">.{v.column_name}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-cyan-400 font-mono">{v.rule_id}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400 max-w-xs truncate" title={v.condition_matched}>
                        {v.condition_matched}
                      </td>
                      <td className="px-5 py-3.5">
                                        <span className={`px-2 py-0.5 rounded text-xs font-mono ${STATUS_STYLES[v.status]}`}>
                                            {STATUS_LABEL[v.status]}
                                        </span>
                        {v.resolved_by && (
                            <div className="text-xs text-gray-600 mt-0.5">by {v.resolved_by}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(v.detected_at).toLocaleDateString()}
                        </div>
                        <div className="text-gray-600">
                          {new Date(v.detected_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {v.status === 'OPEN' && (
                            <div className="flex items-center gap-1">
                              <button
                                  onClick={() => updateStatus(v.id, 'REMEDIATED')}
                                  disabled={updatingId === v.id}
                                  className="px-2 py-1 text-xs bg-green-500/15 text-green-400 border border-green-500/25 rounded hover:bg-green-500/25 transition-colors disabled:opacity-40"
                              >
                                Remediate
                              </button>
                              <button
                                  onClick={() => updateStatus(v.id, 'FALSE_POSITIVE')}
                                  disabled={updatingId === v.id}
                                  className="px-2 py-1 text-xs bg-gray-500/15 text-gray-400 border border-gray-500/25 rounded hover:bg-gray-500/25 transition-colors disabled:opacity-40"
                              >
                                FP
                              </button>
                              <button
                                  onClick={() => updateStatus(v.id, 'ACCEPTED_RISK')}
                                  disabled={updatingId === v.id}
                                  className="px-2 py-1 text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 rounded hover:bg-yellow-500/25 transition-colors disabled:opacity-40"
                              >
                                Accept
                              </button>
                            </div>
                        )}
                        {v.status !== 'OPEN' && (
                            <button
                                onClick={() => updateStatus(v.id, 'OPEN')}
                                disabled={updatingId === v.id}
                                className="px-2 py-1 text-xs bg-white/5 text-gray-500 border border-white/10 rounded hover:text-white transition-colors disabled:opacity-40"
                            >
                              Reopen
                            </button>
                        )}
                      </td>
                    </tr>
                ))}
                {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500 text-sm">
                        No violations found for the selected filters
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
