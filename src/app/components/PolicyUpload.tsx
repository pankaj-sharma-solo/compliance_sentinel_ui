import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Loader, CheckCircle, XCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

type UploadStatus = 'idle' | 'uploading' | 'polling' | 'success' | 'error';

interface RecentDoc {
  name: string;
  date: string;
  rules: number;
}

interface JobStatus {
  job_id: string;
  filename: string;
  status: 'QUEUED' | 'EXTRACTING' | 'DECOMPOSING' | 'AWAITING_REVIEW' | 'COMPLETED' | 'FAILED';
  candidate_spans: number | null;
  rules_decomposed: number | null;
  rules_approved: number;
  error_detail: string | null;
}

// Maps backend job status → human-readable progress label + percent
const JOB_PROGRESS: Record<JobStatus['status'], { label: string; pct: number }> = {
  QUEUED          : { label: 'Queued — waiting for worker...',            pct: 5  },
  EXTRACTING      : { label: 'Pass 1: Scanning PDF for rule candidates...', pct: 30 },
  DECOMPOSING     : { label: 'Pass 2: Decomposing rules with AI...',       pct: 65 },
  AWAITING_REVIEW : { label: 'Done — some rules need human review',        pct: 100 },
  COMPLETED       : { label: 'All rules persisted successfully',           pct: 100 },
  FAILED          : { label: 'Ingestion failed',                           pct: 100 },
};

