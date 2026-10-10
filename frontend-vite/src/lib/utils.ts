import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEpisodeName(name: string | number): string {
  const str = String(name).trim();
  if (/^\d+$/.test(str)) {
    return `Tập ${str.padStart(2, "0")}`;
  }
  if (!str.toLowerCase().startsWith("tập") && !str.toLowerCase().startsWith("full")) {
    return `Tập ${str}`;
  }
  return str;
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export function extractEpisodeNumber(slugOrName: string): number {
  const match = slugOrName.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
