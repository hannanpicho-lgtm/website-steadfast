import type { Metric } from 'web-vitals';

/**
 * Reports Core Web Vitals (LCP, CLS, INP, FCP, TTFB) to the console
 * in development and can be extended to send to an analytics endpoint.
 */
export function reportWebVitals(onMetric?: (metric: Metric) => void) {
  import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
    const handler = onMetric ?? logMetric;
    onCLS(handler);
    onINP(handler);
    onLCP(handler);
    onFCP(handler);
    onTTFB(handler);
  });
}

function logMetric(metric: Metric) {
  // Log with rating for quick triage: good / needs-improvement / poor
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`);
  }
}
