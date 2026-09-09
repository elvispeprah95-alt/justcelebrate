import Header from "./Header";
import Hero from "./Hero";
import Planner from "./Planner";
import ServiceCategories from "./ServiceCategories";
import VendorDirectory from "./VendorDirectory";
import HomepageAnnouncement from "./HomepageAnnouncement";

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
