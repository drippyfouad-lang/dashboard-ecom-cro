'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Modern Revenue Trend Chart Component
 * Displays revenue trends with gradient fill and smooth animations
 */
export default function RevenueTrendChart({ data, timeRange }) {
  const chartData = {
    labels: data.map((item) => item.name),
    datasets: [
      {
        label: 'Revenue (DZD)',
        data: data.map((item) => item.revenue),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.01)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          family: 'Poppins',
          size: 14,
          weight: '600',
        },
        bodyFont: {
          family: 'Poppins',
          size: 13,
        },
        borderColor: 'rgba(99, 102, 241, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            return `Revenue: ${context.parsed.y.toLocaleString()} DZD`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: 'Poppins',
            size: 12,
          },
          color: '#64748b',
        },
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          drawBorder: false,
        },
        ticks: {
          font: {
            family: 'Poppins',
            size: 12,
          },
          color: '#64748b',
          callback: (value) => {
            return (value / 1000).toFixed(0) + 'K';
          },
        },
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  return (
    <div className="h-[350px]">
      <Line data={chartData} options={options} />
    </div>
  );
}
