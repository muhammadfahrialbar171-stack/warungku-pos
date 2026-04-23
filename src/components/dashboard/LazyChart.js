'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  ArcElement,
  PieController,
  DoughnutController,
  Legend,
  BarController,
  LineController,
} from "chart.js";
import { Chart, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Filler,
  Tooltip,
  ArcElement,
  PieController,
  DoughnutController,
  Legend
);

export function DashboardChart({ data, options }) {
  return <Chart type="bar" data={data} options={options} />;
}

export function DashboardDoughnut({ data, options }) {
  return <Doughnut data={data} options={options} />;
}
