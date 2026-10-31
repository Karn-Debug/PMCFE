import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import DOMPurify from "dompurify";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Table2,
  ImagePlus,
  Link2,
  Code2,
  Maximize2,
  Minimize2,
  Upload,
  Search,
  Quote,
  Minus,
  Eraser,
  Highlighter,
} from "lucide-react";
import { toast } from "sonner";

export const escapeHtml = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export function cleanHtml(value: string) {
  const safe = DOMPurify.sanitize(value, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [
      "style",
      "iframe",
      "form",
      "input",
      "button",
      "video",
      "audio",
    ],
    FORBID_ATTR: ["srcset", "id"],
  });
  const doc = new DOMParser().parseFromString(safe, "text/html");
  doc.querySelectorAll("img").forEach((img) => {
    if (
      !/^data:image\/(png|jpeg|webp);base64,/i.test(
        img.getAttribute("src") || "",
      )
    )
      img.remove();
  });
  doc.querySelectorAll("[style]").forEach((el) => {
    const style = (el as HTMLElement).style;
    for (const property of Array.from(style))
      if (
        ![
          "font-size",
          "font-family",
          "color",
          "background-color",
          "text-align",
          "font-weight",
          "font-style",
          "text-decoration",
          "width",
          "height",
          "border",
          "border-collapse",
          "padding",
          "line-height",
        ].includes(property) ||
        /url|expression|var\(/i.test(style.getPropertyValue(property))
      )
        style.removeProperty(property);
  });
  return doc.body.innerHTML;
}
export const asHtml = (value: string, format?: string) =>
  format === "html"
    ? cleanHtml(value)
    : "<p>" + escapeHtml(value).replaceAll("\n", "<br>") + "</p>";
export function RichText({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={"document-content " + className}
      dangerouslySetInnerHTML={{ __html: cleanHtml(html) }}
    />
  );
}

