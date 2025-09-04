"use client";
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts";

const COLORS = ["#22c55e", "#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6"];

export function DonutChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2} stroke="none">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


