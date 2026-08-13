import type { ReactNode } from "react";

export const metadata = {
  title: "TaskFlow",
  description: "A small team task tracker.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
