export const APP_CONFIG = {
  SITE_NAME: "MOVION ANIME",
  SITE_SLOGAN: "A NEW WAY TO EXPLORE CINEMA",
  API_BASE_URL: "",
  SERVERS: [
    { id: "vip", name: "VIP #1 (Fast)", type: "hls" },
    { id: "vip2", name: "VIP #2 (DU)", type: "hls" },
    { id: "fb", name: "FB Stream", type: "mp4" },
    { id: "hdx", name: "HDX Ultra", type: "embed" },
  ],
  EPISODES_PER_GROUP: 50,
  NAV_ITEMS: [
    { label: "Search", href: "/search", icon: "Search" },
    { label: "Home", href: "/", icon: "Home" },
    { label: "Explore", href: "/explore", icon: "Compass" },
    { label: "History", href: "/history", icon: "History" },
    { label: "Watchlist", href: "/favorites", icon: "Bookmark" },
  ],
};
