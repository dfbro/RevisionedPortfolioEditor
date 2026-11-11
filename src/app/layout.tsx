import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const archivo = localFont({ src: "../assets/fonts/archivo-variable.woff2", variable: "--font-archivo", weight: "100 900", display: "swap" });
const interTight = localFont({ src: "../assets/fonts/inter-tight-variable.woff2", variable: "--font-inter-tight", weight: "100 900", display: "swap" });
const geistMono = localFont({ src: "../assets/fonts/geist-mono-variable.woff2", variable: "--font-geist-mono", weight: "100 900", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Portfolio Editor — Claritys", template: "%s — Portfolio Editor" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={archivo.variable + " " + interTight.variable + " " + geistMono.variable}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
