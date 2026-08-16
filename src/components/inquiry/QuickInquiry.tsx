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
  lang?: string;
  labels?: {
    name?: string;
    namePlaceholder?: string;
    email?: string;
    emailPlaceholder?: string;
    company?: string;
    companyPlaceholder?: string;
    quantity?: string;
    quantityPlaceholder?: string;
    message?: string;
    messagePlaceholder?: string;
    submit?: string;
    submitting?: string;
    successTitle?: string;
    successText?: string;
    errorText?: string;
    emailFailedText?: string;
    retry?: string;
    privacy?: string;
    errorNameRequired?: string;
    errorEmailRequired?: string;
    errorEmailInvalid?: string;
    errorMessageRequired?: string;
  };
}

export default function QuickInquiry({
  productModel,
  productName,
  lang = "en",
  labels = {},
}: QuickInquiryProps) {
  const t = {
    name: "Name",
    namePlaceholder: "Your full name",
    email: "Email",
    emailPlaceholder: "your@company.com",
    company: "Company",
    companyPlaceholder: "Your company",
    quantity: "Quantity (approx.)",
    quantityPlaceholder: "e.g. 500 pcs",
    message: "Requirements",
    messagePlaceholder:
      "Tell us about: target market, finish preference, OEM needs, packaging requirements...",
    submit: "Send Inquiry Now",
    submitting: "Submitting...",
    successTitle: "Inquiry Sent Successfully!",
    successText: "We'll review your requirements and respond within 24 hours.",
    errorText: "Submission failed. Please try again or email us directly at sending@sdnfaucet.com",
    emailFailedText: "Your inquiry was saved, but email delivery failed. Please contact us via WhatsApp or email.",
    retry: "Retry verification",
    privacy: "Protected by Turnstile. Your info is only used to respond to this inquiry.",
    errorNameRequired: "Name is required",
    errorEmailRequired: "Email is required",
    errorEmailInvalid: "Please enter a valid email",
    errorMessageRequired: "Please describe your requirements",
    ...labels,
  };

  const [form, setForm] = useState<InquiryFormData>({
    name: "",
    email: "",
    company: "",
    product: productModel || "",
    quantity: "",
    message: productName
      ? lang === "zh" 
        ? `我对 ${productName} (${productModel}) 很感兴趣。请发送价格和最小起订量详情。`
        : lang === "ar"
          ? `أنا مهتم بـ ${productName} (${productModel}). يرجى إرسال تفاصيل الأسعار والحد الأدنى للطلب.`
          : `I'm interested in ${productName} (${productModel}). Please send pricing and MOQ details.`
      : "",
  });
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errors, setErrors] = useState<Partial<InquiryFormData>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Partial<InquiryFormData> = {};
    if (!form.name.trim()) newErrors.name = t.errorNameRequired;
    if (!form.email.trim()) {
      newErrors.email = t.errorEmailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = t.errorEmailInvalid;
    }
    if (!form.message.trim())
      newErrors.message = t.errorMessageRequired;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, t]);

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
        setErrorMessage(t.errorText);
        setStatus("error");
        return;
      }

      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken }),
      });

      const result = (await res.json().catch(() => ({}))) as {
        code?: string;
        error?: string;
      };
      if (!res.ok) {
        if (result.code === "email_failed") {
          setErrorMessage(t.emailFailedText);
        } else {
          setErrorMessage(result.error || t.errorText);
        }
        setStatus("error");
        return;
      }
      setStatus("success");
      (window as any).turnstileToken = undefined;
      (window as any).__turnstileState = {
        ...((window as any).__turnstileState || {}),
        token: undefined,
        status: "loading",
      };
      const widgetId = (window as any).__turnstileState?.widgetId;
      if (widgetId !== null && widgetId !== undefined) {
        (window as any).turnstile?.reset(widgetId);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.errorText);
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
          {t.successTitle}
        </h3>
        <p className="mt-2 text-sm text-green-600">
          {t.successText}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="iq-name" className={labelClass}>
          {t.name} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="iq-name"
          name="name"
          value={form.name}
          onChange={handleChange}
          className={`${inputClass} ${errors.name ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
          placeholder={t.namePlaceholder}
        />
        {errors.name && <p className={errorClass}>{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="iq-email" className={labelClass}>
          {t.email} <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="iq-email"
          name="email"
          value={form.email}
          onChange={handleChange}
          className={`${inputClass} ${errors.email ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
          placeholder={t.emailPlaceholder}
        />
        {errors.email && <p className={errorClass}>{errors.email}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="iq-company" className={labelClass}>
            {t.company}
          </label>
          <input
            type="text"
            id="iq-company"
            name="company"
            value={form.company}
            onChange={handleChange}
            className={inputClass}
            placeholder={t.companyPlaceholder}
          />
        </div>
        <div>
          <label htmlFor="iq-quantity" className={labelClass}>
            {t.quantity}
          </label>
          <input
            type="text"
            id="iq-quantity"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            className={inputClass}
            placeholder={t.quantityPlaceholder}
          />
        </div>
      </div>

      <div>
        <label htmlFor="iq-message" className={labelClass}>
          {t.message} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="iq-message"
          name="message"
          rows={4}
          value={form.message}
          onChange={handleChange}
          className={`${inputClass} resize-y ${errors.message ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
          placeholder={t.messagePlaceholder}
        />
        {errors.message && <p className={errorClass}>{errors.message}</p>}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div id="turnstile-container" className="cf-turnstile"></div>
        <button
          type="button"
          onClick={() => {
            setErrorMessage("");
            (window as any).__retryTurnstile?.();
          }}
          className="text-xs font-medium text-ocean-600 underline underline-offset-2 hover:text-ocean-700"
        >
          {t.retry}
        </button>
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
            {t.submitting}
          </span>
        ) : (
          t.submit
        )}
      </button>

      {status === "error" && (
        <p className="text-center text-sm text-red-500">
          {errorMessage || t.errorText}
        </p>
      )}

      <p className="text-center text-xs text-gray-400">
        {t.privacy}
      </p>
    </form>
  );
}
