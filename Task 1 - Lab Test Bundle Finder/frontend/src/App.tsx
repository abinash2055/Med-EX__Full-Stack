import {
  useEffect,
  useRef,
  useState
} from "react";
import TestSearch from "./components/TestSearch";
import SelectedTests from "./components/SelectedTests";
import PlanResult from "./components/PlanResult";
import {
  ApiRequestError,
  fetchPlan,
  fetchTests
} from "./api";
import type {
  LabTest,
  PlanResult as Plan
} from "./types";
import "./App.css";

function readableError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "INVALID_TESTS":
        return error.testIds.length
          ? `Some selected tests are invalid or unavailable: ${error.testIds.join(", ")}.`
          : "Some selected tests are invalid. Please refresh and try again.";

      case "NOT_AVAILABLE":
        return error.testIds.length
          ? `These tests cannot currently be obtained: ${error.testIds.join(", ")}.`
          : "No available combination of packages and individual tests covers your selection.";

      case "EMPTY_SELECTION":
        return "Please select at least one lab test.";

      default:
        return "The server couldn't calculate your plan. Please try again.";
    }
  }

  return "Unable to connect to the server. Please check that the backend is running.";
}

export default function App() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadingTests, setLoadingTests] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const requestSequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchTests(controller.signal)
      .then((data) => {
        setTests(data);
        setCatalogError(null);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setCatalogError(readableError(error));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingTests(false);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    const controller = new AbortController();

    if (selectedIds.length === 0) {
      setPlan(null);
      setPlanError(null);
      setLoadingPlan(false);

      return () => controller.abort();
    }

    setPlan(null);
    setPlanError(null);
    setLoadingPlan(true);

    fetchPlan(selectedIds, controller.signal)
      .then((result) => {
        if (sequence !== requestSequence.current) return;
        setPlan(result);
      })
      .catch((error: unknown) => {
        if (
          controller.signal.aborted ||
          sequence !== requestSequence.current
        ) {
          return;
        }

        setPlan(null);
        setPlanError(readableError(error));
      })
      .finally(() => {
        if (
          !controller.signal.aborted &&
          sequence === requestSequence.current
        ) {
          setLoadingPlan(false);
        }
      });

    return () => controller.abort();
  }, [selectedIds]);

  function addTest(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
  }

  function removeTest(id: string) {
    setSelectedIds((current) =>
      current.filter((item) => item !== id),
    );
  }

  if (loadingTests) {
    return (
      <main className="app-shell">
        <div className="loading-screen" role="status">
          <div className="loading-icon">M</div>
          <h1>MedEx</h1>
          <p className="muted">Loading available lab tests...</p>
        </div>
      </main>
    );
  }

  if (catalogError) {
    return (
      <main className="app-shell">
        <section className="error-message" role="alert">
          <p className="eyebrow">MEDEX HEALTHCARE</p>
          <h1>Lab Test Bundle Finder</h1>
          <p>{catalogError}</p>
          <button
            type="button"
            className="button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-content">
          <div className="brand-label">
            <span className="brand-icon">M</span>
            <span>MEDEX HEALTHCARE</span>
          </div>

          <p className="hero-tag">SMARTER HEALTHCARE, BETTER VALUE</p>

          <h1>
            Find the right tests.
            <br />
            <span>Pay less for healthcare.</span>
          </h1>

          <p className="hero-description">
            Select the lab tests you need and discover the most
            affordable combination of packages and individual tests.
          </p>

          <div className="hero-highlights">
            <span>
              <span className="highlight-check">✓</span>
              Smart price comparison
            </span>
            <span>
              <span className="highlight-check">✓</span>
              Automatic savings calculation
            </span>
          </div>
        </div>

        <div className="hero-decoration" aria-hidden="true">
          <div className="medical-symbol">+</div>
          <div className="decoration-circle circle-one" />
          <div className="decoration-circle circle-two" />
        </div>
      </header>

      <section className="workflow-intro">
        <div>
          <p className="section-eyebrow">YOUR HEALTHCARE PLANNER</p>
          <h2>Plan your lab tests in 3 simple steps</h2>
          <p>
            Choose your tests, review your selection, and find your
            cheapest available plan.
          </p>
        </div>

        <div className="selection-indicator">
          <span className="indicator-dot" />
          {selectedIds.length}{" "}
          {selectedIds.length === 1 ? "test" : "tests"} selected
        </div>
      </section>

      <div className="layout">
        <div className="selection-column">
          <TestSearch
            tests={tests}
            selectedIds={selectedIds}
            onAdd={addTest}
          />

          <SelectedTests
            tests={tests}
            selectedIds={selectedIds}
            onRemove={removeTest}
          />
        </div>

        <div className="result-column">
          <PlanResult
            plan={plan}
            tests={tests}
            loading={loadingPlan}
            error={planError}
            selectedCount={selectedIds.length}
          />
        </div>
      </div>

      <footer className="app-footer">
        <div className="footer-brand">
          <span className="footer-brand-icon">M</span>
          <span>MedEx Healthcare</span>
        </div>

        <p>
          Prices are shown in Thai baht (฿). Confirm test availability
          with your chosen laboratory before booking.
        </p>

        <span className="footer-caption">
          Your health. Your choice. Better value.
        </span>
      </footer>
    </main>
  );
}
