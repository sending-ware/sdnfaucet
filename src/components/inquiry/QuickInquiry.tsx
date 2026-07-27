import React, { useState, useCallback } from "react";

interface InquiryFormData {
  name: string;
  email: string;
  company: string;
  product: string;
  quantity: string;
  message: string;
}

interface QuickInquiryProps {
  productModel?: string;
  productName?: string;
}

export default function QuickInquiry({
  productModel,
  productName,
}: QuickInquiryProps) {
  const [form, setForm] = useState<InquiryFormData>({
    name: "",
    email: "",
    company: "",
    product: productModel || "",
    quantity: "",
    message: productName
      ? `I'm interested in ${productName} (${productModel}). Please send pricing and MOQ details.`
      : "",
  });
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errors, setErrors] = useState<Partial<InquiryFormData>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Partial<InquiryFormData> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!form.message.trim())
      newErrors.message = "Please describe your requirements";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

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

    try {
      const turnstileToken = (window as any).turnstileToken;
      if (!turnstileToken) {
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
          Inquiry Sent Successfully!
        </h3>
        <p className="mt-2 text-sm text-green-600">
          We'll review your requirements and respond within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="iq-name" className={labelClass}>
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="iq-name"
          name="name"
          value={form.name}
          onChange={handleChange}
          className={`${inputClass} ${errors.name ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
          placeholder="Your full name"
        />
        {errors.name && <p className={errorClass}>{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="iq-email" className={labelClass}>
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="iq-email"
          name="email"
          value={form.email}
          onChange={handleChange}
          className={`${inputClass} ${errors.email ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
          placeholder="your@company.com"
        />
        {errors.email && <p className={errorClass}>{errors.email}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="iq-company" className={labelClass}>
            Company
          </label>
          <input
            type="text"
            id="iq-company"
            name="company"
            value={form.company}
            onChange={handleChange}
            className={inputClass}
            placeholder="Your company"
          />
        </div>
        <div>
          <label htmlFor="iq-quantity" className={labelClass}>
            Quantity (approx.)
          </label>
          <input
            type="text"
            id="iq-quantity"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            className={inputClass}
            placeholder="e.g. 500 pcs"
          />
        </div>
      </div>

      <div>
        <label htmlFor="iq-message" className={labelClass}>
          Requirements <span className="text-red-500">*</span>
        </label>
        <textarea
          id="iq-message"
          name="message"
          rows={4}
          value={form.message}
          onChange={handleChange}
          className={`${inputClass} resize-y ${errors.message ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
          placeholder="Tell us about: target market, finish preference, OEM needs, packaging requirements..."
        />
        {errors.message && <p className={errorClass}>{errors.message}</p>}
      </div>

      <div className="flex justify-center">
        <div id="turnstile-container" className="cf-turnstile"></div>
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
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
            Submitting...
          </span>
        ) : (
          "Send Inquiry Now"
        )}
      </button>

      {status === "error" && (
        <p className="text-center text-sm text-red-500">
          Submission failed. Please try again or email us directly at
          sales@sdnfaucet.com
        </p>
      )}

      <p className="text-center text-xs text-gray-400">
        Protected by Turnstile. Your info is only used to respond to this
        inquiry.
      </p>
    </form>
  );
}
