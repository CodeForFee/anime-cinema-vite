/**
 * Real-device LCP / INP / CLS. Set VITE_VITALS_URL at build time to have each value POSTed there with
 * sendBeacon; without it they only print in dev. Loaded after the first paint, so it costs the page nothing.
 */
export function reportVitals() {
  const url = import.meta.env.VITE_VITALS_URL as string | undefined;
  if (!url && !import.meta.env.DEV) return;
  void import("web-vitals").then(({ onCLS, onINP, onLCP }) => {
    const send = ({
      name,
      value,
      rating,
      id,
    }: {
      name: string;
      value: number;
      rating: string;
      id: string;
    }) => {
      if (!url) {
        console.debug(
          `[vitals] ${name} ${Math.round(value * 1000) / 1000} (${rating})`,
        );
        return;
      }
      const body = JSON.stringify({
        name,
        value,
        rating,
        id,
        page: location.pathname,
      });
      navigator.sendBeacon?.(url, body);
    };
    onLCP(send);
    onINP(send);
    onCLS(send);
  });
}
