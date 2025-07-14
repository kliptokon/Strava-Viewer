import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { api } from "../services/api";
import type { StravaActivity } from "../services/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const options = {
  responsive: true,
  plugins: {
    legend: {
      position: "top" as const,
    },
    title: {
      display: true,
      text: "Last Activity Segments",
    },
  },
  scales: {
    y: {
      title: {
        display: true,
        text: "Elevation (m)",
      },
    },
    x: {
      title: {
        display: true,
        text: "Segments",
      },
    },
  },
};

export function ActivityChart() {
  const [activity, setActivity] = useState<StravaActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        console.log("Fetching activity...");
        const data = await api.getLastActivity();
        console.log("Activity data:", data);
        setActivity(data);
      } catch (err) {
        console.error("Error fetching activity:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch activity"
        );
      }
    };

    fetchActivity();
  }, []);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!activity) {
    console.log("No activity data yet...");
    return <div>Loading activity data...</div>;
  }

  console.log("Rendering chart with activity:", activity);

  const data = {
    labels: activity.segment_efforts.map((effort) => effort.segment.name),
    datasets: [
      {
        label: "Elevation Profile",
        data: activity.segment_efforts.map(
          (effort) => effort.segment.total_elevation_gain
        ),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
      },
      {
        label: "Grade",
        data: activity.segment_efforts.map(
          (effort) => effort.segment.average_grade
        ),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
    ],
  };

  return (
    <div className="activity-chart">
      <h2>{activity.name}</h2>
      <div className="activity-stats">
        <p>Distance: {(activity.distance / 1000).toFixed(2)}km</p>
        <p>
          Time: {Math.floor(activity.moving_time / 60)}min{" "}
          {activity.moving_time % 60}s
        </p>
        <p>Elevation Gain: {activity.total_elevation_gain}m</p>
      </div>
      <Line options={options} data={data} />
    </div>
  );
}
