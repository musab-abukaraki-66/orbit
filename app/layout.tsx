import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { getSiteOrigin } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // VERCEL_URL is a bare hostname, so `new URL(process.env.VERCEL_URL)` throws
  // ERR_INVALID_URL and fails the Vercel build whenever NEXT_PUBLIC_SITE_URL is unset.
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: "Orbit",
    template: "%s · Orbit",
  },
  description:
    "Orbit is a team project-management app. Plan work on Kanban boards, coordinate across workspaces, and ship faster together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
