import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import VendorCardNavigation from "./VendorCardNavigation";
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
  metadataBase: new URL("https://www.justcelebrate.co.uk"),
  title: "Just Celebrate | Celebration & Party Planner",
  description: "Plan your birthday, wedding or special occasion in one place. Organise your checklist, track your budget and find suppliers with Just Celebrate.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <VendorCardNavigation />
        {children}
      </body>
    </html>
  );
}
