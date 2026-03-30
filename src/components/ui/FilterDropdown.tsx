interface FilterDropdownProps {
  label: string;
  count?: number;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export default function FilterDropdown({
  label,
  count = 0,
  isOpen,
  onToggleOpen,
}: FilterDropdownProps) {
  const active = count > 0;
  return (
    <button
      onClick={onToggleOpen}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all ${
        active || isOpen
          ? "bg-navy text-white border-navy"
          : "bg-white text-navy border-gray-300 hover:border-gray-400"
      }`}
    >
      <span>{label}</span>
      {active && (
        <span className="text-[10px] font-bold bg-white/25 rounded-full w-4 h-4 flex items-center justify-center leading-none">
          {count}
        </span>
      )}
      <svg
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
        className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
      >
        <path
          d="M1 1l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
