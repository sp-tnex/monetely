import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  food: '#ef4444', 
  travel: '#3b82f6', 
  rent: '#10b981', 
  utilities: '#f59e0b', 
  entertainment: '#ec4899', 
  shopping: '#8b5cf6', 
  healthcare: '#06b6d4', 
  education: '#84cc16', 
  general: '#64748b', 
};

const DEFAULT_COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#06b6d4', '#84cc16', '#64748b', '#f43f5e',
  '#0ea5e9', '#10b981', '#eab308'
];

const getDeterministicColor = (category: string) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[index];
};

interface CategoryData {
  category: string;
  totalAmount: number;
  percentageShare: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
  currency: string;
}

const CategoryPieTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-card text-foreground border border-border p-3 rounded-md text-xs flex flex-col gap-1">
        <span className="font-bold flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dataPoint.color }} />
          {dataPoint.name}
        </span>
        <span className="font-semibold text-muted-foreground">
          Amount: <span className="text-foreground font-black">{currency} {dataPoint.value.toFixed(2)}</span>
        </span>
        <span className="font-semibold text-muted-foreground">
          Share: <span className="text-foreground font-black">{dataPoint.percentage.toFixed(1)}%</span>
        </span>
      </div>
    );
  }
  return null;
};

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data, currency }) => {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
      value: item.totalAmount,
      percentage: item.percentageShare,
      color: CATEGORY_COLORS[item.category.toLowerCase()] || getDeterministicColor(item.category.toLowerCase()),
    }));
  }, [data]);

  if (chartData.length === 0) {
    return <div className="text-center py-10 text-muted-foreground text-sm">No spending data to plot.</div>;
  }

  return (
    <div className="w-full h-[320px] flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CategoryPieTooltip currency={currency} />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => {
              const dataPoint = chartData.find(item => item.name === value);
              return (
                <span className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-all capitalize">
                  {value} ({dataPoint ? `${dataPoint.percentage.toFixed(0)}%` : ''})
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

interface MemberData {
  userId: string;
  username: string;
  totalPaid: number;
  count: number;
}

interface MemberBarChartProps {
  data: MemberData[];
  currency: string;
}

const MemberBarTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-card text-foreground border border-border p-3 rounded-md text-xs flex flex-col gap-1">
        <span className="font-bold text-sm text-primary">{dataPoint.name}</span>
        <span className="font-semibold text-muted-foreground">
          Total Paid: <span className="text-foreground font-black">{currency} {dataPoint.paid.toFixed(2)}</span>
        </span>
        <span className="font-semibold text-muted-foreground">
          Expenses Count: <span className="text-foreground font-black">{dataPoint.count}</span>
        </span>
      </div>
    );
  }
  return null;
};

