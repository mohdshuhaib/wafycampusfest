"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layers3 } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface ClassStats {
  className: string
  section: string
  totalPoints: number
}

const COLORS = ["#0A1D2C", "#123B4F", "#D4AF37", "#5A6D7E", "#8E6F22"]

export function SectionAnalysis({ data }: { data: ClassStats[] }) {
  const [filter, setFilter] = useState("Senior")

  const filteredData = data
    .filter((d) => d.section === filter)
    .sort((a, b) => b.totalPoints - a.totalPoints)

  return (
    <div className="surface-elevated overflow-hidden rounded-[2rem]">
      <div className="flex flex-col gap-3 border-b border-navy/10 bg-ivory/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-deepblue text-ivory">
            <Layers3 className="size-5 text-gold" />
          </div>
          <div>
            <h2 className="text-title text-lg text-navy">Class-wise Analysis</h2>
            <p className="text-xs font-semibold text-slatebrand">Compare classroom momentum by section.</p>
          </div>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-10 w-full rounded-2xl border-navy/10 bg-ivory text-xs font-bold sm:w-[150px]">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent className="surface-elevated rounded-2xl border-navy/10">
            <SelectItem value="Senior">Senior</SelectItem>
            <SelectItem value="Junior">Junior</SelectItem>
            <SelectItem value="Sub-Junior">Sub-Junior</SelectItem>
            <SelectItem value="Foundation">Foundation</SelectItem>
            <SelectItem value="General">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-[320px] min-h-[320px] min-w-0 w-full p-4">
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={filteredData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid stroke="#0A1D2C14" horizontal vertical={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="className" type="category" width={70} tick={{ fontSize: 11, fontWeight: 800, fill: "#5A6D7E" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "16px", border: "1px solid #0A1D2C14", background: "#F6F2E8", boxShadow: "0 18px 50px rgba(10,29,44,.14)" }} />
              <Bar dataKey="totalPoints" name="Points" radius={[0, 10, 10, 0]} barSize={24}>
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-navy/12 bg-mist/55 text-sm font-bold text-slatebrand">
            No data for this section yet.
          </div>
        )}
      </div>
    </div>
  )
}
