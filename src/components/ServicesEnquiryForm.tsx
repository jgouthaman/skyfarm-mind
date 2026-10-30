import { useState, type FormEvent } from "react";
import { ENQUIRY_LIMITS, SERVICE_OPTIONS } from "@/constants/services.constants";

// /services enquiry form. `service` is owned by the page so a card's
// "Request a quote" link can pre-select it; the rest is local state.
// Posts to /api/services/enquiry (server validates again and inserts into
// Site_Service_Enquiries). Never fails silently: errors show inline with a
// retry, success replaces the form with a confirmation.
type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

export function ServicesEnquiryForm({
  service,
  onServiceChange,
}: {
  service: string;
  onServiceChange: (value: string) => void;
}) {
  const [name, setName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/services/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, organisation, email, service, message, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "We couldn't send your enquiry. Please try again.");
      setStatus({ kind: "sent" });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "We couldn't send your enquiry. Please try again.",
      });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="hgr-svc-form hgr-svc-form-done" role="status">
        <p className="hgr-svc-form-done-title">Thanks — we'll reply within 2 working days.</p>
        <p className="hgr-svc-note" style={{ marginTop: 8 }}>
          We'll send a secure link for design files after the NDA.
        </p>
      </div>
    );
  }

  const sending = status.kind === "sending";

  return (
    <form className="hgr-svc-form" onSubmit={submit}>
      <div className="hgr-svc-form-grid">
        <div className="hgr-svc-field">
          <label htmlFor="enq-name">Name</label>
          <input id="enq-name" name="name" required maxLength={ENQUIRY_LIMITS.name} autoComplete="name"
            value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="hgr-svc-field">
          <label htmlFor="enq-org">Organisation</label>
          <input id="enq-org" name="organisation" required maxLength={ENQUIRY_LIMITS.organisation} autoComplete="organization"
            value={organisation} onChange={(e) => setOrganisation(e.target.value)} />
        </div>
        <div className="hgr-svc-field">
          <label htmlFor="enq-email">Work email</label>
          <input id="enq-email" name="email" type="email" required maxLength={ENQUIRY_LIMITS.email} autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="hgr-svc-field">
          <label htmlFor="enq-service">Service</label>
          <select id="enq-service" name="service" required value={service} onChange={(e) => onServiceChange(e.target.value)}>
            {SERVICE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="hgr-svc-field hgr-svc-field-full">
          <label htmlFor="enq-message">Your vehicle and what you need to know</label>
          <textarea id="enq-message" name="message" required rows={3} maxLength={ENQUIRY_LIMITS.message}
            value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
        <div className="hgr-svc-hp" aria-hidden="true">
          <label htmlFor="enq-website">Website</label>
          <input id="enq-website" name="website" tabIndex={-1} autoComplete="off"
            value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
      </div>

      {status.kind === "error" && (
        <div className="hgr-svc-error" role="alert">
          <span>{status.message}</span>
          <button type="button" className="hgr-svc-retry" onClick={() => submit()}>Try again</button>
        </div>
      )}

      <div className="hgr-svc-form-actions">
        <button type="submit" className="hgr-pub-btn hgr-pub-btn-amber hgr-svc-submit" disabled={sending}>
          {sending ? "Sending…" : "Send enquiry"}
        </button>
      </div>
    </form>
  );
}
