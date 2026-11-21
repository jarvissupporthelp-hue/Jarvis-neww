"use client";

import { Check, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar, labels, type Language } from "@/modules/campus/library-personal";

const groups = [
  { label: ["Animals", "Կենդանիներ", "Animaux", "Животные"], icons: "🦊 🐼 🦉 🐳 🐶 🐱 🐭 🐹 🐰 🐻 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦅 🦜 🦩 🦚 🐺 🦝 🦔 🦦 🦥 🐢 🐙 🦋 🐝" },
  { label: ["Nature", "Բնություն", "Nature", "Природа"], icons: "🌙 🌻 🌞 🌛 🌜 ⭐ 🌟 ✨ ☄️ 🪐 🌍 🌕 🌈 ⛅ 🌧️ 🌩️ ❄️ 🔥 💧 🌊 🍀 🌿 🌱 🌵 🌴 🌲 🍁 🍂 🍄 🌷 🌹 🪻 🪷 🌺 🌸" },
  { label: ["Food", "Ուտելիք", "Cuisine", "Еда"], icons: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥝 🥑 🍅 🥕 🌽 🫑 🥐 🥨 🧀 🍔 🍟 🍕 🌮 🍣 🍜 🍪 🍩 🍰 🍦 🧋 ☕" },
  { label: ["Hobbies", "Հոբբիներ", "Loisirs", "Увлечения"], icons: "⚽ 🏀 🏐 🏈 ⚾ 🎾 🏓 🏸 🥊 🛹 🛼 🧗 🚴 🥇 🎮 🕹️ 🎲 ♟️ 🧩 🎯 🎨 🖌️ 🎭 🎬 🎤 🎧 🎷 🎸 🎹 🥁 📚 📷 🔭 🚀 🤖" },
];

const copy = {
  en: ["Choose avatar", "Close", "Current selection", "JPG, PNG or WebP · up to 8 MB", "Could not open this image.", "Choose a JPG, PNG or WebP up to 8 MB.", "Could not save your avatar. Try again."],
  hy: ["Ընտրել ավատար", "Փակել", "Ընտրված ավատար", "JPG, PNG կամ WebP · մինչև 8 ՄԲ", "Չհաջողվեց բացել նկարը։", "Ընտրեք JPG, PNG կամ WebP նկար՝ մինչև 8 ՄԲ։", "Չհաջողվեց պահպանել ավատարը։ Փորձեք կրկին։"],
  fr: ["Choisir un avatar", "Fermer", "Avatar sélectionné", "JPG, PNG ou WebP · 8 Mo maximum", "Impossible d’ouvrir cette image.", "Choisissez une image JPG, PNG ou WebP de 8 Mo maximum.", "Impossible d’enregistrer l’avatar. Réessayez."],
  ru: ["Выбрать аватар", "Закрыть", "Выбранный аватар", "JPG, PNG или WebP · до 8 МБ", "Не удалось открыть изображение.", "Выберите JPG, PNG или WebP размером до 8 МБ.", "Не удалось сохранить аватар. Попробуйте ещё раз."],
};

const languageIndex = { en: 0, hy: 1, fr: 2, ru: 3 };

async function photoAvatar(file: File) {
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 160;
    const size = Math.min(image.width, image.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 160, 160);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    image.close();
  }
}

export function AvatarPicker({ avatar, language, onSave }: {
  avatar: string;
  language: Language;
  onSave: (avatar: string) => Promise<boolean>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(avatar);
  const [groupIndex, setGroupIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [choose, close, selected, formats, readError, formatError, saveError] = copy[language];
  const group = groups[groupIndex];

  function open() {
    const currentGroup = groups.findIndex(({ icons }) => icons.split(" ").includes(avatar));
    setGroupIndex(Math.max(0, currentGroup));
    setDraft(avatar);
    setError("");
    gallery.current?.scrollTo(0, 0);
    dialog.current?.showModal();
  }

  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 8_000_000 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(formatError);
      return;
    }
    setPending(true);
    setError("");
    try {
      setDraft(await photoAvatar(file));
    } catch {
      setError(readError);
    } finally {
      setPending(false);
    }
  }

  async function save() {
    setPending(true);
    setError("");
    try {
      if (draft === avatar || await onSave(draft)) dialog.current?.close();
      else setError(saveError);
    } finally {
      setPending(false);
    }
  }

  return <div className="flex flex-wrap items-center gap-4">
    <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--panel-raised)]"><Avatar value={avatar}/></span>
    <button type="button" className="ui-action-secondary" aria-haspopup="dialog" onClick={open}>{choose}</button>
    <dialog ref={dialog} className="jarvis-avatar-dialog" aria-labelledby="avatar-picker-title"
      onCancel={event => { if (pending) event.preventDefault(); }}>
      <div className="jarvis-avatar-layout">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--stroke)] p-4 sm:px-6">
          <h2 id="avatar-picker-title" className="text-xl font-semibold">{choose}</h2>
          <button type="button" autoFocus aria-label={close} disabled={pending} onClick={() => dialog.current?.close()}
            className="grid size-10 shrink-0 place-items-center rounded-lg hover:bg-[var(--highlight)] disabled:opacity-50"><X size={20}/></button>
        </header>
        <div className="flex flex-wrap gap-2 px-4 py-3 sm:px-6" role="group" aria-label={choose}>
          {groups.map(({ label }, index) => <button type="button" key={label[0]} aria-pressed={index === groupIndex}
            className="rounded-lg border border-[var(--stroke)] px-3 py-2 text-sm aria-pressed:border-[var(--violet)] aria-pressed:bg-[var(--highlight)]"
            onClick={() => { setGroupIndex(index); gallery.current?.scrollTo(0, 0); }}>{label[languageIndex[language]]}</button>)}
        </div>
        <div ref={gallery} className="overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6">
          <div className="jarvis-avatar-grid" role="group" aria-label={group.label[languageIndex[language]]}>
            {group.icons.split(" ").map(icon => <button type="button" key={icon} disabled={pending} aria-pressed={draft === icon}
              onClick={() => setDraft(icon)} className="jarvis-avatar-option">
              {icon}{draft === icon && <Check className="absolute right-1 top-1" size={13} aria-hidden="true"/>}
            </button>)}
          </div>
        </div>
        <footer className="space-y-2 border-t border-[var(--stroke)] p-4 sm:px-6">
          {error && <p role="alert" className="text-sm text-[var(--text)]">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <span aria-label={selected} role="img" className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--panel-raised)]"><Avatar value={draft}/></span>
            <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
              void upload(event.target.files?.[0]);
              event.target.value = "";
            }}/>
            <button type="button" disabled={pending} className="ui-action-secondary" onClick={() => fileInput.current?.click()}>
              <Upload size={16} aria-hidden="true"/>{labels[language][9]}
            </button>
            <button type="button" disabled={pending} className="ui-action-primary ml-auto disabled:opacity-50" onClick={() => void save()}>
              {labels[language][10]}
            </button>
          </div>
          <p className="text-xs text-[var(--muted)]">{formats}</p>
        </footer>
      </div>
    </dialog>
  </div>;
}
