"use client";

import { useState } from "react";

import Header from "./Header";
import Hero from "./Hero";
import ExploreCelebrations from "./ExploreCelebrations";

export default function Home() {
  const [celebration, setCelebration] = useState("Wedding");

  return (
    <>
      <Header />

      <Hero
        celebration={celebration}
        setCelebration={setCelebration}
      />

      <ExploreCelebrations
        celebration={celebration}
      />
    </>
  );
}