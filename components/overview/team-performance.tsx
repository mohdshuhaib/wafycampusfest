"use client"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3 } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface TeamStats {
  name: string
  color: string
  totalPoints: number
  first: number
  second: number
  third: number
}

export function TeamPerformance({ data }: { data: TeamStats[] }) {
  return (
    <div className="surface-elevated overflow-hidden rounded-[2rem]">
      <div className="flex flex-col gap-3 border-b border-navy/10 bg-ivory/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-navy text-gold">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h2 className="text-title text-lg text-navy">Team Performance</h2>
            <p className="text-xs font-semibold text-slatebrand">Net points and podium distribution.</p>
          </div>
        </div>
        <Badge variant="outline">{data.length} teams</Badge>
      </div>

      <div className="p-4">
        <Tabs defaultValue="points" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-navy/6 p-1">
            <TabsTrigger value="points" className="rounded-xl py-2 text-xs font-black data-[state=active]:bg-navy data-[state=active]:text-ivory">Total Points</TabsTrigger>
            <TabsTrigger value="positions" className="rounded-xl py-2 text-xs font-black data-[state=active]:bg-navy data-[state=active]:text-ivory">Positions</TabsTrigger>
          </TabsList>

          <TabsContent value="points" className="h-[320px] min-h-[320px] min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="#0A1D2C14" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5A6D7E", fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#5A6D7E", fontWeight: 700 }} />
                <Tooltip cursor={{ fill: "#D4AF3714" }} contentStyle={{ borderRadius: "16px", border: "1px solid #0A1D2C14", background: "#F6F2E8", boxShadow: "0 18px 50px rgba(10,29,44,.14)" }} />
                <Bar dataKey="totalPoints" name="Total Points" radius={[10, 10, 0, 0]} barSize={42}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || "#123B4F"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="positions" className="h-[320px] min-h-[320px] min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="#0A1D2C14" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5A6D7E", fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#5A6D7E", fontWeight: 700 }} />
                <Tooltip cursor={{ fill: "#D4AF3714" }} contentStyle={{ borderRadius: "16px", border: "1px solid #0A1D2C14", background: "#F6F2E8", boxShadow: "0 18px 50px rgba(10,29,44,.14)" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: 700, paddingTop: "10px" }} />
                <Bar dataKey="first" name="First" fill="#D4AF37" stackId="a" radius={[0, 0, 0, 0]} barSize={42} />
                <Bar dataKey="second" name="Second" fill="#5A6D7E" stackId="a" radius={[0, 0, 0, 0]} barSize={42} />
                <Bar dataKey="third" name="Third" fill="#C98743" stackId="a" radius={[10, 10, 0, 0]} barSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
