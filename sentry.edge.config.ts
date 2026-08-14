import * as Sentry from "@sentry/nextjs";

// Placeholder DSN — this is a safe no-op until SENTRY_DSN is set.
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "",
  tracesSampleRate: 1.0,
});
