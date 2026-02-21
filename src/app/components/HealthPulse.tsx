import { Play } from 'lucide-react';

export default function HealthPulse() {
  const compliance = 94;
  const circumference = 2 * Math.PI * 90;
  const offset = circumference - (compliance / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-8">
      {/* Health Pulse Ring */}
      <div className="relative w-64 h-64">
        {/* Background ring */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="12"
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="75%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
          
          {/* Animated progress ring */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="url(#pulseGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xs uppercase tracking-wider text-cyan-400 mb-2">Health Pulse</div>
          <div className="text-6xl font-bold text-white">{compliance}%</div>
          <div className="text-xs text-gray-400 mt-1">Compliant</div>
        </div>
      </div>
      
      {/* Scan Now Button */}
      <button className="mt-6 px-8 py-3 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-all backdrop-blur-sm flex items-center gap-2 group">
        <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
        <span className="font-medium">Scan Now</span>
      </button>
    </div>
  );
}
