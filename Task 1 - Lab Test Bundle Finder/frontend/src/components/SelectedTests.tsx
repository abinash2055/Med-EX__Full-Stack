import type { LabTest } from "../types";

interface SelectedTestsProps {
  tests: LabTest[];
  selectedIds: string[];
  onRemove: (id: string) => void;
}

export default function SelectedTests({
  tests,
  selectedIds,
  onRemove,
}: SelectedTestsProps) {
  const selectedTests = selectedIds
    .map((id) => tests.find((test) => test.id === id))
    .filter((test): test is LabTest => Boolean(test));

  return (
    <section className="panel">
      <h2>2. Your selected tests</h2>

      {selectedTests.length === 0 ? (
        <p className="muted">
          Your selection is empty. Add tests above to find the
          cheapest plan.
        </p>
      ) : (
        <div className="chips">
          {selectedTests.map((test) => (
            <span className="chip" key={test.id}>
              {test.name}

              <button
                type="button"
                onClick={() => onRemove(test.id)}
                aria-label={`Remove ${test.name}`}
                title={`Remove ${test.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="muted selection-count">
        {selectedTests.length}{" "}
        {selectedTests.length === 1 ? "test" : "tests"} selected
      </p>
    </section>
  );
}
