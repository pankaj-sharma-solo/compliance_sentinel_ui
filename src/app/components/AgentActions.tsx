import { Clock } from 'lucide-react';

interface Action {
  time: string;
  message: string;
}

const actions: Action[] = [
  {
    time: '09:41',
    message: 'Scanned "Project_Phoenix" dbt-manifest... analyzed 342 sources, 89 models...',
  },
  {
    time: '09:42',
    message: 'Violation found: PII detected in non-EU zone.',
  },
  {
    time: '09:42',
    message: 'Recommendation sent to @Lead_Dev',
  },
];

export default function AgentActions() {
  return (
    <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <h3 className="text-sm uppercase tracking-wider text-cyan-400 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Agent Actions
      </h3>
      
      <div className="space-y-3">
        {actions.map((action, index) => (
          <div key={index} className="flex gap-3 text-sm">
            <span className="text-cyan-400 font-mono">[{action.time}]</span>
            <span className="text-gray-300">{action.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
