import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wafy Campus Kalikkav Arts Fest Portal",
  description: "Manage Wafy Campus Kalikkav arts fest teams and events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased"
          // Font variables are now handled in globals.css
        )}
      >
        {children}
      </body>
    </html>
  );
}
