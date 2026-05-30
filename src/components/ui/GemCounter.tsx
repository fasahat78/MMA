interface Props {
  gems: number;
  className?: string;
}

export function GemCounter({ gems, className = "" }: Props) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-lg font-extrabold text-fuchsia-700 shadow-md ${className}`}
      aria-label={`${gems} gems`}
    >
      <span aria-hidden>💎</span>
      <span>{gems.toLocaleString()}</span>
    </div>
  );
}
