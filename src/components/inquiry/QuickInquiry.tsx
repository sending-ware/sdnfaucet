import React, { useState, useCallback, useEffect } from "react";

interface InquiryFormData {
  name: string;
  email: string;
  company: string;
  product: string;
  quantity: string;
  message: string;
}

export interface InquiryLabels {
  name: string;
  email: string;
  company: string;
  quantity: string;
  requirements: string;
  namePlaceholder: string;
  emailPlaceholder: string;
  companyPlaceholder: string;
  quantityPlaceholder: string;
  messagePlaceholder: string;
  nameRequired: string;
  emailRequired: string;
  emailInvalid: string;
  messageRequired: string;
  interestTemplate: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successMessage: string;
  errorMessage: string;
  turnstileError: string;
  turnstileRetry: string;
  turnstileConfigMessage: string;
  turnstileFallbackEmail: string;
  turnstileFallbackWhatsApp: string;
  privacyNote: string;
}

const defaultLabels: InquiryLabels = {
  name: "Name",
  email: "Email",
  company: "Company",
  quantity: "Quantity (approx.)",
  requirements: "Requirements",
  namePlaceholder: "Your full name",
  emailPlaceholder: "your@company.com",
  companyPlaceholder: "Your company",
  quantityPlaceholder: "e.g. 500 pcs",
  messagePlaceholder:
    "Tell us about: target market, finish preference, OEM needs, packaging requirements...",
  nameRequired: "Name is required",
  emailRequired: "Email is required",
  emailInvalid: "Please enter a valid email",
  messageRequired: "Please describe your requirements",
  interestTemplate:
    "I'm interested in {productName} ({productModel}). Please send pricing and MOQ details.",
  submit: "Send Inquiry Now",
  submitting: "Submitting...",
  successTitle: "Inquiry Sent Successfully!",
  successMessage: "We'll review your requirements and respond within 24 hours.",
  errorMessage:
    "Submission failed. Please try again or email us directly at sales@sdnfaucet.com",
  turnstileError:
    "Security verification did not complete. Please retry the verification, or contact us directly via email or WhatsApp.",
  turnstileRetry: "Retry Verification",
  turnstileConfigMessage:
    "The inquiry form is temporarily unavailable. Please contact us directly:",
  turnstileFallbackEmail: "Email us",
  turnstileFallbackWhatsApp: "Chat on WhatsApp",
  privacyNote:
    "Protected by Turnstile. Your info is only used to respond to this inquiry.",
};

interface QuickInquiryProps {
  productModel?: string;
  productName?: string;
  inquiryLabels?: Partial<InquiryLabels>;
}

