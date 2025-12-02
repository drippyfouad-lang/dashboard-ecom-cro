'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Modern Profit & Loss Chart Component
 * Displays profit and expenses comparison with dynamic colors
 */
export default function ProfitLossChart({ data }) {
  const chartData = {
    labels: data.map((item) => item.name),
    datasets: [
      {
        label: 'Income',
        data: data.map((item) => item.income),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Expenses',
        data: data.map((item) => item.expenses),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            family: 'Poppins',
            size: 13,
            weight: '500',
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
        },
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
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} DZD`;
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
  };

  return (
    <div className="h-[320px]">
      <Bar data={chartData} options={options} />
    </div>
  );
}
