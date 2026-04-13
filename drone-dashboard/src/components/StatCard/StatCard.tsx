import "./StatCard.css";

type StatCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
};

export default function StatCard({
  label,
  value,
  unit,
  accent,
}: StatCardProps) {
  return (
    <div
      className="stat-card"
      style={{ "--accent": accent ?? "#00f5ff" } as React.CSSProperties}
    >
      <div className="stat-label">{label}</div>

      <div className="stat-value">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
    </div>
  );
}