export default function QuickInquiry({
  productModel,
  productName,
  inquiryLabels,
}: QuickInquiryProps) {
  const labels: InquiryLabels = { ...defaultLabels, ...inquiryLabels };

  const [form, setForm] = useState<InquiryFormData>({
    name: "",
    email: "",
    company: "",
    product: productModel || "",
    quantity: "",
    message: productName
      ? labels.interestTemplate
          .replace("{productName}", productName)
          .replace("{productModel}", productModel || "")
      : "",
  });
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errors, setErrors] = useState<Partial<InquiryFormData>>({});
  const [turnstileStatus, setTurnstileStatus] = useState<
    "loading" | "ready" | "error" | "expired" | "unconfigured"
  >("loading");
  // true when the last submit failed because no Turnstile token was available
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    const w = window as any;
    const onSuccess = () => {
      setTurnstileStatus("ready");
      setTokenError(false);
    };
    const onError = () => setTurnstileStatus("error");
    const onExpired = () => setTurnstileStatus("expired");
    window.addEventListener("turnstile:success", onSuccess);
    window.addEventListener("turnstile:error", onError);
    window.addEventListener("turnstile:expired", onExpired);

    // Sync initial state (e.g. site key missing → unconfigured).
    if (w.__turnstileState && w.__turnstileState.status === "unconfigured") {
      setTurnstileStatus("unconfigured");
    }
    // Make sure the widget is rendered now that this component has mounted
    // the container (no-op if it already rendered successfully).
    if (typeof w.__renderTurnstile === "function") {
      w.__renderTurnstile();
    }

    return () => {
      window.removeEventListener("turnstile:success", onSuccess);
      window.removeEventListener("turnstile:error", onError);
      window.removeEventListener("turnstile:expired", onExpired);
    };
  }, []);

  const handleRetry = useCallback(() => {
    setTokenError(false);
    const w = window as any;
    if (typeof w.__retryTurnstile === "function") {
      w.__retryTurnstile();
    }
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Partial<InquiryFormData> = {};
    if (!form.name.trim()) newErrors.name = labels.nameRequired;
    if (!form.email.trim()) {
      newErrors.email = labels.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = labels.emailInvalid;
    }
    if (!form.message.trim())
      newErrors.message = labels.messageRequired;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, labels]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof InquiryFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");
    setTokenError(false);

    try {
      const turnstileToken = (window as any).turnstileToken;
      if (!turnstileToken) {
        setTokenError(true);
        setStatus("error");
        return;
      }

      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken }),
      });

      if (!res.ok) throw new Error("Submission failed");
      setStatus("success");
      (window as any).turnstileToken = undefined;
      if ((window as any).turnstileWidgetId) {
        (window as any).turnstile?.reset(
          (window as any).turnstileWidgetId,
        );
      }
    } catch {
      setStatus("error");
    }
  };

  const inputClass =
    "mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500/20";
  const labelClass = "block text-sm font-medium text-gray-700";
  const errorClass = "mt-1 text-xs text-red-500";

  if (status === "success") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-green-800">
          {labels.successTitle}
        </h3>
        <p className="mt-2 text-sm text-green-600">
          {labels.successMessage}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="iq-name" className={labelClass}>
          {labels.name} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="iq-name"
          name="name"
          value={form.name}
          onChange={handleChange}
          className={`${inputClass} ${errors.name ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
          placeholder={labels.namePlaceholder}
        />
        {errors.name && <p className={errorClass}>{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="iq-email" className={labelClass}>
          {labels.email} <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="iq-email"
          name="email"
          value={form.email}
          onChange={handleChange}
          className={`${inputClass} ${errors.email ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
          placeholder={labels.emailPlaceholder}
        />
        {errors.email && <p className={errorClass}>{errors.email}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="iq-company" className={labelClass}>
            {labels.company}
          </label>
          <input
            type="text"
            id="iq-company"
            name="company"
            value={form.company}
            onChange={handleChange}
            className={inputClass}
            placeholder={labels.companyPlaceholder}
          />
        </div>
        <div>
          <label htmlFor="iq-quantity" className={labelClass}>
            {labels.quantity}
          </label>
          <input
            type="text"
            id="iq-quantity"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            className={inputClass}
            placeholder={labels.quantityPlaceholder}
          />
        </div>
      </div>

      <div>
        <label htmlFor="iq-message" className={labelClass}>
          {labels.requirements} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="iq-message"
          name="message"
          rows={4}
          value={form.message}
          onChange={handleChange}
          className={`${inputClass} resize-y ${errors.message ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
          placeholder={labels.messagePlaceholder}
        />
        {errors.message && <p className={errorClass}>{errors.message}</p>}
      </div>

      <div className="flex justify-center">
        <div id="turnstile-container" className="cf-turnstile"></div>
      </div>

      {turnstileStatus === "unconfigured" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="text-center">{labels.turnstileConfigMessage}</p>
          <p className="mt-2 flex flex-wrap items-center justify-center gap-4">
            <a
              href="mailto:sending@sdnfaucet.com"
              className="text-ocean-600 underline hover:text-ocean-700"
            >
              {labels.turnstileFallbackEmail}
            </a>
            <a
              href="https://wa.me/8613064536291"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ocean-600 underline hover:text-ocean-700"
            >
              {labels.turnstileFallbackWhatsApp}
            </a>
          </p>
        </div>
      )}

      {(turnstileStatus === "error" || turnstileStatus === "expired") &&
        !tokenError && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-center text-sm text-red-500">
              {labels.turnstileError}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-lg border border-ocean-600 px-4 py-1.5 text-sm font-medium text-ocean-600 transition-colors hover:bg-ocean-50"
            >
              {labels.turnstileRetry}
            </button>
          </div>
        )}

      <button
        type="submit"
        disabled={status === "submitting" || turnstileStatus === "unconfigured"}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {labels.submitting}
          </span>
        ) : (
          labels.submit
        )}
      </button>

      {status === "error" && (
        <div className="text-center">
          <p className="text-sm text-red-500">
            {tokenError ? labels.turnstileError : labels.errorMessage}
          </p>
          {tokenError && (
            <button
              type="button"
              onClick={handleRetry}
              className="mt-2 rounded-lg border border-ocean-600 px-4 py-1.5 text-sm font-medium text-ocean-600 transition-colors hover:bg-ocean-50"
            >
              {labels.turnstileRetry}
            </button>
          )}
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        {labels.privacyNote}
      </p>
    </form>
  );
}
