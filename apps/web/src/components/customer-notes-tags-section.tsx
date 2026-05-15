"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import {
  ApiError,
  ApiValidationError,
  attachCustomerTag,
  createCustomerNote,
  deleteCustomerNote,
  detachCustomerTag,
  fetchCustomerNotes,
  fetchCustomerTagSuggestions,
  fetchCustomerTags,
  updateCustomerNote,
} from "@ozilcuts/api";
import type { CustomerNote, CustomerTag } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@ozilcuts/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

type CustomerNotesTagsSectionProps = {
  customerUserId: number;
  currentUserId: number;
  isAdmin: boolean;
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; notes: CustomerNote[]; tags: CustomerTag[] }
  | { kind: "error"; message: string };

export function CustomerNotesTagsSection({
  customerUserId,
  currentUserId,
  isAdmin,
}: CustomerNotesTagsSectionProps) {
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [draftBody, setDraftBody] = useState("");
  const [draftPinned, setDraftPinned] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editingPinned, setEditingPinned] = useState(false);
  const [editingBusy, setEditingBusy] = useState(false);
  const [editingError, setEditingError] = useState<string | null>(null);

  const [busyNoteId, setBusyNoteId] = useState<number | null>(null);
  const [noteActionError, setNoteActionError] = useState<string | null>(null);

  const [tagDraft, setTagDraft] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [tagBusy, setTagBusy] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [busyTagId, setBusyTagId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });

      return;
    }
    setState({ kind: "loading" });
    try {
      const [notes, tags] = await Promise.all([
        fetchCustomerNotes(token, customerUserId),
        fetchCustomerTags(token, customerUserId),
      ]);
      setState({ kind: "ok", notes: notes.data, tags: tags.data });
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load notes & tags.";
      setState({ kind: "error", message });
    }
  }, [customerUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) return;
    let cancelled = false;
    fetchCustomerTagSuggestions(token, tagDraft, 8)
      .then((res) => {
        if (cancelled) return;
        setTagSuggestions(res.data);
      })
      .catch(() => {
        if (cancelled) return;
        setTagSuggestions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [tagDraft]);

  const tags = useMemo(
    () => (state.kind === "ok" ? state.tags : []),
    [state],
  );
  const notes = useMemo(
    () => (state.kind === "ok" ? state.notes : []),
    [state],
  );

  const existingTagLabels = useMemo(
    () => new Set(tags.map((t) => t.label)),
    [tags],
  );

  const filteredSuggestions = useMemo(() => {
    return tagSuggestions
      .filter((label) => !existingTagLabels.has(label))
      .slice(0, 6);
  }, [tagSuggestions, existingTagLabels]);

  async function onCreateNote(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredAuthToken();
    if (!token) return;
    if (draftBody.trim() === "") {
      setDraftError("Please enter the note text.");

      return;
    }
    setDraftBusy(true);
    setDraftError(null);
    try {
      await createCustomerNote(token, customerUserId, {
        body: draftBody.trim(),
        pinned: draftPinned,
      });
      setDraftBody("");
      setDraftPinned(false);
      await load();
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setDraftError(err.firstMessage() ?? "Could not save note.");
      } else if (err instanceof ApiError) {
        setDraftError(err.message);
      } else {
        setDraftError("Could not save note.");
      }
    } finally {
      setDraftBusy(false);
    }
  }

  function startEditing(note: CustomerNote) {
    setEditingId(note.id);
    setEditingBody(note.body);
    setEditingPinned(note.pinned);
    setEditingError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingBody("");
    setEditingPinned(false);
    setEditingError(null);
  }

  async function saveEditing(noteId: number) {
    const token = getStoredAuthToken();
    if (!token) return;
    if (editingBody.trim() === "") {
      setEditingError("Please enter the note text.");

      return;
    }
    setEditingBusy(true);
    setEditingError(null);
    try {
      await updateCustomerNote(token, noteId, {
        body: editingBody.trim(),
        pinned: editingPinned,
      });
      cancelEditing();
      await load();
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setEditingError(err.firstMessage() ?? "Could not update note.");
      } else if (err instanceof ApiError) {
        setEditingError(err.message);
      } else {
        setEditingError("Could not update note.");
      }
    } finally {
      setEditingBusy(false);
    }
  }

  async function onDeleteNote(note: CustomerNote) {
    const token = getStoredAuthToken();
    if (!token) return;
    if (!window.confirm("Delete this note?")) return;
    setBusyNoteId(note.id);
    setNoteActionError(null);
    try {
      await deleteCustomerNote(token, note.id);
      await load();
    } catch (err) {
      setNoteActionError(
        err instanceof ApiError ? err.message : "Could not delete note.",
      );
    } finally {
      setBusyNoteId(null);
    }
  }

  async function attachTag(rawLabel: string) {
    const trimmed = rawLabel.trim();
    if (trimmed === "") return;
    const token = getStoredAuthToken();
    if (!token) return;
    setTagBusy(true);
    setTagError(null);
    try {
      await attachCustomerTag(token, customerUserId, trimmed);
      setTagDraft("");
      await load();
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setTagError(err.firstMessage() ?? "Could not add tag.");
      } else if (err instanceof ApiError) {
        setTagError(err.message);
      } else {
        setTagError("Could not add tag.");
      }
    } finally {
      setTagBusy(false);
    }
  }

  async function onTagSubmit(e: React.FormEvent) {
    e.preventDefault();
    await attachTag(tagDraft);
  }

  async function removeTag(tag: CustomerTag) {
    const token = getStoredAuthToken();
    if (!token) return;
    setBusyTagId(tag.id);
    setTagError(null);
    try {
      await detachCustomerTag(token, tag.id);
      await load();
    } catch (err) {
      setTagError(
        err instanceof ApiError ? err.message : "Could not remove tag.",
      );
    } finally {
      setBusyTagId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer notes & tags</CardTitle>
        <CardDescription>
          Internal staff notes and tags. The customer never sees these.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {state.kind === "loading" || state.kind === "idle" ? (
          <p className="text-sm text-muted-foreground" role="status">
            Loading notes & tags…
          </p>
        ) : null}

        {state.kind === "error" ? (
          <div className="flex flex-col gap-2 rounded-md border border-destructive/40 p-3">
            <p className="text-sm text-destructive" role="alert">
              {state.message}
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="self-start"
              onClick={() => void load()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {state.kind === "ok" ? (
          <>
            <section
              aria-labelledby="customer-tags-heading"
              className="space-y-3"
            >
              <h3
                id="customer-tags-heading"
                className="text-sm font-semibold text-foreground"
              >
                Tags
              </h3>
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tags yet.
                </p>
              ) : (
                <ul
                  className="flex flex-wrap gap-2"
                  aria-label="Customer tags"
                >
                  {tags.map((tag) => (
                    <li key={tag.id}>
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {tag.label}
                        <button
                          type="button"
                          onClick={() => void removeTag(tag)}
                          disabled={busyTagId === tag.id}
                          aria-label={`Remove tag ${tag.label}`}
                          className="ml-1 rounded-full px-1 text-primary/80 hover:text-primary disabled:opacity-50"
                        >
                          ×
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <form
                className="flex flex-col gap-2 sm:flex-row sm:items-end"
                onSubmit={onTagSubmit}
              >
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="tag-input">Add tag</Label>
                  <Input
                    id="tag-input"
                    value={tagDraft}
                    onChange={(ev) => setTagDraft(ev.target.value)}
                    placeholder="e.g. vip, sensitive scalp"
                    maxLength={32}
                    aria-describedby="tag-help"
                  />
                  <p id="tag-help" className="text-xs text-muted-foreground">
                    Tags are normalized to lowercase. Tap a suggestion to add
                    it instantly.
                  </p>
                </div>
                <Button type="submit" disabled={tagBusy}>
                  {tagBusy ? "Adding…" : "Add tag"}
                </Button>
              </form>
              {filteredSuggestions.length > 0 ? (
                <div
                  className="flex flex-wrap gap-2"
                  aria-label="Tag suggestions"
                >
                  {filteredSuggestions.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => void attachTag(label)}
                      disabled={tagBusy}
                      className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/60"
                    >
                      + {label}
                    </button>
                  ))}
                </div>
              ) : null}
              {tagError ? (
                <p className="text-sm text-destructive" role="alert">
                  {tagError}
                </p>
              ) : null}
            </section>

            <section
              aria-labelledby="customer-notes-heading"
              className="space-y-3"
            >
              <h3
                id="customer-notes-heading"
                className="text-sm font-semibold text-foreground"
              >
                Notes
              </h3>
              <form
                className="flex flex-col gap-2 rounded-md border border-border/60 p-3"
                onSubmit={onCreateNote}
              >
                <Label htmlFor="note-body" className="sr-only">
                  Note text
                </Label>
                <textarea
                  id="note-body"
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-24 w-full rounded-lg border px-3 py-2 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:min-h-20 sm:text-sm"
                  value={draftBody}
                  onChange={(ev) => setDraftBody(ev.target.value)}
                  placeholder="Add a private note for staff (e.g. preferred small-talk topics, no-show history)"
                  maxLength={5000}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={draftPinned}
                      onChange={(ev) => setDraftPinned(ev.target.checked)}
                    />
                    Pin to top
                  </label>
                  <Button type="submit" size="sm" pending={draftBusy}>
                    {draftBusy ? "Saving…" : "Add note"}
                  </Button>
                </div>
                {draftError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {draftError}
                  </p>
                ) : null}
              </form>

              {noteActionError ? (
                <p className="text-sm text-destructive" role="alert">
                  {noteActionError}
                </p>
              ) : null}

              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No notes yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {notes.map((note) => {
                    const canEdit =
                      isAdmin || note.author_user_id === currentUserId;
                    const isEditing = editingId === note.id;
                    const isBusy = busyNoteId === note.id;

                    return (
                      <li
                        key={note.id}
                        className="rounded-md border border-border/60 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {note.pinned ? (
                              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                                Pinned
                              </span>
                            ) : null}
                            <span>
                              {note.author?.name ?? "Staff"}
                              {note.created_at
                                ? ` · ${new Date(note.created_at).toLocaleString()}`
                                : ""}
                            </span>
                          </div>
                          {canEdit && !isEditing ? (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => startEditing(note)}
                                disabled={isBusy}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => void onDeleteNote(note)}
                                pending={isBusy}
                              >
                                {isBusy ? "Working…" : "Delete"}
                              </Button>
                            </div>
                          ) : null}
                        </div>

                        {isEditing ? (
                          <div className="mt-2 flex flex-col gap-2">
                            <textarea
                              className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-24 w-full rounded-lg border px-3 py-2 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:min-h-20 sm:text-sm"
                              value={editingBody}
                              onChange={(ev) =>
                                setEditingBody(ev.target.value)
                              }
                              maxLength={5000}
                              aria-label="Edit note text"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                <input
                                  type="checkbox"
                                  className="size-4 rounded border-input"
                                  checked={editingPinned}
                                  onChange={(ev) =>
                                    setEditingPinned(ev.target.checked)
                                  }
                                />
                                Pin to top
                              </label>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditing}
                                  disabled={editingBusy}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => void saveEditing(note.id)}
                                  pending={editingBusy}
                                >
                                  {editingBusy ? "Saving…" : "Save"}
                                </Button>
                              </div>
                            </div>
                            {editingError ? (
                              <p
                                className="text-sm text-destructive"
                                role="alert"
                              >
                                {editingError}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                            {note.body}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
