import { useState, useEffect, useRef } from 'react';
import {
    Activity, Play, StopCircle, RefreshCw, Database,
    AlertTriangle, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────

type ThreadStatus  = 'RUNNING' | 'INTERRUPTED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface DbConnection {
    id             : number;
    name           : string;
    db_type        : string;
    server_region  : string | null;
    scan_mode      : 'CDC' | 'SCHEDULED' | 'MANUAL';
    last_scanned_at: string | null;
    schema_mapped  : boolean;
}

interface ScanThread {
    thread_id         : string;
    db_connection_id  : number;
    db_connection_name: string;
    workflow_type     : string;
    status            : ThreadStatus;
    started_at        : string;
    completed_at      : string | null;
    interrupted_at    : string | null;
    error_detail      : string | null;
    violation_count   : number;
    critical_count    : number;
    high_count        : number;
}

interface ViolationSummary {
    id               : number;
    rule_id          : string;
    table_name       : string;
    column_name      : string | null;
    severity         : SeverityLevel;
    condition_matched: string;
    detected_at      : string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<SeverityLevel, string> = {
    CRITICAL: 'bg-red-500/20 text-red-400 border border-red-500/30',
    HIGH    : 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    MEDIUM  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    LOW     : 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

const STATUS_STYLES: Record<ThreadStatus, string> = {
    RUNNING    : 'text-cyan-400',
    INTERRUPTED: 'text-yellow-400',
    COMPLETED  : 'text-green-400',
    FAILED     : 'text-red-400',
    CANCELLED  : 'text-gray-400',
};

const STATUS_ICONS: Record<ThreadStatus, React.ReactNode> = {
    RUNNING    : <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
    INTERRUPTED: <AlertTriangle className="w-3.5 h-3.5" />,
    COMPLETED  : <CheckCircle className="w-3.5 h-3.5" />,
    FAILED     : <XCircle className="w-3.5 h-3.5" />,
    CANCELLED  : <XCircle className="w-3.5 h-3.5" />,
};

function elapsed(startedAt: string): string {
    const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    if (secs < 60)   return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ActiveScans() {
    const [connections, setConnections]             = useState<DbConnection[]>([]);
    const [threads, setThreads]                     = useState<ScanThread[]>([]);
    const [launching, setLaunching]                 = useState<number | null>(null);
    const [expandedThread, setExpandedThread]       = useState<string | null>(null);
    const [violations, setViolations]               = useState<Record<string, ViolationSummary[]>>({});
    const [loadingViolations, setLoadingViolations] = useState<string | null>(null);
    const [cancelling, setCancelling]               = useState<string | null>(null);
    const [launchError, setLaunchError]             = useState<string | null>(null);
    const [elapsedTick, setElapsedTick]             = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        fetchConnections();
        fetchThreads();
        startPolling();
        const ticker = setInterval(() => setElapsedTick(t => t + 1), 1000);
        return () => { stopPolling(); clearInterval(ticker); };
    }, []);

    // ── Fetchers ──────────────────────────────────────────────────────────────

    const fetchConnections = async () => {
        try {
            const res = await fetch(`${API_BASE}/connections`);
            if (res.ok) setConnections(await res.json());
        } catch { /* silent */ }
    };

    const fetchThreads = async () => {
        try {
            const res = await fetch(`${API_BASE}/scans/threads?limit=50`);
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

    // ── Polling ───────────────────────────────────────────────────────────────

    const startPolling = () => {
        pollRef.current = setInterval(fetchThreads, 3000);
    };
    const stopPolling = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };

    // ── Actions ───────────────────────────────────────────────────────────────

    const launchScan = async (connectionId: number) => {
        setLaunching(connectionId);
        setLaunchError(null);
        try {
            const res = await fetch(`${API_BASE}/scans/trigger`, {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ db_connection_id: connectionId, workflow_type: 'policy_review' }),
            });
            if (!res.ok) {
                const err = await res.json();
                setLaunchError(err.detail ?? 'Failed to launch scan');
            } else {
                await fetchThreads();
            }
        } finally {
            setLaunching(null);
        }
    };

