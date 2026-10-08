"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale-context";

export function PersonalNotes({ note, onSave, ready }: {
  note: string;
  onSave: (note: string) => boolean;
  ready: boolean;
}) {
  const { locale } = useLocale();
  const [draft, setDraft] = useState(note);
  const [saved, setSaved] = useState(false);
  const zh = locale === "zh";
  const changed = draft !== note;

  return (
    <section className="personal-notes detail-section">
      <label htmlFor="personal-note">{zh ? "我的笔记" : "My notes"}</label>
      <p>{zh ? "保存在此设备上。可导出用户数据以备份或转移。" : "Saved on this device. Export user data to back up or transfer your notes."}</p>
      <textarea id="personal-note" value={draft} disabled={!ready} rows={6}
        placeholder={zh ? "添加学习心得、记忆提示或个人观察…" : "Add study notes, memory cues, or personal observations…"}
        onChange={(event) => { setDraft(event.target.value); setSaved(false); }} />
      <div className="personal-notes-actions">
        <button className="primary-button" disabled={!ready || !changed} onClick={() => {
          if (onSave(draft)) setSaved(true);
        }}>{zh ? "保存笔记" : "Save notes"}</button>
        <span role="status">{changed ? (zh ? "尚未保存" : "Unsaved changes") : saved ? (zh ? "已保存" : "Saved") : ""}</span>
      </div>
    </section>
  );
}
