import { useState, useEffect } from "react";
import "./App.css";
import { stravaAuth } from "./services/stravaAuth";
import { ActivityChart } from "./components/ActivityChart";
import "./components/ActivityChart.css";

interface Category {
  id: number;
  title: string;
  description: string;
  image: string;
}

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const checkAuth = () => {
    const authenticated = stravaAuth.isAuthenticated();
    setIsAuthenticated(authenticated);
    if (!authenticated) {
      // Clear any existing auth errors when not authenticated
      setError(null);
    }
  };

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      const errorDescription = params.get("error_description");

      console.log("URL params:", {
        code: code ? `${code.substring(0, 10)}...` : code,
        error,
        errorDescription,
        fullUrl: window.location.href,
      });

      if (error) {
        console.error("OAuth error:", error, errorDescription);
        setError(`Authentication failed: ${error}`);
        setLoading(false);
        return;
      }

      if (code) {
        try {
          setLoading(true);
          setError(null);
          await stravaAuth.handleCallback(code);
          checkAuth();
          // Remove code from URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        } catch (err) {
          console.error("Auth error:", err);
          setError("Authentication failed");
          setIsAuthenticated(false);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    handleCallback();
    checkAuth();
  }, []);

  const handleLogout = () => {
    stravaAuth.logout();
    checkAuth();
    setError(null);
  };

  const categories: Category[] = [
    {
      id: 1,
      title: "Activity Tracking",
      description: "Connect with Strava to sync your activities automatically",
      image:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3",
    },
    {
      id: 2,
      title: "Performance Analytics",
      description: "Get detailed insights into your training and performance",
      image:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3",
    },
    {
      id: 3,
      title: "Progress Tracking",
      description:
        "Monitor your improvements over time with detailed statistics",
      image:
        "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3",
    },
    {
      id: 4,
      title: "Custom Reports",
      description: "Create personalized reports for your activities",
      image:
        "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?ixlib=rb-4.0.3",
    },
  ];

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>
            Velo<span>Viewer</span>
          </h1>
          <div className="auth-buttons">
            {!isAuthenticated ? (
              <button onClick={() => stravaAuth.login()} className="strava-btn">
                <svg
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
                Connect with Strava
              </button>
            ) : (
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="app-content">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            {isAuthenticated ? (
              <ActivityChart />
            ) : (
              <div className="welcome-message">
                <h2>
                  Optimising personal performance and professional success
                </h2>
                <p>
                  Connect with Strava to unlock detailed insights and
                  visualizations of your activities
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <section className="features">
        {categories.map((category) => (
          <div key={category.id} className="feature-card">
            <div className="feature-icon">
              <img
                src={category.image}
                alt={category.title}
                className="feature-image"
              />
            </div>
            <div className="feature-content">
              <h3>{category.title}</h3>
              <p>{category.description}</p>
            </div>
          </div>
        ))}
      </section>

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Connect with Strava</h2>
            <div className="auth-form">
              <button
                type="button"
                className="strava-button"
                onClick={() => stravaAuth.login()}
              >
                <img
                  src="/strava-logo.svg"
                  alt="Strava"
                  className="strava-icon"
                />
                Continue with Strava
              </button>
            </div>
            <button
              className="close-button"
              onClick={() => setShowLoginModal(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
