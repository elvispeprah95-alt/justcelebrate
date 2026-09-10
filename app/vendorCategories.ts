export const vendorCategories = [
  { name: "Venues", icon: "🏛️", aliases: ["Venue", "Venue & Events"] },
  { name: "DJs & music", icon: "🎧", aliases: ["DJ", "DJs", "DJ & Entertainment", "DJ & Event Production", "DJ & Live Entertainment", "Live Entertainment"] },
  { name: "Photography & video", icon: "📸", aliases: ["Photography", "Videography", "Photography & Videography", "Content Creation"] },
  { name: "Catering", icon: "🍽️", aliases: ["Catering"] },
  { name: "Cakes & treats", icon: "🎂", aliases: ["Cakes", "Cakes & treats"] },
  { name: "Decor & balloons", icon: "🎈", aliases: ["Decor", "Decor & Event Hire"] },
  { name: "Flowers", icon: "💐", aliases: ["Florist", "Florists", "Florist & Decor"] },
  { name: "Children’s entertainment", icon: "🎉", aliases: ["Children's Entertainment", "Children’s Entertainment"] },
  { name: "Entertainment", icon: "🎤", aliases: ["Entertainment"] },
  { name: "Photo booths", icon: "📷", aliases: ["Photo Booth", "Photo Booths", "Photo Booth & Events"] },
  { name: "Mobile bars", icon: "🍹", aliases: ["Mobile Bar", "Mobile Bars"] },
  { name: "Marquees & equipment", icon: "⛺", aliases: ["Marquee Hire", "Event Equipment Hire", "Party Equipment Hire", "Party Hire"] },
  { name: "Event planners", icon: "📋", aliases: ["Event Planner", "Event Planning", "Event Management", "Event Production"] },
  { name: "Transport", icon: "🚘", aliases: ["Transport"] },
  { name: "Beauty & bridal", icon: "✨", aliases: ["Beauty", "Bridal"] },
  { name: "Celebrants & stationery", icon: "💌", aliases: ["Celebrant", "Stationery"] },
  { name: "Other services", icon: "🪩", aliases: [] },
];

const normalise = (value: string) => value.trim().toLowerCase().replaceAll("’", "'");
const categoryNames = new Map(
  vendorCategories.flatMap(group =>
    [group.name, ...group.aliases].map(alias => [normalise(alias), group.name] as const)
  )
);

export function getVendorCategory(category: string | null | undefined): string {
  return categoryNames.get(normalise(category || "")) || "Other services";
}