export default function PolicyUpload() {
  const [isDragging, setIsDragging]   = useState(false);
  const [status, setStatus]           = useState<UploadStatus>('idle');
  const [job, setJob]                 = useState<JobStatus | null>(null);
  const [recentDocs, setRecentDocs]   = useState<RecentDoc[]>([]);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchRecentDocs();
    return () => stopPolling(); // cleanup on unmount
  }, []);

  // ── Recent docs ───────────────────────────────────────────────────────
  const fetchRecentDocs = async () => {
    try {
      const res = await fetch(`${API_BASE}/policies/documents`);
      if (res.ok) setRecentDocs(await res.json());
    } catch {
      setRecentDocs([
        { name: 'GDPR_Compliance_v3.2.pdf',    date: '2026-02-05', rules: 142 },
        { name: 'Data_Retention_Policy.pdf',   date: '2026-02-03', rules: 89  },
        { name: 'PII_Handling_Guidelines.pdf', date: '2026-01-28', rules: 67  },
      ]);
    }
  };

  // ── Job polling ───────────────────────────────────────────────────────
  const startPolling = (jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/policies/upload/${jobId}`);
        if (!res.ok) return;

        const data: JobStatus = await res.json();
        setJob(data);

        const terminal = ['COMPLETED', 'AWAITING_REVIEW', 'FAILED'].includes(data.status);
        if (terminal) {
          stopPolling();
          if (data.status === 'FAILED') {
            setErrorMsg(data.error_detail ?? 'Ingestion failed');
            setStatus('error');
            setTimeout(() => setStatus('idle'), 5000);
          } else {
            setStatus('success');
            await fetchRecentDocs();
            setTimeout(() => { setStatus('idle'); setJob(null); }, 5000);
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 2000); // poll every 2s
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    setStatus('uploading');
    setJob(null);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/policies/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? 'Upload failed');
      }

      const data = await res.json(); // { job_id, status, filename, poll_url }
      setStatus('polling');
      startPolling(data.job_id);

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────
  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  // ── Derived display values ────────────────────────────────────────────
  const isProcessing = status === 'uploading' || status === 'polling';

  const progressPct = (() => {
    if (status === 'uploading') return 10; // file is being sent
    if (job) return JOB_PROGRESS[job.status]?.pct ?? 10;
    return 0;
  })();

  const progressLabel = (() => {
    if (status === 'uploading') return 'Uploading file to server...';
    if (job) return JOB_PROGRESS[job.status]?.label ?? 'Processing...';
    return 'Processing...';
  })();

  const renderIcon = () => {
    if (status === 'success') return <CheckCircle className="w-8 h-8 text-green-400" />;
    if (status === 'error')   return <XCircle className="w-8 h-8 text-red-400" />;
    if (isProcessing)         return <Loader className="w-8 h-8 text-cyan-400 animate-spin" />;
    return <Upload className="w-8 h-8 text-cyan-400" />;
  };

  const renderHeading = () => {
    if (status === 'success' && job)
      return job.status === 'AWAITING_REVIEW'
          ? `⏳ ${job.rules_approved} rules queued for review`
          : `✅ ${job.rules_approved} rules extracted`;
    if (status === 'error')   return 'Upload Failed';
    if (isProcessing)         return 'AI Processing Policy Document...';
    return 'Drag & Drop PDF Policy Documents Here';
  };

  const renderSubtext = () => {
    if (status === 'success' && job?.status === 'AWAITING_REVIEW')
      return 'Some rules need human approval — check the Review Queue';
    if (status === 'success') return 'All rules persisted to MySQL & indexed in Qdrant';
    if (status === 'error')   return errorMsg ?? 'Something went wrong';
    if (isProcessing)         return 'Extracting rules, analyzing clauses, and indexing compliance requirements';
    return 'Supports PDF, DOCX, and TXT formats';
  };

  return (
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-cyan-400" />
          <h2 className="text-2xl font-bold text-white">Policy Upload</h2>
        </div>

        {/* ── Drop Zone ── */}
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-12 transition-all backdrop-blur-xl ${
                isDragging           ? 'border-cyan-400 bg-cyan-400/10'        :
                    status === 'success' ? 'border-green-400/50 bg-green-400/5'   :
                        status === 'error'   ? 'border-red-400/50 bg-red-400/5'       :
                            'border-white/20 bg-[#0a0a0a]/40'
            }`}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                isProcessing ? 'bg-cyan-400/20 animate-pulse' : 'bg-cyan-400/10'
            }`}>
              {renderIcon()}
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">{renderHeading()}</h3>
            <p className={`text-sm mb-6 ${status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
              {renderSubtext()}
            </p>

            {status === 'idle' && (
                <label className="px-6 py-3 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-all cursor-pointer">
                  <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileSelect}
                  />
                  Browse Files
                </label>
            )}
          </div>

          {/* ── Progress Bar ── */}
          {isProcessing && (
              <div className="mt-6">
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-500 ease-out"
                      style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-cyan-400 font-mono">{progressLabel}</span>
                  <span className="text-xs text-cyan-400 font-mono">{progressPct}%</span>
                </div>

                {/* Live stats while polling */}
                {status === 'polling' && job && (
                    <div className="flex gap-6 mt-3 justify-center">
                      {job.candidate_spans !== null && (
                          <span className="text-xs text-gray-400 font-mono">
                    Spans found: <span className="text-cyan-400">{job.candidate_spans}</span>
                  </span>
                      )}
                      {job.rules_decomposed !== null && (
                          <span className="text-xs text-gray-400 font-mono">
                    Rules decomposed: <span className="text-cyan-400">{job.rules_decomposed}</span>
                  </span>
                      )}
                    </div>
                )}
              </div>
          )}
        </div>

        {/* ── Recent Uploads ── */}
        <div className="mt-6 bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-4">Recent Policy Documents</h3>
          <div className="space-y-3">
            {recentDocs.map((doc, index) => (
                <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/5 hover:border-cyan-400/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    <div>
                      <div className="text-sm text-white font-medium">{doc.name}</div>
                      <div className="text-xs text-gray-500">Uploaded {doc.date}</div>
                    </div>
                  </div>
                  <div className="text-xs text-cyan-400 font-mono">{doc.rules} rules extracted</div>
                </div>
            ))}
          </div>
        </div>
      </div>
  );
}
