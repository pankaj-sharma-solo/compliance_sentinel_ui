import { useState, useEffect, useRef } from 'react';
import {
    Activity, Play, StopCircle, RefreshCw, Database,
    AlertTriangle, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────

type ThreadStatus = 'RUNNING' | 'INTERRUPTED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface DbConnection {
    id: number;
    name: string;
    db_type: string;
    server_region: string | null;
    scan_mode: 'CDC' | 'SCHEDULED' | 'MANUAL';
    last_scanned_at: string | null;
    schema_mapped: boolean;
}

interface ScanThread {
    thread_id: string;
    db_connection_id: number;
    db_connection_name: string;
    workflow_type: string;
    status: ThreadStatus;
    started_at: string;
    completed_at: string | null;
    interrupted_at: string | null;
    error_detail: string | null;
    violation_count: number;
    critical_count: number;
    high_count: number;
}

interface ViolationSummary {
    id: number;
    rule_id: string;
    table_name: string;
    column_name: string | null;
    severity: SeverityLevel;
    condition_matched: string;
    detected_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<SeverityLevel, string> = {
    CRITICAL : 'bg-red-500/20 text-red-400 border border-red-500/30',
    HIGH     : 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    MEDIUM   : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    LOW      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

const STATUS_STYLES: Record<ThreadStatus, string> = {
    RUNNING     : 'text-cyan-400',
    INTERRUPTED : 'text-yellow-400',
    COMPLETED   : 'text-green-400',
    FAILED      : 'text-red-400',
    CANCELLED   : 'text-gray-400',
};

const STATUS_ICONS: Record<ThreadStatus, React.ReactElement> = {
    RUNNING     : <RefreshCw className="w-4 h-4 animate-spin" />,
    INTERRUPTED : <Clock className="w-4 h-4" />,
    COMPLETED   : <CheckCircle className="w-4 h-4" />,
    FAILED      : <XCircle className="w-4 h-4" />,
    CANCELLED   : <StopCircle className="w-4 h-4" />,
};

function elapsed(startedAt: string): string {
    const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    if (secs < 60)   return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ActiveScans() {
    const [connections, setConnections]     = useState<DbConnection[]>([]);
    const [threads, setThreads]             = useState<ScanThread[]>([]);
    const [launching, setLaunching]         = useState<number | null>(null);
    const [expandedThread, setExpandedThread] = useState<string | null>(null);
    const [violations, setViolations]       = useState<Record<string, ViolationSummary[]>>({});
    const [loadingViolations, setLoadingViolations] = useState<string | null>(null);
    const [elapsedTick, setElapsedTick]     = useState(0);
    const pollRef                           = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        fetchConnections();
        fetchThreads();
        startPolling();

        // Tick every second to update elapsed timers for RUNNING threads
        const ticker = setInterval(() => setElapsedTick(t => t + 1), 1000);
        return () => {
            stopPolling();
            clearInterval(ticker);
        };
    }, []);

    // ── Data fetchers ─────────────────────────────────────────────────────
    const fetchConnections = async () => {
        try {
            const res = await fetch(`${API_BASE}/connections`);
            if (res.ok) setConnections(await res.json());
        } catch { /* silent */ }
    };

    const fetchThreads = async () => {
        try {
            const res = await fetch(`${API_BASE}/scans/threads`);
            if (res.ok) setThreads(await res.json());
        } catch { /* silent */ }
    };

    const fetchViolationsForThread = async (threadId: string) => {
        if (violations[threadId]) return;
        setLoadingViolations(threadId);
        try {
            const res = await fetch(`${API_BASE}/scans/threads/${threadId}/violations`);
            if (res.ok) {
                const data = await res.json();
                setViolations(prev => ({ ...prev, [threadId]: data }));
            }
        } finally {
            setLoadingViolations(null);
        }
    };


    // ── Polling: refresh threads every 3s while any are RUNNING ──────────
    const startPolling = () => {
        pollRef.current = setInterval(() => {
            fetchThreads();
        }, 3000);
    };

    const stopPolling = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };

