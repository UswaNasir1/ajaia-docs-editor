"use client";

import type { ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  ChevronDown,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ToolbarProps = {
  editor: Editor | null;
  disabled?: boolean;
};

function ToolButton({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const title = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      className="ajaia-toolbar-btn"
      aria-label={label}
      title={title}
      disabled={disabled}
      aria-pressed={active}
      data-active={active ? "true" : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <span
      aria-hidden
      className="mx-1 hidden h-5 w-px shrink-0 bg-border sm:inline-block"
    />
  );
}

export function EditorToolbar({ editor, disabled }: ToolbarProps) {
  if (!editor) return null;

  const headingLabel = editor.isActive("heading", { level: 1 })
    ? "Heading 1"
    : editor.isActive("heading", { level: 2 })
      ? "Heading 2"
      : editor.isActive("heading", { level: 3 })
        ? "Heading 3"
        : "Paragraph";

  return (
    <div
      className="sticky top-[57px] z-10 border-b border-border bg-white"
      role="toolbar"
      aria-label="Formatting"
    >
      <div className="mx-auto flex max-w-[816px] items-center gap-0.5 overflow-x-auto px-3 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex shrink-0 items-center">
          <ToolButton
            label="Undo"
            shortcut="Cmd/Ctrl+Z"
            disabled={disabled || !editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="size-4" />
          </ToolButton>
          <ToolButton
            label="Redo"
            shortcut="Cmd/Ctrl+Shift+Z"
            disabled={disabled || !editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="size-4" />
          </ToolButton>
        </div>

        <Divider />

        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={
              <button
                type="button"
                className={cn(
                  "ajaia-toolbar-btn w-auto gap-1 px-2 text-xs font-medium",
                  (editor.isActive("heading") ||
                    editor.isActive("paragraph")) &&
                    "",
                )}
                aria-label="Heading level"
                title="Heading"
                disabled={disabled}
              />
            }
          >
            <Heading2 className="size-4 shrink-0" />
            <span className="max-w-[7rem] truncate">{headingLabel}</span>
            <ChevronDown className="size-3.5 opacity-60" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-40">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().setParagraph().run()}
            >
              Paragraph
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
            >
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
            >
              Heading 3
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Divider />

        <div className="flex shrink-0 items-center">
          <ToolButton
            label="Bold"
            shortcut="Cmd/Ctrl+B"
            active={editor.isActive("bold")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolButton>
          <ToolButton
            label="Italic"
            shortcut="Cmd/Ctrl+I"
            active={editor.isActive("italic")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolButton>
          <ToolButton
            label="Underline"
            shortcut="Cmd/Ctrl+U"
            active={editor.isActive("underline")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Underline className="size-4" />
          </ToolButton>
        </div>

        <Divider />

        <div className="flex shrink-0 items-center">
          <ToolButton
            label="Bullet list"
            active={editor.isActive("bulletList")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToolButton>
          <ToolButton
            label="Numbered list"
            active={editor.isActive("orderedList")}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToolButton>
        </div>
      </div>
    </div>
  );
}