    const cancelScan = async (threadId: string) => {
        setCancelling(threadId);
        try {
            await fetch(`${API_BASE}/scans/threads/${threadId}/cancel`, { method: 'PATCH' });
            await fetchThreads();
        } finally {
            setCancelling(null);
        }
    };

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
        <div className="p-8 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">Active Scans</h2>
                    {runningCount > 0 && (
                        <span className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
                            {runningCount} running
                        </span>
                    )}
                </div>
                <button onClick={fetchThreads}
                        className="p-2 text-gray-400 hover:text-cyan-400 transition-colors" title="Refresh">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Launch error */}
            {launchError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    <XCircle className="w-4 h-4 flex-shrink-0" /> {launchError}
                </div>
            )}

            {/* Registered Databases — trigger panel */}
            <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    Registered Databases — Trigger Manual Scan
                </h3>
                {connections.length === 0 ? (
                    <p className="text-gray-500 text-sm">No database connections registered yet.</p>
                ) : (
                    <div className="space-y-2">
                        {connections.map(conn => (
                            <div key={conn.id}
                                 className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5">
                                <div className="flex items-center gap-3">
                                    <Database className="w-4 h-4 text-cyan-400/60" />
                                    <div>
                                        <span className="text-sm font-medium text-white">{conn.name}</span>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                            <span className="font-mono uppercase">{conn.db_type}</span>
                                            {conn.server_region && <span>· {conn.server_region}</span>}
                                            <span>· {conn.scan_mode}</span>
                                            {conn.last_scanned_at && (
                                                <span>· Last scanned {new Date(conn.last_scanned_at).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                    {!conn.schema_mapped && (
                                        <span className="text-xs px-1.5 py-0.5 bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 rounded font-mono flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Schema unmapped
                                        </span>
                                    )}
                                </div>
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
                        ))}
                    </div>
                )}
            </div>

            {/* Scan Threads */}
            <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    Scan History
                </h3>
                {threads.length === 0 ? (
                    <p className="text-gray-500 text-sm">No scans triggered yet. Select a database above to start.</p>
                ) : (
                    <div className="space-y-2">
                        {threads.map(thread => (
                            <div key={thread.thread_id} className="border border-white/5 rounded-lg overflow-hidden">

                                {/* Thread row */}
                                <div
                                    className="flex items-center justify-between px-4 py-3 bg-black/30 hover:bg-black/50 transition-all cursor-pointer"
                                    onClick={() => toggleExpand(thread.thread_id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={STATUS_STYLES[thread.status]}>
                                            {STATUS_ICONS[thread.status]}
                                        </span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-white">
                                                    {thread.db_connection_name}
                                                </span>
                                                <span className="text-xs text-gray-600 font-mono">
                                                    {thread.thread_id.slice(0, 8)}...
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {thread.workflow_type}
                                                </span>
                                            </div>
                                            {/* Violation count badges */}
                                            <div className="flex items-center gap-1.5 mt-1">
                                                {thread.critical_count > 0 && (
                                                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${SEVERITY_STYLES.CRITICAL}`}>
                                                        {thread.critical_count} CRITICAL
                                                    </span>
                                                )}
                                                {thread.high_count > 0 && (
                                                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${SEVERITY_STYLES.HIGH}`}>
                                                        {thread.high_count} HIGH
                                                    </span>
                                                )}
                                                {thread.violation_count > 0 && (
                                                    <span className="text-xs text-gray-500 font-mono">
                                                        {thread.violation_count} total violations
                                                    </span>
                                                )}
                                                {thread.violation_count === 0 && thread.status === 'COMPLETED' && (
                                                    <span className="text-xs text-green-500 font-mono">✓ Clean</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Elapsed / timestamp */}
                                        <div className="text-right">
                                            <div className={`text-xs font-mono flex items-center gap-1 justify-end ${STATUS_STYLES[thread.status]}`}>
                                                <Clock className="w-3 h-3" />
                                                {thread.status === 'RUNNING'
                                                    ? elapsed(thread.started_at)
                                                    : thread.completed_at
                                                        ? new Date(thread.completed_at).toLocaleTimeString()
                                                        : '—'
                                                }
                                            </div>
                                            <div className="text-xs text-gray-600 mt-0.5">
                                                {new Date(thread.started_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        {/* Cancel button */}
                                        {thread.status === 'RUNNING' && (
                                            <button
                                                onClick={e => { e.stopPropagation(); cancelScan(thread.thread_id); }}
                                                disabled={cancelling === thread.thread_id}
                                                className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded hover:bg-red-400/10"
                                                title="Cancel scan"
                                            >
                                                {cancelling === thread.thread_id
                                                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                                                    : <StopCircle className="w-4 h-4" />
                                                }
                                            </button>
                                        )}

                                        {expandedThread === thread.thread_id
                                            ? <ChevronUp className="w-4 h-4 text-gray-500" />
                                            : <ChevronDown className="w-4 h-4 text-gray-500" />
                                        }
                                    </div>
                                </div>

                                {/* Expanded violations */}
                                {expandedThread === thread.thread_id && (
                                    <div className="border-t border-white/5 bg-black/20 p-4">

                                        {/* Error banner */}
                                        {thread.status === 'FAILED' && thread.error_detail && (
                                            <div className="flex items-start gap-2 mb-3 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-mono">
                                                <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                                {thread.error_detail}
                                            </div>
                                        )}

                                        {loadingViolations === thread.thread_id ? (
                                            <div className="flex items-center gap-2 text-gray-500 text-xs py-2">
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading violations...
                                            </div>
                                        ) : violations[thread.thread_id]?.length === 0 ? (
                                            <p className="text-green-500 text-xs py-2">✅ No violations detected</p>
                                        ) : violations[thread.thread_id] ? (
                                            <>
                                                <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">
                                                    Violations detected
                                                </p>
                                                <div className="border border-white/5 rounded-lg overflow-hidden">
                                                    <table className="w-full text-xs">
                                                        <thead className="bg-black/30">
                                                        <tr>
                                                            {['Severity', 'Location', 'Condition', 'Rule', 'Detected At'].map(h => (
                                                                <th key={h} className="text-left px-4 py-2 text-gray-500 uppercase tracking-wider font-semibold">
                                                                    {h}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                        {violations[thread.thread_id].map(v => (
                                                            <tr key={v.id} className="hover:bg-white/5 transition-colors">
                                                                <td className="px-4 py-2.5">
                                                                        <span className={`px-1.5 py-0.5 rounded font-mono ${SEVERITY_STYLES[v.severity]}`}>
                                                                            {v.severity}
                                                                        </span>
                                                                </td>
                                                                <td className="px-4 py-2.5 font-mono text-white">
                                                                    {v.table_name}{v.column_name ? `.${v.column_name}` : ''}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-gray-400 max-w-xs truncate" title={v.condition_matched}>
                                                                    {v.condition_matched}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-cyan-400 font-mono">{v.rule_id}</td>
                                                                <td className="px-4 py-2.5 text-gray-500 font-mono whitespace-nowrap">
                                                                    {new Date(v.detected_at).toLocaleTimeString()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
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
