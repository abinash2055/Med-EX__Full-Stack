import type { LabTest, PlanResult as Plan } from "../types";

interface PlanResultProps {
    plan: Plan | null;
    tests: LabTest[];
    loading: boolean;
    error: string | null;
    selectedCount: number;
}

function formatPrice(price: number) {
    return `฿${price.toLocaleString("en-US")}`;
}

export default function PlanResult({
    plan,
    tests,
    loading,
    error,
    selectedCount,
}: PlanResultProps) {
    const testNames = new Map(
        tests.map((test) => [
            test.id,
            test.name
        ]),
    );

    return (
        <section className="panel result-panel" aria-live="polite">
            <h2>3. Your cheapest plan</h2>

            {selectedCount === 0 ? (
                <p className="empty-message">
                    Select one or more tests to see your recommended plan.
                </p>
            ) : loading ? (
                <p className="status-message">
                    Calculating the cheapest plan…
                </p>
            ) : error ? (
                <div className="error-message" role="alert">
                    <strong>We couldn't calculate your plan.</strong>
                    <p>{error}</p>
                </div>
            ) : plan ? (
                <>
                    <div className="plan-items">
                        {
                            plan.items.map((item) => (
                                <article className="plan-item" key={`${item.type}-${item.id}`}>
                                    <div className="plan-item-heading">
                                        <div>
                                            <span className="item-type">
                                                {
                                                    item.type === "package"
                                                        ? "PACKAGE"
                                                        : "INDIVIDUAL TEST"
                                                }
                                            </span>
                                            <h3>{item.name}</h3>
                                            <span className="muted">ID: {item.id}</span>
                                        </div>

                                        <strong className="item-price">
                                            {formatPrice(item.price)}
                                        </strong>
                                    </div>

                                    <div className="coverage">
                                        <strong>Selected tests covered</strong>
                                        <ul>
                                            {
                                                item.covers.map((id) => (
                                                    <li key={id}>
                                                        {testNames.get(id) ?? id}
                                                    </li>
                                                ))}
                                        </ul>
                                    </div>
                                </article>
                            ))}
                    </div>

                    {
                        plan.extraTests.length > 0 && (
                            <div className="bonus-box">
                                <strong>Bonus tests included</strong>
                                <ul>
                                    {
                                        plan.extraTests.map((id) => (
                                            <li key={id}>{testNames.get(id) ?? id}</li>
                                        ))}
                                </ul>
                            </div>
                        )}

                    <div className="price-summary">
                        <div className="summary-row">
                            <span>Total price</span>
                            <strong className="total-price">
                                {formatPrice(plan.total)}
                            </strong>
                        </div>

                        {
                            plan.individualTotal !== null && (
                                <div className="summary-row">
                                    <span>Buying tests individually</span>
                                    <span>{formatPrice(plan.individualTotal)}</span>
                                </div>
                            )}

                        {
                            plan.savings !== null && plan.savings > 0 && (
                                <div className="savings-row">
                                    <span>You save</span>
                                    <strong>{formatPrice(plan.savings)}</strong>
                                </div>
                            )}
                    </div>
                </>
            ) : (
                <p className="muted">
                    Your plan will appear here.
                </p>
            )}
        </section>
    );
}