    // ── Launch manual scan ────────────────────────────────────────────────
    const launchScan = async (connectionId: number) => {
        setLaunching(connectionId);
        try {
            const res = await fetch(`${API_BASE}/scans/trigger`, {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ db_connection_id: connectionId, workflow_type: 'policy_review' }),
            });
            if (res.ok) await fetchThreads();
        } finally {
            setLaunching(null);
        }
    };

    // ── Cancel a running scan ─────────────────────────────────────────────
    const cancelScan = async (threadId: string) => {
        await fetch(`${API_BASE}/scans/threads/${threadId}/cancel`, { method: 'PATCH' });
        await fetchThreads();
    };

    // ── Expand/collapse thread row ────────────────────────────────────────
    const toggleExpand = (threadId: string) => {
        if (expandedThread === threadId) {
            setExpandedThread(null);
        } else {
            setExpandedThread(threadId);
            fetchViolationsForThread(threadId);
        }
    };

    const runningCount = threads.filter(t => t.status === 'RUNNING').length;

    return (
        <div className="p-8">

            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">Active Scans</h2>
                    {runningCount > 0 && (
                        <span className="px-2 py-0.5 bg-cyan-400/20 border border-cyan-400/30 text-cyan-400 text-xs font-mono rounded-full animate-pulse">
              {runningCount} running
            </span>
                    )}
                </div>
                <button
                    onClick={fetchThreads}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-gray-400 text-xs rounded-lg hover:border-cyan-400/40 hover:text-cyan-400 transition-all"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>

            {/* ── Database Connections — trigger panel ── */}
            <div className="mb-6 bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-4">
                    Registered Databases — Trigger Manual Scan
                </h3>
                {connections.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                        No database connections registered yet.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {connections.map(conn => (
                            <div
                                key={conn.id}
                                className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-white/5 hover:border-cyan-400/20 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <Database className="w-5 h-5 text-cyan-400/70" />
                                    <div>
                                        <div className="text-sm font-medium text-white">{conn.name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                            <span className="uppercase">{conn.db_type}</span>
                                            {conn.server_region && <span>· {conn.server_region}</span>}
                                            <span>· {conn.scan_mode}</span>
                                            {conn.last_scanned_at && (
                                                <span>· Last scanned {new Date(conn.last_scanned_at).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!conn.schema_mapped && (
                                        <span className="text-xs text-yellow-400 font-mono bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/20">
                      Schema unmapped
                    </span>
                                    )}
                                    <button
                                        onClick={() => launchScan(conn.id)}
                                        disabled={launching === conn.id || !conn.schema_mapped}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 text-xs font-medium rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {launching === conn.id
                                            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Launching...</>
                                            : <><Play className="w-3.5 h-3.5" /> Run Scan</>
                                        }
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Scan Threads ── */}
            <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-4">Scan History</h3>

                {threads.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No scans triggered yet. Select a database above to start.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {threads.map(thread => (
                            <div key={thread.thread_id} className="border border-white/5 rounded-lg overflow-hidden">

                                {/* ── Thread row ── */}
                                <div
                                    className="flex items-center justify-between p-4 bg-black/30 cursor-pointer hover:bg-black/50 transition-all"
                                    onClick={() => toggleExpand(thread.thread_id)}
                                >
                                    <div className="flex items-center gap-3">
                    <span className={STATUS_STYLES[thread.status]}>
                      {STATUS_ICONS[thread.status]}
                    </span>
                                        <div>
                                            <div className="text-sm font-medium text-white">{thread.db_connection_name}</div>
                                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                                                {thread.thread_id.slice(0, 8)}... · {thread.workflow_type}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Violation counts */}
                                        {(thread.critical_count > 0 || thread.high_count > 0) && (
                                            <div className="flex items-center gap-2">
                                                {thread.critical_count > 0 && (
                                                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded font-mono">
                            <AlertTriangle className="w-3 h-3" /> {thread.critical_count} CRITICAL
                          </span>
                                                )}
                                                {thread.high_count > 0 && (
                                                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded font-mono">
                            {thread.high_count} HIGH
                          </span>
                                                )}
                                            </div>
                                        )}

                                        {thread.violation_count > 0 && (
                                            <span className="text-xs text-gray-400 font-mono">
                        {thread.violation_count} violations
                      </span>
                                        )}

                                        {/* Elapsed / timestamp */}
                                        <span className={`text-xs font-mono ${STATUS_STYLES[thread.status]}`}>
                      {thread.status === 'RUNNING'
                          ? elapsed(thread.started_at)
                          : thread.completed_at
                              ? new Date(thread.completed_at).toLocaleTimeString()
                              : '—'}
                    </span>

                                        {/* Cancel button for running threads */}
                                        {thread.status === 'RUNNING' && (
                                            <button
                                                onClick={e => { e.stopPropagation(); cancelScan(thread.thread_id); }}
                                                className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                                title="Cancel scan"
                                            >
                                                <StopCircle className="w-4 h-4" />
                                            </button>
                                        )}

                                        {expandedThread === thread.thread_id
                                            ? <ChevronUp className="w-4 h-4 text-gray-500" />
                                            : <ChevronDown className="w-4 h-4 text-gray-500" />
                                        }
                                    </div>
                                </div>

                                {/* ── Expanded: violations list ── */}
                                {expandedThread === thread.thread_id && (
                                    <div className="border-t border-white/5 bg-black/20 p-4">
                                        {thread.status === 'FAILED' && thread.error_detail && (
                                            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 font-mono">
                                                {thread.error_detail}
                                            </div>
                                        )}

                                        {loadingViolations === thread.thread_id ? (
                                            <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading violations...
                                            </div>
                                        ) : violations[thread.thread_id]?.length === 0 ? (
                                            <p className="text-xs text-green-400 py-2">✅ No violations detected</p>
                                        ) : violations[thread.thread_id] ? (
                                            <div className="space-y-2">
                                                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
                                                    Violations detected
                                                </p>
                                                {violations[thread.thread_id].map(v => (
                                                    <div
                                                        key={v.id}
                                                        className="flex items-start justify-between p-3 bg-black/40 rounded-lg border border-white/5"
                                                    >
                                                        <div className="flex items-start gap-3">
                              <span className={`text-xs px-2 py-0.5 rounded font-mono mt-0.5 ${SEVERITY_STYLES[v.severity]}`}>
                                {v.severity}
                              </span>
                                                            <div>
                                                                <div className="text-xs text-white font-medium">
                                                                    {v.table_name}{v.column_name ? `.${v.column_name}` : ''}
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-0.5">{v.condition_matched}</div>
                                                                <div className="text-xs text-gray-600 mt-0.5 font-mono">{v.rule_id}</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-gray-600 font-mono whitespace-nowrap ml-4">
                              {new Date(v.detected_at).toLocaleTimeString()}
                            </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
