"use client";

import { useRef, useEffect, useCallback, useState } from "react";

function isHtml(str) {
  return str && /<[a-zA-Z]/.test(str);
}

export default function RichTextarea({ value, onChange, rows = 6, placeholder }) {
  const editorRef = useRef(null);
  const lastValueRef = useRef("");
  const [active, setActive] = useState({ bold: false, italic: false, underline: false });

  useEffect(() => {
    if (!editorRef.current) return;
    const incoming = value || "";
    if (incoming === lastValueRef.current) return;
    lastValueRef.current = incoming;
    const asHtml = isHtml(incoming) ? incoming : incoming.replace(/\n/g, "<br>");
    editorRef.current.innerHTML = asHtml;
  }, [value]);

  const syncActive = useCallback(() => {
    setActive({
      bold:      document.queryCommandState("bold"),
      italic:    document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", syncActive);
    return () => document.removeEventListener("selectionchange", syncActive);
  }, [syncActive]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    let html = editorRef.current.innerHTML;
    if (html === "<br>") html = "";
    lastValueRef.current = html;
    onChange(html);
    syncActive();
  }, [onChange, syncActive]);

  const exec = (cmd) => {
    document.execCommand(cmd, false, null);
    handleInput();
  };

  const btnClass = (isActive) =>
    `w-7 h-7 flex items-center justify-center rounded text-sm font-serif transition-colors ${
      isActive
        ? "bg-[#005698]/15 text-[#005698]"
        : "text-gray-600 hover:bg-gray-200"
    }`;

  const isEmpty = !value || value === "";

  return (
    <div className="border border-gray-300 rounded-md focus-within:border-[#005698] overflow-hidden">
      {/* Pasek narzędziowy */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}
          title="Pogrubienie (Ctrl+B)"
          className={`${btnClass(active.bold)} font-bold`}
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}
          title="Kursywa (Ctrl+I)"
          className={`${btnClass(active.italic)} italic`}
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec("underline"); }}
          title="Podkreślenie (Ctrl+U)"
          className={`${btnClass(active.underline)} underline`}
        >
          U
        </button>
      </div>

      {/* Obszar edycji */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="px-3 py-2 text-sm text-gray-700 focus:outline-none"
          style={{ minHeight: `${rows * 1.5}rem` }}
        />
        {isEmpty && placeholder && (
          <p className="absolute top-2 left-3 text-sm text-gray-400 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
      </div>
    </div>
  );
}
