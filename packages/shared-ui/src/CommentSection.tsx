"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Comment, formatRelativeTime, toHue } from "./comments";
import { useAuth } from "./auth";
import { useTheme } from "./theme";

interface CommentSectionProps {
  comments: Comment[];
}

const COLLAPSE_AT = 3;

function Avatar({ name, hue }: { name: string; hue: number }) {
  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-sm"
      style={{ backgroundColor: `hsl(${hue} 62% 55%)` }}
    >
      {name[0].toUpperCase()}
    </span>
  );
}

interface CommentItemProps {
  comment: Comment;
  depth: number;
  isPink: boolean;
  childrenByParent: Map<string | null, Comment[]>;
  replyingTo: string | null;
  onReply: (id: string) => void;
  onSubmitReply: (parentId: string, text: string) => void;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  now: number;
}

function cardBgFor(depth: number, isPink: boolean): string {
  const levels = isPink
    ? ["bg-black/[0.06]", "bg-black/[0.045]", "bg-black/[0.03]"]
    : ["bg-white/[0.07]", "bg-white/[0.05]", "bg-white/[0.035]"];
  return levels[Math.min(depth, levels.length - 1)];
}

function CommentItem({
  comment,
  depth,
  isPink,
  childrenByParent,
  replyingTo,
  onReply,
  onSubmitReply,
  expanded,
  onToggleExpand,
  now,
}: CommentItemProps) {
  const children = childrenByParent.get(comment.id) ?? [];
  const collapsed = children.length > COLLAPSE_AT && !expanded.has(comment.id);
  const visible = collapsed ? children.slice(0, COLLAPSE_AT) : children;
  const hiddenCount = children.length - visible.length;
  const isReplying = replyingTo === comment.id;

  return (
    <div className={depth === 0 ? "" : "ml-3"}>
      <div className={`rounded-2xl px-3.5 py-3 ${cardBgFor(depth, isPink)}`}>
        <div className="flex items-start gap-2.5">
          <Avatar name={comment.author} hue={comment.hue} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold">{comment.author}</span>
              <span className="text-[11px] opacity-40">
                {formatRelativeTime(comment.createdAt, now)}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed">{comment.text}</p>
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={() => (isReplying ? onReply("") : onReply(comment.id))}
                className="text-[11px] font-semibold opacity-50 transition hover:opacity-100"
              >
                {isReplying ? "Cancel" : "Reply"}
              </button>
            </div>
            {isReplying && (
              <ReplyForm onSubmit={(text) => onSubmitReply(comment.id, text)} />
            )}
          </div>
        </div>
      </div>

      {visible.length > 0 && (
        <div className="mt-2 space-y-2">
          {visible.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              depth={depth + 1}
              isPink={isPink}
              childrenByParent={childrenByParent}
              replyingTo={replyingTo}
              onReply={onReply}
              onSubmitReply={onSubmitReply}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              now={now}
            />
          ))}
          {hiddenCount > 0 && (
            <button
              onClick={() => onToggleExpand(comment.id)}
              className="ml-3 rounded-full border border-[var(--panel-border)] px-3 py-1 text-[11px] font-semibold opacity-70 transition hover:opacity-100"
            >
              Show {hiddenCount} more repl{hiddenCount > 1 ? "ies" : "y"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReplyForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mt-2 flex gap-1.5"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Reply…"
        autoFocus
        className="min-w-0 flex-1 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 text-sm outline-none placeholder:opacity-40 focus:border-accent"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-on-accent transition disabled:opacity-40"
      >
        Reply
      </button>
    </form>
  );
}

export function CommentSection({ comments }: CommentSectionProps) {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const isPink = theme === "pink";

  const [localComments, setLocalComments] = useState<Comment[]>(comments);
  const [newText, setNewText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const nextId = useRef(0);
  const now = useMemo(() => Date.now(), []);

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Comment[]>();
    for (const c of localComments) {
      const list = map.get(c.parentId) ?? [];
      list.push(c);
      map.set(c.parentId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.createdAt - b.createdAt);
    }
    return map;
  }, [localComments]);

  const roots = childrenByParent.get(null) ?? [];

  const requireUser = (): boolean => {
    if (user) return true;
    router.push("/login");
    return false;
  };

  const addComment = (parentId: string | null, text: string) => {
    if (!requireUser() || !user) return;
    setLocalComments((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}-${nextId.current++}`,
        author: user.email,
        hue: toHue(user.email),
        text,
        createdAt: Date.now(),
        parentId,
      },
    ]);
  };

  const handlePost = () => {
    const text = newText.trim();
    if (!text) return;
    addComment(null, text);
    setNewText("");
  };

  const handleSubmitReply = (parentId: string, text: string) => {
    addComment(parentId, text);
    setReplyingTo(null);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest opacity-80">
          Comments
        </h3>
        <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
          {localComments.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {localComments.length === 0 ? (
          <p className="text-sm opacity-40">
            No comments yet — be the first to reply.
          </p>
        ) : (
          <div className="space-y-2.5">
            {roots.map((root) => (
              <CommentItem
                key={root.id}
                comment={root}
                depth={0}
                isPink={isPink}
                childrenByParent={childrenByParent}
                replyingTo={replyingTo}
                onReply={setReplyingTo}
                onSubmitReply={handleSubmitReply}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                now={now}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--panel-border)] p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePost();
          }}
          className="flex gap-2"
        >
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={user ? "Write a comment…" : "Log in to comment…"}
            className="min-w-0 flex-1 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2.5 text-sm outline-none placeholder:opacity-40 focus:border-accent"
          />
          <button
            type="submit"
            disabled={!newText.trim()}
            className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition disabled:opacity-40"
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
}
