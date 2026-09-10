import type { Metadata } from "next";
import Header from "./Header";
import Hero from "./Hero";
import Planner from "./Planner";
import ServiceCategories from "./ServiceCategories";
import VendorDirectory from "./VendorDirectory";
import HomepageAnnouncement from "./HomepageAnnouncement";

export const metadata: Metadata = {
  alternates: { canonical: "https://www.justcelebrate.co.uk/" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://www.justcelebrate.co.uk/",
    siteName: "Just Celebrate",
    title: "Just Celebrate | Celebration & Party Planner",
    description: "Plan your birthday, wedding or special occasion in one place. Organise your checklist, track your budget and find suppliers with Just Celebrate.",
  },
  twitter: {
    card: "summary",
    title: "Just Celebrate | Celebration & Party Planner",
    description: "Plan your birthday, wedding or special occasion in one place. Organise your checklist, track your budget and find suppliers with Just Celebrate.",
  },
};

export default function Home() {
  return (
    <>
      <Header />
      <HomepageAnnouncement />
      <Hero />
      <Planner />
      <ServiceCategories />
      <VendorDirectory />
    </>
  );
}
