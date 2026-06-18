// src/components/LiveChart.tsx
import React from 'react';
import CyberTooltip from './CyberTooltip';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
type ChartType = 'line' | 'area' | 'bar' | 'pie';

interface LiveChartProps {
  type: ChartType;
  data: any[];
  dataKey?: string;
  xAxisKey?: string;
  colors?: string | string[];
  title?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

const DEFAULT_COLORS = {
  Drone: '#ff4444',
  Jamming: '#ff8800',
  Normal: '#00c851',
  default: '#00e5ff',
};



const LiveChart: React.FC<LiveChartProps> = ({
  type,
  data,
  dataKey = 'value',
  xAxisKey = 'name',
  colors = DEFAULT_COLORS.default,
  title,
  height = 300,
  showGrid = true,
  showLegend = true,
}) => {
  const getColorArray = (): string[] => {
    if (Array.isArray(colors)) return colors;
    return [colors];
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />}
            <XAxis dataKey={xAxisKey} stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip content={<CyberTooltip />} cursor={{ fill: 'transparent' }} isAnimationActive={false} />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={getColorArray()[0]}
              strokeWidth={2}
              dot={{ fill: getColorArray()[0], r: 4 }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />}
            <XAxis dataKey={xAxisKey} stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip content={<CyberTooltip />} cursor={{ fill: 'transparent' }} isAnimationActive={false} />
            {showLegend && <Legend />}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={getColorArray()[0]}
              fill={getColorArray()[0]}
              fillOpacity={0.1}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />}
            <XAxis dataKey={xAxisKey} stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip content={<CyberTooltip />} cursor={{ fill: 'transparent' }} isAnimationActive={false} />
            {showLegend && <Legend />}
            <Bar dataKey={dataKey} fill={getColorArray()[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey={dataKey}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={DEFAULT_COLORS[entry.name as keyof typeof DEFAULT_COLORS] || DEFAULT_COLORS.default}
                />
              ))}
            </Pie>
            <Tooltip content={<CyberTooltip />} cursor={{ fill: 'transparent' }} isAnimationActive={false} />
            {showLegend && <Legend />}
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default LiveChart;