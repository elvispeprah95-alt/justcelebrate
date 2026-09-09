"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VendorCardNavigation() {
  const router = useRouter();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("a,button,input,textarea,select,label")) return;

      const card = target.closest("#vendors article");
      if (!card) return;

      const name = card.querySelector("h3")?.textContent?.trim();
      if (!name) return;

      router.push(`/vendor?name=${encodeURIComponent(name)}`);
    };

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const card = target.closest("#vendors article") as HTMLElement | null;
      if (card) card.style.cursor = "pointer";
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("mouseover", handleMouseOver);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("mouseover", handleMouseOver);
    };
  }, [router]);

  return null;
}
