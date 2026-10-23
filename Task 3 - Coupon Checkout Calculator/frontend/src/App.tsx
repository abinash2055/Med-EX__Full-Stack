import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  type CartLine,
  type CheckoutRequest,
  type Quote,
  type Service,
} from "./api";
import "./index.css";

function money(value: string | undefined): string {
  return `฿${Number(value ?? "0").toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [couponCodes, setCouponCodes] = useState<string[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [customerId, setCustomerId] = useState<string | null>("C1");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [quoting, setQuoting] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [orderId, setOrderId] = useState("");
  const [confirmUpdatedTotal, setConfirmUpdatedTotal] =
    useState(false);

  const cartBody = useMemo<CheckoutRequest>(
    () => ({
      lines: cart,
      couponCodes,
      customerId,
    }),
    [cart, couponCodes, customerId]
  );

  const serviceMap = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services]
  );

  useEffect(() => {
    api.getServices()
      .then(setServices)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingServices(false));
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (cart.length === 0) {
      setQuote(null);
      setQuoting(false);
      setError("");
      return;
    }

    setQuoting(true);

    api.quote(cartBody)
      .then((result) => {
        if (!cancelled) {
          setQuote(result);
          setError("");
          setConfirmUpdatedTotal(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setQuoting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cartBody, cart]);

  const addService = useCallback((serviceId: string) => {
    setCart((current) => {
      const existing = current.find(
        (line) => line.serviceId === serviceId
      );

      if (existing) {
        if (existing.quantity >= 20) return current;

        return current.map((line) =>
          line.serviceId === serviceId
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }

      return [...current, { serviceId, quantity: 1 }];
    });

    setSuccess("");
    setOrderId("");
  }, []);

  function updateQuantity(serviceId: string, quantity: number) {
    if (quantity < 1) {
      removeService(serviceId);
      return;
    }

    setCart((current) =>
      current.map((line) =>
        line.serviceId === serviceId
          ? { ...line, quantity: Math.min(quantity, 20) }
          : line
      )
    );

    setSuccess("");
  }

  function removeService(serviceId: string) {
    setCart((current) =>
      current.filter((line) => line.serviceId !== serviceId)
    );

    setSuccess("");
  }

  function addCoupon() {
    const code = couponInput.trim().toUpperCase();

    if (!code) return;

    if (couponCodes.includes(code)) {
      setError("This code is already applied.");
      return;
    }

    if (couponCodes.length >= 2) {
      setError("You can use up to 2 codes per order.");
      return;
    }

    setCouponCodes((current) => [...current, code]);
    setCouponInput("");
    setError("");
    setSuccess("");
  }

  function removeCoupon(code: string) {
    setCouponCodes((current) =>
      current.filter((item) => item !== code)
    );

    setError("");
    setSuccess("");
    setConfirmUpdatedTotal(false);
  }

  async function placeOrder() {
    if (!quote || cart.length === 0 || placingOrder || quoting) {
      return;
    }

    setPlacingOrder(true);
    setError("");
    setSuccess("");

    try {
      const result = await api.order(cartBody);

      setQuote(result.quote);
      setOrderId(result.orderId);
      setSuccess(result.message);
      setCart([]);
      setCouponCodes([]);
      setConfirmUpdatedTotal(false);
    } catch (caught) {
      const err = caught as Error & {
        status?: number;
        data?: {
          quote?: Quote;
          unavailableCodes?: string[];
        };
      };

      if (err.status === 409 && err.data?.quote) {
        setQuote(err.data.quote);
        setConfirmUpdatedTotal(true);

        const unavailable = err.data.unavailableCodes ?? [];
        const newTotal = err.data.quote.total;

        setError(
          unavailable.length
            ? `${unavailable.join(", ")} is no longer available; your total is now ${money(newTotal)}. Please confirm the updated total before ordering.`
            : `Your total has changed to ${money(newTotal)}. Please confirm the updated total before ordering.`
        );
      } else {
        setError(err.message);
      }
    } finally {
      setPlacingOrder(false);
    }
  }

  const subtotal = quote?.subtotal ?? "0.00";

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-icon">M</span>
          <span>MedEx</span>
        </a>
        <span className="secure-label">Secure checkout</span>
      </header>

      <section className="intro">
        <p className="eyebrow">HEALTHCARE MARKETPLACE</p>
        <h1>Your health, your way.</h1>
        <p>
          Review your services, apply coupon codes, and see
          exactly how your total is calculated.
        </p>
      </section>

      {
        error && (
          <div className="notice error" role="alert">
            <strong>Attention</strong>
            <p>{error}</p>
          </div>
        )}

      {
        success && (
          <div className="notice success" role="status">
            <strong>Order confirmed!</strong>
            <p>{success}</p>
            <p>Order reference: {orderId}</p>
          </div>
        )}

      <div className="layout">
        <section className="panel services-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">EXPLORE</p>
              <h2>Available services</h2>
            </div>
            <span className="count">{services.length} services</span>
          </div>

          {
            loadingServices ? (
              <p className="muted">Loading services...</p>
            ) : services.length === 0 ? (
              <p className="muted">No services are available.</p>
            ) : (
              <div className="service-list">
                {
                  services.map((service) => {
                    const quantity =
                      cart.find((line) => line.serviceId === service.id)
                        ?.quantity ?? 0;

                    return (
                      <article className="service-card" key={service.id}>
                        <div className="service-info">
                          <span className="service-type">
                            {service.type.replace("_", " ")}
                          </span>
                          <h3>{service.title}</h3>
                          <p>{service.providerName}</p>
                          <strong className="service-price">
                            {money(service.price)}
                          </strong>
                        </div>

                        <button
                          className="add-button"
                          onClick={() => addService(service.id)}
                          disabled={quantity >= 20}
                        >
                          {quantity ? `Add more (${quantity})` : "Add"}
                        </button>
                      </article>
                    );
                  })}
              </div>
            )}
        </section>

        <aside className="panel checkout-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR ORDER</p>
              <h2>Checkout</h2>
            </div>
            <span className="count">
              {cart.reduce((sum, line) => sum + line.quantity, 0)} items
            </span>
          </div>

          <label className="field-label" htmlFor="customer">
            Customer
          </label>
          <select
            id="customer"
            className="select-field"
            value={customerId ?? ""}
            onChange={(event) => {
              setCustomerId(event.target.value || null);
              setSuccess("");
            }}
          >
            <option value="C1">Anong (C1)</option>
            <option value="C2">Bishal (C2)</option>
            <option value="C3">Chaya (C3)</option>
            <option value="">Guest checkout</option>
          </select>

          <div className="cart-list">
            {
              cart.length === 0 ? (
                <div className="empty-cart">
                  <span className="empty-icon">♡</span>
                  <h3>Your cart is empty</h3>
                  <p>Add a service to get started.</p>
                </div>
              ) : (
                cart.map((line) => {
                  const service = serviceMap.get(line.serviceId);
                  if (!service) return null;

                  const quoteLine = quote?.lines.find(
                    (item) => item.serviceId === line.serviceId
                  );

                  return (
                    <article className="cart-item" key={line.serviceId}>
                      <div className="cart-item-heading">
                        <div>
                          <h3>{service.title}</h3>
                          <p>{money(service.price)} each</p>
                        </div>
                        <button
                          className="remove-button"
                          onClick={() => removeService(line.serviceId)}
                          aria-label={`Remove ${service.title}`}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="quantity-row">
                        <div className="quantity-control">
                          <button
                            onClick={() =>
                              updateQuantity(
                                line.serviceId,
                                line.quantity - 1
                              )
                            }
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span>{line.quantity}</span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                line.serviceId,
                                line.quantity + 1
                              )
                            }
                            disabled={line.quantity >= 20}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <strong>
                          {
                            money(quoteLine?.amount ??
                              String(Number(service.price) * line.quantity))}
                        </strong>
                      </div>

                      {
                        quoteLine &&
                        Object.entries(quoteLine.discounts).map(
                          ([code, amount]) => (
                            <div className="discount-row" key={code}>
                              <span>{code} discount</span>
                              <span>−{money(amount)}</span>
                            </div>
                          )
                        )}

                      {
                        quoteLine && (
                          <div className="after-discount">
                            <span>After discounts</span>
                            <strong>
                              {money(quoteLine.amountAfterDiscounts)}
                            </strong>
                          </div>
                        )}
                    </article>
                  );
                })
              )}
          </div>

          <div className="coupon-section">
            <label className="field-label" htmlFor="coupon">
              Coupon codes
            </label>

            <form
              className="coupon-form"
              onSubmit={(event) => {
                event.preventDefault();
                addCoupon();
              }}
            >
              <input
                id="coupon"
                value={couponInput}
                onChange={(event) =>
                  setCouponInput(event.target.value)
                }
                placeholder="Enter coupon code"
                autoComplete="off"
              />
              <button type="submit" className="secondary-button">
                Apply
              </button>
            </form>

            {
              couponCodes.length > 0 && (
                <div className="coupon-chips">
                  {couponCodes.map((code) => {
                    const result = quote?.coupons.find(
                      (coupon) => coupon.code === code
                    );

                    return (
                      <div className="coupon-result" key={code}>
                        <div className="coupon-chip">
                          <span>{code}</span>
                          <button
                            onClick={() => removeCoupon(code)}
                            aria-label={`Remove ${code}`}
                          >
                            ×
                          </button>
                        </div>

                        {
                          result && (
                            <p
                              className={
                                result.status === "applied"
                                  ? "coupon-applied"
                                  : "coupon-rejected"
                              }
                            >
                              {result.status === "applied"
                                ? `Applied: −${money(result.discount)}`
                                : result.reason}
                            </p>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}
          </div>

          <div className="totals">
            <div>
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="discount-total">
              <span>Discounts</span>
              <span>−{money(quote?.discountTotal)}</span>
            </div>
            <div>
              <span>Net amount</span>
              <span>{money(quote?.netAmount)}</span>
            </div>
            <div>
              <span>VAT (7%)</span>
              <span>{money(quote?.vat)}</span>
            </div>
            <div className="grand-total">
              <strong>Total</strong>
              <strong>{money(quote?.total)}</strong>
            </div>
          </div>

          {
            quoting && (
              <p className="muted loading-text">
                Updating your quote...
              </p>
            )}

          <button
            className="checkout-button"
            onClick={placeOrder}
            disabled={
              cart.length === 0 ||
              !quote ||
              quoting ||
              placingOrder
            }
          >
            {
              placingOrder
                ? "Processing..."
                : confirmUpdatedTotal
                  ? "Confirm updated total"
                  : "Place order"}
          </button>

          <p className="fine-print">
            Your total includes a 7% VAT calculation. Prices are
            shown in Thai baht (THB).
          </p>
        </aside>
      </div>

      <footer className="footer">
        MedEx Checkout Calculator · Demo application
      </footer>
    </main>
  );
}

export default App;