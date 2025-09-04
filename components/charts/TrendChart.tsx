"use client";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a0a1b2" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#a0a1b2" }} tickLine={false} axisLine={false} width={30} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


