import { useMemo, useState } from "react";
import type { LabTest } from "../types";

interface TestSearchProps {
  tests: LabTest[];
  selectedIds: string[];
  onAdd: (id: string) => void;
}

export default function TestSearch({
  tests,
  selectedIds,
  onAdd,
}: TestSearchProps) {
  const [query, setQuery] = useState("");

  const filteredTests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tests.filter((test) => {
      const matches =
        test.name.toLowerCase().includes(normalizedQuery) ||
        test.code.toLowerCase().includes(normalizedQuery);

      return matches && !selectedIds.includes(test.id);
    });
  }, [tests, selectedIds, query]);

  return (
    <section className="panel">
      <h2>1. Choose your lab tests</h2>
      <p className="muted">
        Search by test name or code.
      </p>

      <label className="sr-only" htmlFor="test-search">
        Search lab tests
      </label>

      <input
        id="test-search"
        className="search-input"
        type="search"
        placeholder="e.g. HbA1c or HBA1C"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="test-list">
        {filteredTests.map((test) => (
          <div className="test-option" key={test.id}>
            <div className="test-details">
              <strong>{test.name}</strong>
              <span className="muted">
                {test.code} ·{" "}
                {test.price === null
                  ? "Package only"
                  : `$${test.price.toLocaleString()}`}
              </span>
            </div>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => onAdd(test.id)}
              aria-label={`Add ${test.name}`}
            >
              Add
            </button>
          </div>
        ))}

        {filteredTests.length === 0 && (
          <p className="empty-message">
            No matching tests found.
          </p>
        )}
      </div>
    </section>
  );
}
