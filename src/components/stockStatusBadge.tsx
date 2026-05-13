"use client";

interface Props {
  status: string;
}

export default function StockStatusBadge({ status }: Props) {
  let color = "bg-emerald-50 text-emerald-700 border-emerald-100";

  if (status === "Low Stock") {
    color = "bg-amber-50 text-amber-700 border-amber-100";
  } else if (status === "Out of Stock") {
    color = "bg-red-50 text-red-700 border-red-100";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1" />
      {status}
    </span>
  );
}
