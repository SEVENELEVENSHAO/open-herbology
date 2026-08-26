"use client";

import { useEffect } from "react";

const plantIcons = [
  "🌿", "🌱", "🍀", "🌵", "🌴", "🌳", "🌲",
  "🌸", "🌺", "🌻", "🌷", "🪷",
  "🍎", "🍊", "🍋", "🍐", "🍑", "🍒", "🍓", "🍇", "🫐", "🍉", "🥝", "🍍",
];

function iconDataUrl(emoji: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <rect width="128" height="128" rx="28" fill="#f8f0df"/>
      <rect x="4" y="4" width="120" height="120" rx="24" fill="none" stroke="#20211f" stroke-width="8"/>
      <text x="64" y="84" text-anchor="middle" font-size="74">${emoji}</text>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function RandomPlantIcon() {
  useEffect(() => {
    const previous = sessionStorage.getItem("fangyao-icon");
    const choices = plantIcons.filter((icon) => icon !== previous);
    const emoji = choices[Math.floor(Math.random() * choices.length)];
    const href = iconDataUrl(emoji);

    sessionStorage.setItem("fangyao-icon", emoji);
    document.documentElement.dataset.fangyaoIcon = emoji;
    window.dispatchEvent(new CustomEvent("fangyao-icon-change", { detail: emoji }));

    for (const relation of ["icon", "shortcut icon", "apple-touch-icon"]) {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${relation}"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = relation;
        document.head.appendChild(link);
      }
      link.href = href;
    }
  }, []);

  return null;
}
