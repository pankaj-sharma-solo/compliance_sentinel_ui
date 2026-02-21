import { ShieldCheck, User } from 'lucide-react';

interface RoleToggleProps {
  isAdmin: boolean;
  onToggle: () => void;
}

export default function RoleToggle({ isAdmin, onToggle }: RoleToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/10 rounded-lg hover:border-cyan-400/50 transition-all"
    >
      {isAdmin ? (
        <>
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-cyan-400 font-medium">Admin</span>
        </>
      ) : (
        <>
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400 font-medium">Viewer</span>
        </>
      )}
    </button>
  );
}
