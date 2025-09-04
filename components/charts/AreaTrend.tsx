"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AreaTrend({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2230" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a0a1b2" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#a0a1b2" }} tickLine={false} axisLine={false} width={30} />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke="#7c3aed" fillOpacity={1} fill="url(#g1)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


