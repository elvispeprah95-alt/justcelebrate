"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function HomepageAnnouncement() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("marketplace_settings").select("value").eq("key", "homepage").maybeSingle();
      const value = data?.value as { announcement?: string; show_announcement?: boolean } | undefined;
      if (value?.show_announcement && value.announcement?.trim()) setMessage(value.announcement.trim());
    }
    void load();
  }, []);

  if (!message) return null;
  return <aside className="bg-[#fff4d6] px-5 py-3 text-center text-sm font-semibold text-[#0d3835]">{message}</aside>;
}