export const MemberBarChart: React.FC<MemberBarChartProps> = ({ data, currency }) => {
  const chartData = useMemo(() => {
    return data.map((m) => ({
      name: m.username,
      paid: m.totalPaid,
      count: m.count,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return <div className="text-center py-10 text-muted-foreground text-sm">No member contribution logs to plot.</div>;
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${currency}${value}`}
          />
          <Tooltip content={<MemberBarTooltip currency={currency} />} cursor={{ fill: 'hsl(var(--secondary) / 0.25)', radius: 4 }} />
          <Bar
            dataKey="paid"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            maxBarSize={45}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface DailySpend {
  day: number;
  amount: number;
}

interface DailySpendingAreaChartProps {
  data: DailySpend[];
  year: number;
  month: number;
  currency: string;
}

const DailySpendingAreaTooltip = ({ active, payload, currency, year, month }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-card text-foreground border border-border p-3 rounded-md text-xs flex flex-col gap-0.5">
        <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">
          {new Date(year, month - 1, dataPoint.day).toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
        <span className="font-extrabold text-sm text-foreground mt-0.5">
          Spent: {currency} {dataPoint.amount.toFixed(2)}
        </span>
      </div>
    );
  }
  return null;
};

export const DailySpendingAreaChart: React.FC<DailySpendingAreaChartProps> = ({ data, year, month, currency }) => {
  const chartData = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dataMap = new Map(data.map((d) => [d.day, d.amount]));
    
    return Array.from({ length: daysInMonth }, (_, index) => {
      const dayNum = index + 1;
      return {
        day: dayNum,
        amount: dataMap.get(dayNum) || 0,
      };
    });
  }, [data, year, month]);

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="day"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(day) => `Day ${day}`}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${currency}${value}`}
          />
          <Tooltip content={<DailySpendingAreaTooltip currency={currency} year={year} month={month} />} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fillOpacity={1}
            fill="hsl(var(--primary) / 0.05)"
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface MonthlySpend {
  month: number;
  year: number;
  total: number;
}

interface YearlySpendingLineChartProps {
  data: MonthlySpend[];
  currency: string;
}

const MONTHS_ABBR = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const YearlySpendingLineTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const monthName = new Date(dataPoint.year, dataPoint.month - 1, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric'
    });
    return (
      <div className="bg-card text-foreground border border-border p-3 rounded-md text-xs flex flex-col gap-0.5">
        <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">{monthName}</span>
        <span className="font-extrabold text-sm text-foreground mt-0.5">
          Total spent: {currency} {dataPoint.amount.toFixed(2)}
        </span>
      </div>
    );
  }
  return null;
};

export const YearlySpendingLineChart: React.FC<YearlySpendingLineChartProps> = ({ data, currency }) => {
  const chartData = useMemo(() => {
    const getFyIndex = (m: number) => {
      return m >= 4 ? m - 4 : m + 8; 
    };

    const sortedData = [...data].sort((a, b) => getFyIndex(a.month) - getFyIndex(b.month));

    const dataMap = new Map(sortedData.map((d) => [d.month, d.total]));

    const activeYears = data.map((d) => d.year);
    const minYear = activeYears.length > 0 ? Math.min(...activeYears) : new Date().getFullYear();

    return MONTHS_ABBR.map((abbr, index) => {
      const targetMonthVal = index + 4 <= 12 ? index + 4 : index - 8;
      const targetYear = targetMonthVal >= 4 ? minYear : minYear + 1;
      return {
        name: abbr,
        month: targetMonthVal,
        year: targetYear,
        amount: dataMap.get(targetMonthVal) || 0,
      };
    });
  }, [data]);

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${currency}${value}`}
          />
          <Tooltip content={<YearlySpendingLineTooltip currency={currency} />} />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 1.5, fill: 'hsl(var(--card))' }}
            activeDot={{ r: 4, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

interface SpendingHeatmapProps {
  data: DailySpend[];
  year: number;
  month: number;
  currency: string;
}

export const SpendingHeatmap: React.FC<SpendingHeatmapProps> = ({ data, year, month, currency }) => {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const { calendarCells, maxSpend } = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayIndex = new Date(year, month - 1, 1).getDay();

    const dataMap = new Map(data.map((d) => [d.day, d.amount]));
    const maxVal = Math.max(...data.map((d) => d.amount), 1);

    const cells = [];

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, amount: 0, intensity: 0 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const amount = dataMap.get(d) || 0;
      const intensity = amount > 0 ? Math.min(0.2 + (amount / maxVal) * 0.8, 1) : 0;
      cells.push({
        day: d,
        amount,
        intensity,
      });
    }

    return { calendarCells: cells, maxSpend: maxVal };
  }, [data, year, month]);

  return (
    <div className="w-full flex flex-col gap-5 p-1">
      <div className="flex justify-between items-center text-xs text-muted-foreground border-b border-border pb-2">
        <span className="font-bold uppercase tracking-wider">{monthNames[month - 1]} {year} Heatmap</span>
        <span className="flex items-center gap-1.5 font-semibold">
          Max daily spend: <strong className="text-foreground">{currency} {maxSpend.toFixed(0)}</strong>
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center select-none">
        {daysOfWeek.map((day) => (
          <span key={day} className="text-[10px] font-bold text-muted-foreground uppercase py-1">
            {day}
          </span>
        ))}

        {calendarCells.map((cell, idx) => {
          if (cell.day === null) {
            return <div key={`empty-${idx}`} className="aspect-square bg-transparent rounded-md" />;
          }

          const hasSpend = cell.amount > 0;
          return (
            <div
              key={`day-${cell.day}`}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-md border border-border/20 transition-all group cursor-pointer ${
                hasSpend 
                  ? 'hover:border-primary/55' 
                  : 'bg-secondary/20 hover:bg-secondary/40 text-muted-foreground'
              }`}
              style={
                hasSpend
                  ? {
                      backgroundColor: `hsla(var(--primary) / ${cell.intensity})`,
                      color: cell.intensity > 0.5 ? 'white' : 'var(--foreground)',
                    }
                  : {}
              }
            >
              <span className="text-xs font-black">{cell.day}</span>
              {hasSpend && (
                <span className="text-[8px] font-bold mt-0.5 opacity-90 truncate max-w-full px-0.5">
                  {currency}{cell.amount.toFixed(0)}
                </span>
              )}

              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[160px] bg-card text-foreground border border-border text-[10px] font-semibold px-2.5 py-1.5 rounded-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col gap-0.5">
                <span className="text-muted-foreground font-bold">{monthNames[month - 1]} {cell.day}, {year}</span>
                <span className="text-foreground font-black text-xs mt-0.5">
                  {currency} {cell.amount.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-muted-foreground uppercase mt-2">
        <span>Less</span>
        <div className="h-3 w-3 rounded-sm bg-secondary/20 border border-border/20" />
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsla(var(--primary) / 0.25)' }} />
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsla(var(--primary) / 0.5)' }} />
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsla(var(--primary) / 0.75)' }} />
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsla(var(--primary) / 1.0)' }} />
        <span>More</span>
      </div>
    </div>
  );
};
