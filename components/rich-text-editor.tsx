"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useEffect, useCallback, useRef, useState } from "react";
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link as LinkIcon, Unlink,
  Heading2, Heading3, Pilcrow, ImageIcon, Loader2,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const COLORS = ["#000000", "#333333", "#555555", "#207029", "#1e40af", "#7c3aed", "#be185d", "#b45309", "#15803d", "#dc2626", "#ffffff"];

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { style: "color:#207029;text-decoration:underline;" } }),
      Image.configure({ HTMLAttributes: { style: "max-width:100%;height:auto;border-radius:4px;" } }),
    ],
    content: value || "",
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[160px] px-3 py-2 text-sm text-gray-800 leading-relaxed",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("URL del enlace", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  async function uploadImage(file: File) {
    if (!editor) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "email-images");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      }
    } finally {
      setUploadingImage(false);
    }
  }

  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, title: string, children: React.ReactNode) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${active ? "bg-[#207029] text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-[#207029] focus-within:border-[#207029]">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {/* Paragraph styles */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
          {btn(editor.isActive("paragraph"), () => editor.chain().focus().setParagraph().run(), "Párrafo", <Pilcrow className="w-3.5 h-3.5" />)}
          {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "Título", <Heading2 className="w-3.5 h-3.5" />)}
          {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "Subtítulo", <Heading3 className="w-3.5 h-3.5" />)}
        </div>

        {/* Text formatting */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
          {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Negrita", <Bold className="w-3.5 h-3.5" />)}
          {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Cursiva", <Italic className="w-3.5 h-3.5" />)}
          {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "Subrayado", <UnderlineIcon className="w-3.5 h-3.5" />)}
          {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "Tachado", <Strikethrough className="w-3.5 h-3.5" />)}
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
          {btn(editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), "Izquierda", <AlignLeft className="w-3.5 h-3.5" />)}
          {btn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), "Centro", <AlignCenter className="w-3.5 h-3.5" />)}
          {btn(editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run(), "Derecha", <AlignRight className="w-3.5 h-3.5" />)}
          {btn(editor.isActive({ textAlign: "justify" }), () => editor.chain().focus().setTextAlign("justify").run(), "Justificado", <AlignJustify className="w-3.5 h-3.5" />)}
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
          {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Lista", <List className="w-3.5 h-3.5" />)}
          {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Lista numerada", <ListOrdered className="w-3.5 h-3.5" />)}
        </div>

        {/* Link */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
          {btn(editor.isActive("link"), setLink, "Insertar enlace", <LinkIcon className="w-3.5 h-3.5" />)}
          {btn(false, () => editor.chain().focus().unsetLink().run(), "Quitar enlace", <Unlink className="w-3.5 h-3.5" />)}
        </div>

        {/* Image upload */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
          <button
            type="button"
            title="Insertar imagen"
            disabled={uploadingImage}
            onClick={() => imageInputRef.current?.click()}
            className="p-1.5 rounded transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
          >
            {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Color */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">Color</span>
          <div className="flex gap-0.5 flex-wrap max-w-[120px]">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => editor.chain().focus().setColor(c).run()}
                style={{ backgroundColor: c }}
                className={`w-4 h-4 rounded-full border transition-transform hover:scale-110 ${editor.isActive("textStyle", { color: c }) ? "border-gray-800 scale-110" : "border-gray-300"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Editor area */}
      <div className="bg-white relative">
        {!value || value === "<p></p>" ? (
          <div className="absolute top-2 left-3 text-sm text-gray-400 pointer-events-none select-none">
            {placeholder ?? "Escribe el contenido..."}
          </div>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