export function RichTextEditor({
  value,
  onChange,
  onReady,
  readOnly = false,
  label = "Document content",
}: {
  value: string;
  onChange: (html: string) => void;
  onReady?: (editor: Editor) => void;
  readOnly?: boolean;
  label?: string;
}) {
  const [source, setSource] = useState(false),
    [full, setFull] = useState(false),
    [find, setFind] = useState(false),
    [needle, setNeedle] = useState(""),
    [replacement, setReplacement] = useState(""),
    [revision, setRevision] = useState(0);
  const docInput = useRef<HTMLInputElement>(null),
    imageInput = useRef<HTMLInputElement>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          defaultProtocol: "https",
          protocols: ["http", "https", "mailto"],
        },
      }),
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({ table: { resizable: true } }),
      Image.configure({ allowBase64: true }),
      Highlight.configure({ multicolor: true }),
    ],
    content: cleanHtml(value),
    editable: !readOnly,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        spellcheck: "true",
      },
      transformPastedHTML: cleanHtml,
    },
    onUpdate: ({ editor }) => callback.current(editor.getHTML()),
    onTransaction: () => setRevision((v) => v + 1),
  });
  useEffect(() => {
    if (editor) onReady?.(editor);
  }, [editor, onReady]);
  useEffect(() => {
    editor?.setEditable(!readOnly, false);
  }, [editor, readOnly]);
  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML())
      editor.commands.setContent(cleanHtml(value), { emitUpdate: false });
  }, [value, editor]);
  if (!editor) return <div className="loading">Loading document editor…</div>;
  const tool = (
    name: string,
    Icon: typeof Bold,
    action: () => unknown,
    active = false,
    disabled = false,
  ) => (
    <button
      key={name}
      type="button"
      title={name}
      aria-label={name}
      aria-pressed={active}
      disabled={readOnly || disabled}
      className={active ? "is-active" : ""}
      onClick={() => action()}
    >
      <Icon size={17} />
    </button>
  );
  async function importWord(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Word files must be 15 MB or smaller");
      return;
    }
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.convertToHtml({
        arrayBuffer: await file.arrayBuffer(),
      });
      const html = cleanHtml(result.value);
      if (html.length > 1400000)
        throw new Error(
          "This document is too large. Remove large images before importing.",
        );
      editor!.commands.setContent(html);
      callback.current(editor!.getHTML());
      toast.success("Word content imported. Review the layout before saving.");
    } catch (e) {
      toast.error((e as Error).message || "Unable to import Word document");
    }
  }
  function replaceAll() {
    if (!needle) return;
    const edits: { from: number; to: number }[] = [];
    editor!.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      let i = 0;
      while (
        (i = node.text.toLowerCase().indexOf(needle.toLowerCase(), i)) !== -1
      ) {
        edits.push({ from: pos + i, to: pos + i + needle.length });
        i += needle.length;
      }
    });
    const tr = editor!.state.tr;
    edits.reverse().forEach((e) => tr.insertText(replacement, e.from, e.to));
    editor!.view.dispatch(tr);
    toast.success(edits.length + " replacements made");
  }
  return (
    <div
      className={"rich-editor " + (full ? "rte-fullscreen" : "")}
      data-revision={revision}
    >
      <div
        className="rte-toolbar"
        role="toolbar"
        aria-label="Document formatting"
      >
        {tool(
          "Undo",
          Undo2,
          () => editor.chain().focus().undo().run(),
          false,
          !editor.can().undo(),
        )}
        {tool(
          "Redo",
          Redo2,
          () => editor.chain().focus().redo().run(),
          false,
          !editor.can().redo(),
        )}
        <span className="rte-divider" />
        <select
          aria-label="Paragraph style"
          value={
            editor.isActive("heading")
              ? "h" + editor.getAttributes("heading").level
              : "p"
          }
          disabled={readOnly}
          onChange={(e) =>
            e.target.value === "p"
              ? editor.chain().focus().setParagraph().run()
              : editor
                  .chain()
                  .focus()
                  .setHeading({
                    level: Number(e.target.value.slice(1)) as 1 | 2 | 3,
                  })
                  .run()
          }
        >
          <option value="p">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <select
          aria-label="Font family"
          value={editor.getAttributes("textStyle").fontFamily || "Arial"}
          disabled={readOnly}
          onChange={(e) =>
            editor.chain().focus().setFontFamily(e.target.value).run()
          }
        >
          {[
            "Arial",
            "Calibri",
            "Times New Roman",
            "Georgia",
            "Verdana",
            "Courier New",
          ].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select
          aria-label="Font size"
          value={editor.getAttributes("textStyle").fontSize || "16px"}
          disabled={readOnly}
          onChange={(e) =>
            editor.chain().focus().setFontSize(e.target.value).run()
          }
        >
          {[
            "10",
            "11",
            "12",
            "14",
            "16",
            "18",
            "20",
            "24",
            "28",
            "32",
            "36",
            "48",
          ].map((s) => (
            <option key={s} value={s + "px"}>
              {s}
            </option>
          ))}
        </select>
        <span className="rte-divider" />
        {tool(
          "Bold",
          Bold,
          () => editor.chain().focus().toggleBold().run(),
          editor.isActive("bold"),
        )}
        {tool(
          "Italic",
          Italic,
          () => editor.chain().focus().toggleItalic().run(),
          editor.isActive("italic"),
        )}
        {tool(
          "Underline",
          Underline,
          () => editor.chain().focus().toggleUnderline().run(),
          editor.isActive("underline"),
        )}
        {tool(
          "Strikethrough",
          Strikethrough,
          () => editor.chain().focus().toggleStrike().run(),
          editor.isActive("strike"),
        )}
        <label className="rte-color" title="Text color">
          A
          <input
            aria-label="Text color"
            type="color"
            value={editor.getAttributes("textStyle").color || "#171717"}
            disabled={readOnly}
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
          />
        </label>
        {tool(
          "Highlight",
          Highlighter,
          () =>
            editor.chain().focus().toggleHighlight({ color: "#e5e5e5" }).run(),
          editor.isActive("highlight"),
        )}
        {tool("Clear formatting", Eraser, () =>
          editor.chain().focus().unsetAllMarks().clearNodes().run(),
        )}
        <span className="rte-divider" />
        {tool(
          "Align left",
          AlignLeft,
          () => editor.chain().focus().setTextAlign("left").run(),
          editor.isActive({ textAlign: "left" }),
        )}
        {tool(
          "Align center",
          AlignCenter,
          () => editor.chain().focus().setTextAlign("center").run(),
          editor.isActive({ textAlign: "center" }),
        )}
        {tool(
          "Align right",
          AlignRight,
          () => editor.chain().focus().setTextAlign("right").run(),
          editor.isActive({ textAlign: "right" }),
        )}
        {tool(
          "Justify",
          AlignJustify,
          () => editor.chain().focus().setTextAlign("justify").run(),
          editor.isActive({ textAlign: "justify" }),
        )}
        {tool(
          "Bullet list",
          List,
          () => editor.chain().focus().toggleBulletList().run(),
          editor.isActive("bulletList"),
        )}
        {tool(
          "Numbered list",
          ListOrdered,
          () => editor.chain().focus().toggleOrderedList().run(),
          editor.isActive("orderedList"),
        )}
        {tool(
          "Block quote",
          Quote,
          () => editor.chain().focus().toggleBlockquote().run(),
          editor.isActive("blockquote"),
        )}
        {tool("Horizontal line", Minus, () =>
          editor.chain().focus().setHorizontalRule().run(),
        )}
        <span className="rte-divider" />
        {tool("Insert table", Table2, () =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run(),
        )}
        {tool(
          "Insert link",
          Link2,
          () => {
            const url = window.prompt(
              "Link URL (https://…)",
              editor.getAttributes("link").href || "https://",
            );
            if (url === null) return;
            if (!url) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            if (!/^(https?:\/\/|mailto:)/i.test(url)) {
              toast.error("Use an https, http, or mailto link");
              return;
            }
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: url })
              .run();
          },
          editor.isActive("link"),
        )}
        {tool("Insert image", ImagePlus, () => imageInput.current?.click())}
        {tool("Find and replace", Search, () => setFind(!find), find)}
        <button
          type="button"
          disabled={readOnly}
          onClick={() => docInput.current?.click()}
        >
          <Upload size={16} /> Import Word
        </button>
        <button
          type="button"
          onClick={() => {
            if (source)
              editor.commands.setContent(cleanHtml(value), {
                emitUpdate: false,
              });
            setSource(!source);
          }}
          aria-pressed={source}
        >
          <Code2 size={16} /> Source
        </button>
        <button
          type="button"
          aria-label={full ? "Exit full screen" : "Full screen"}
          onClick={() => setFull(!full)}
        >
          {full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
      </div>
      {editor.isActive("table") && !source && (
        <div className="rte-table-tools">
          {[
            ["Row above", () => editor.chain().focus().addRowBefore().run()],
            ["Row below", () => editor.chain().focus().addRowAfter().run()],
            [
              "Column left",
              () => editor.chain().focus().addColumnBefore().run(),
            ],
            [
              "Column right",
              () => editor.chain().focus().addColumnAfter().run(),
            ],
            ["Merge cells", () => editor.chain().focus().mergeCells().run()],
            ["Split cell", () => editor.chain().focus().splitCell().run()],
            ["Delete row", () => editor.chain().focus().deleteRow().run()],
            [
              "Delete column",
              () => editor.chain().focus().deleteColumn().run(),
            ],
            ["Delete table", () => editor.chain().focus().deleteTable().run()],
          ].map(([name, fn]) => (
            <button
              type="button"
              disabled={readOnly}
              key={name as string}
              onClick={() => {
                (fn as () => void)();
              }}
            >
              {name as string}
            </button>
          ))}
        </div>
      )}
      {find && (
        <div className="rte-find">
          <input
            aria-label="Find text"
            placeholder="Find"
            value={needle}
            onChange={(e) => setNeedle(e.target.value)}
          />
          <input
            aria-label="Replacement text"
            placeholder="Replace with"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
          />
          <button
            type="button"
            disabled={readOnly || !needle}
            onClick={replaceAll}
          >
            Replace all
          </button>
        </div>
      )}
      {source ? (
        <textarea
          aria-label="Document HTML source"
          className="rte-source"
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
      <div className="rte-status">
        <span>
          {editor.getText().trim().split(/\s+/).filter(Boolean).length} words ·{" "}
          {editor.getText().length} characters
        </span>
        <span>
          {readOnly ? "Read only" : "Formatting is saved with the document"}
        </span>
      </div>
      <input
        ref={docInput}
        hidden
        type="file"
        accept=".docx"
        onChange={(e) => {
          if (e.target.files?.[0]) void importWord(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={imageInput}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (file.size > 500000) {
            toast.error("Use an image smaller than 500 KB");
            return;
          }
          const reader = new FileReader();
          reader.onload = () =>
            editor
              .chain()
              .focus()
              .setImage({ src: String(reader.result), alt: file.name })
              .run();
          reader.readAsDataURL(file);
        }}
      />
    </div>
  );
}
