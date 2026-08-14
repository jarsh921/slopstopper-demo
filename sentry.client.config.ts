import * as Sentry from "@sentry/nextjs";

// Placeholder DSN — this is a safe no-op until NEXT_PUBLIC_SENTRY_DSN is set.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
  tracesSampleRate: 1.0,
});
