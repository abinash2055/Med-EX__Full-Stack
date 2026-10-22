import { useEffect, useRef, useState } from "react";
import TestSearch from "./components/TestSearch";
import SelectedTests from "./components/SelectedTests";
import PlanResult from "./components/PlanResult";
import { ApiRequestError, fetchPlan, fetchTests } from "./api";
import type { LabTest, PlanResult as Plan } from "./types";
import "./App.css";

function readableError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "INVALID_TESTS":
        return error.testIds.length
          ? `Some selected tests are unknown or unavailable: ${error.testIds.join(", ")}. Please review your selection.`
          : "Some selected tests are invalid. Please refresh and try again.";

      case "NOT_AVAILABLE":
        return error.testIds.length
          ? `These tests cannot currently be obtained: ${error.testIds.join(", ")}.`
          : "No available package or individual test combination can cover your selection.";

      case "EMPTY_SELECTION":
        return "Please select at least one lab test.";

      default:
        return "The server couldn't calculate your plan. Please try again.";
    }
  }

  return "Unable to connect to the server. Check that the backend is running and try again.";
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
    setSelectedIds((current) => current.filter((item) => item !== id));
  }

  if (loadingTests) {
    return (
      <main className="app-shell">
        <p className="status-message">Loading available lab tests…</p>
      </main>
    );
  }

  if (catalogError) {
    return (
      <main className="app-shell">
        <div className="error-message" role="alert">
          <h1>Lab Test Bundle Finder</h1>
          <p>{catalogError}</p>
          <button
            className="button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">MEDEX HEALTHCARE</p>
        <h1>Lab Test Bundle Finder</h1>
        <p>
          Choose the tests your doctor recommended. We'll find
          the lowest-cost combination of packages and individual
          tests for you.
        </p>
      </header>

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

      <footer>
        Prices are shown in Thai baht (฿). Confirm test
        availability with your chosen laboratory before booking.
      </footer>
    </main>
  );
}
