import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { StravaActivity } from "../services/api";

export function ActivityChart() {
  const [activity, setActivity] = useState<StravaActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const data = await api.getLastActivity();
        setActivity(data);
      } catch (err) {
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
    return (
      <div className="activity-card">
        <div className="loading">Loading activity data...</div>
      </div>
    );
  }

  const formatDistance = (meters: number) => {
    return (meters / 1000).toFixed(2) + " km";
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}min ${remainingSeconds}s`;
    }
    return `${minutes}min ${remainingSeconds}s`;
  };

  const formatSpeed = (metersPerSecond: number) => {
    const kmh = (metersPerSecond * 3.6).toFixed(1);
    return `${kmh} km/h`;
  };

  const formatPace = (metersPerSecond: number) => {
    const paceMinutesPerKm = 1000 / (metersPerSecond * 60);
    const minutes = Math.floor(paceMinutesPerKm);
    const seconds = Math.round((paceMinutesPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="activity-card">
      <div className="activity-header">
        <h2>{activity.name}</h2>
        <div className="activity-stats">
          <div className="stat-item">
            <span className="stat-label">Distance</span>
            <span className="stat-value">
              {formatDistance(activity.distance)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Time</span>
            <span className="stat-value">
              {formatTime(activity.elapsed_time)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Elevation Gain</span>
            <span className="stat-value">{activity.total_elevation_gain}m</span>
          </div>
        </div>
      </div>

      {activity.segment_efforts && activity.segment_efforts.length > 0 && (
        <div className="segments-section">
          <h3>Segment Efforts</h3>
          <div className="segments-table">
            <div className="table-header">
              <div className="header-cell">Order</div>
              <div className="header-cell">Name</div>
              <div className="header-cell">Elapsed Time</div>
              <div className="header-cell">Moving Time</div>
              <div className="header-cell">PR Pos</div>
              <div className="header-cell">PR Tries</div>
              <div className="header-cell">Score</div>
              <div className="header-cell">Behind PR</div>
              <div className="header-cell">Behind Leader</div>
              <div className="header-cell">KOM</div>
              <div className="header-cell">Distance</div>
              <div className="header-cell">Max Elev</div>
              <div className="header-cell">Speed</div>
              <div className="header-cell">Pace</div>
              <div className="header-cell">Heart Rate</div>
              <div className="header-cell">Max Power</div>
              <div className="header-cell">Grade</div>
              <div className="header-cell">Elev Gain</div>
            </div>

            {activity.segment_efforts.map((effort, index) => (
              <div key={effort.id} className="table-row">
                <div className="table-cell">{index + 1}</div>
                <div className="table-cell segment-name">
                  {effort.segment.name}
                </div>
                <div className="table-cell">
                  {formatTime(effort.elapsed_time)}
                </div>
                <div className="table-cell">
                  {formatTime(effort.moving_time)}
                </div>
                <div className="table-cell">{effort.pr_rank || "-"}</div>
                <div className="table-cell">
                  {effort.achievements?.length || 0}
                </div>
                <div className="table-cell">-</div>
                <div className="table-cell">-</div>
                <div className="table-cell">-</div>
                <div className="table-cell">-</div>
                <div className="table-cell">
                  {formatDistance(effort.segment.distance)}
                </div>
                <div className="table-cell">
                  {effort.segment.elevation_high}m
                </div>
                <div className="table-cell">
                  {formatSpeed(effort.segment.distance / effort.elapsed_time)}
                </div>
                <div className="table-cell">
                  {formatPace(effort.segment.distance / effort.elapsed_time)}
                </div>
                <div className="table-cell">
                  {effort.average_heartrate
                    ? Math.round(effort.average_heartrate)
                    : "-"}
                </div>
                <div className="table-cell">
                  {effort.average_watts
                    ? Math.round(effort.average_watts)
                    : "-"}
                </div>
                <div className="table-cell">
                  {effort.segment.average_grade.toFixed(1)}%
                </div>
                <div className="table-cell">
                  {effort.segment.total_elevation_gain}m
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
