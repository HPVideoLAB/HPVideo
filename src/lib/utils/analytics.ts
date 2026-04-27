// Conversion-event helpers for Google Analytics 4. Without these,
// Meta and Google ad pixels can't optimize delivery — paid acquisition
// burns money. Each event maps to a meaningful funnel step.

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

function gtag(...args: any[]) {
  if (typeof window === 'undefined') return;
  if (window.gtag) {
    window.gtag(...args);
    return;
  }
  // gtag.js may not have loaded yet — push directly into dataLayer so
  // the call is replayed when the script attaches.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

/**
 * Fires when a user creates or imports a wallet (= account creation).
 * Maps to GA4 'sign_up' standard event.
 */
export function trackSignUp(method: 'create' | 'import' | 'google') {
  gtag('event', 'sign_up', { method });
}

/**
 * Fires when a credit purchase completes (Creem webhook acknowledged
 * via redirect ?paid=success). Maps to GA4 'purchase' standard event.
 */
export function trackPurchase(opts: {
  value: number;        // USD amount
  currency?: string;    // default USD
  transactionId?: string;
  credits?: number;
}) {
  gtag('event', 'purchase', {
    value: opts.value,
    currency: opts.currency || 'USD',
    transaction_id: opts.transactionId,
    items: opts.credits
      ? [{ item_name: `Credit pack ${opts.credits}`, quantity: 1, price: opts.value }]
      : undefined,
  });
}

/**
 * Fires the moment a generation request is submitted to the backend
 * (NOT when it completes — completion can take minutes and we want the
 * conversion attributable to the click). Custom event.
 */
export function trackGenerateVideo(opts: {
  model: string;
  duration?: number;
  resolution?: string;
  credits: number;
}) {
  gtag('event', 'generate_video', {
    model: opts.model,
    duration: opts.duration,
    resolution: opts.resolution,
    credits: opts.credits,
    // Map to a 'value' so Meta/Google can score on equivalent USD.
    value: opts.credits / 1000,
    currency: 'USD',
  });
}

/**
 * Fires on every successful template apply / remix. Helps measure
 * which templates drive engagement.
 */
export function trackTemplateApplied(templateId: string, model: string) {
  gtag('event', 'template_applied', { template_id: templateId, model });
}

/**
 * Fires when a video is shared (copy-link, X, Telegram).
 */
export function trackShare(method: 'copy' | 'x' | 'telegram', videoId: string) {
  gtag('event', 'share', { method, content_type: 'video', item_id: videoId });
}
