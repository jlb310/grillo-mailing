"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Node as TiptapNode, mergeAttributes, type Editor } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { Fragment, Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { useEffect, useCallback, useRef, useState } from "react";
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link as LinkIcon, Unlink,
  Heading2, Heading3, Pilcrow, ImageIcon, Loader2, ChevronUp, ChevronDown, LayoutGrid,
} from "lucide-react";

// Swaps the node at `getPos` with its previous/next sibling among the root
// blocks of the document. Shared by the image and products-marker NodeViews
// so both can be reordered with the same up/down controls.
function moveNode(editor: Editor, getPos: () => number | undefined, dir: "up" | "down") {
  if (!editor || !getPos) return;
  const { state } = editor;
  const startPos = getPos();
  if (startPos === undefined) return;
  const $p = state.doc.resolve(startPos);
  // Solo reordenamos nodos que son bloques raíz del cuerpo.
  const parent = $p.parent;
  if (parent !== state.doc) return;

  let idx = -1;
  let offset = 0;
  for (let i = 0; i < parent.childCount; i++) {
    if (offset === startPos) { idx = i; break; }
    offset += parent.child(i).nodeSize;
  }
  if (idx < 0) return;

  const targetIdx = idx + (dir === "up" ? -1 : 1);
  if (targetIdx < 0 || targetIdx >= parent.childCount) return;

  const children: ProseMirrorNode[] = [];
  parent.forEach((c) => children.push(c));
  [children[idx], children[targetIdx]] = [children[targetIdx], children[idx]];

  const tr = state.tr.replaceWith(0, state.doc.content.size, Fragment.fromArray(children));

  let newPos = 0;
  for (let i = 0; i < targetIdx; i++) newPos += children[i].nodeSize;
  tr.setSelection(NodeSelection.create(tr.doc, newPos));
  editor.view.dispatch(tr);
}

function MoveButtons({ onMove }: { onMove: (dir: "up" | "down") => void }) {
  return (
    <div className="absolute right-2 top-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        title="Mover arriba"
        aria-label="Mover arriba"
        onClick={() => onMove("up")}
        className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded shadow"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Mover abajo"
        aria-label="Mover abajo"
        onClick={() => onMove("down")}
        className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded shadow"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
}

// NodeView for the image: lets you move the image up/​down within the body.
function MailingImageView({ node, editor, getPos }: NodeViewProps) {
  return (
    <NodeViewWrapper className="mailing-image relative block my-2 group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={node.attrs.src}
        alt={node.attrs.alt || ""}
        className="block w-full max-w-full h-auto rounded"
      />
      <MoveButtons onMove={(dir) => moveNode(editor, getPos, dir)} />
    </NodeViewWrapper>
  );
}

const MailingImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MailingImageView);
  },
});

// Marker block that stands in for the products grid within the body flow, so
// it can be reordered against images/text with the same up/down controls.
// Rendered to `<div data-products-marker="true"></div>`; lib/email-builder.ts
// swaps that marker for the actual rendered product grid HTML.
const PRODUCTS_MARKER_ATTR = "data-products-marker";

function ProductsMarkerView({ editor, getPos }: NodeViewProps) {
  return (
    <NodeViewWrapper className="relative block my-2 group" data-drag-handle>
      <div className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-4 text-sm text-gray-500 bg-gray-50 select-none">
        <LayoutGrid className="w-4 h-4" />
        Grilla de productos
      </div>
      <MoveButtons onMove={(dir) => moveNode(editor, getPos, dir)} />
    </NodeViewWrapper>
  );
}

const ProductsMarker = TiptapNode.create({
  name: "productsMarker",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: `div[${PRODUCTS_MARKER_ATTR}="true"]` }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { [PRODUCTS_MARKER_ATTR]: "true" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ProductsMarkerView);
  },
});

function docHasProductsMarker(editor: Editor | null): boolean {
  if (!editor) return false;
  let found = false;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "productsMarker") found = true;
  });
  return found;
}

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
      MailingImage.configure({ HTMLAttributes: { style: "max-width:100%;height:auto;border-radius:4px;" } }),
      ProductsMarker,
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

  const hasProductsMarker = docHasProductsMarker(editor);

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
          <button
            type="button"
            title={hasProductsMarker ? "La grilla de productos ya está en el cuerpo" : "Insertar grilla de productos"}
            disabled={hasProductsMarker}
            onClick={() => editor.chain().focus().insertContent({ type: "productsMarker" }).run()}
            className="p-1.5 rounded transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
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
