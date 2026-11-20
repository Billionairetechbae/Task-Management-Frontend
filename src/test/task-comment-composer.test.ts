import { describe, expect, it } from "vitest";
import {
  canSendTaskComment,
  MAX_COMMENT_FILES,
  MAX_COMMENT_FILE_SIZE,
  shouldSendTypingStart,
  validateCommentFiles,
} from "@/lib/commentComposer";

const file = (name: string, size = 10) => new File([new Uint8Array(size)], name);

describe("task comment composer", () => {
  it("allows non-empty text or an attachment and rejects whitespace-only messages", () => {
    expect(canSendTaskComment("hello", 0)).toBe(true);
    expect(canSendTaskComment(" \n ", 1)).toBe(true);
    expect(canSendTaskComment(" \n ", 0)).toBe(false);
  });

  it("applies supported extensions, the 20 MB limit, and the ten-file cap before selecting", () => {
    const selected = [file("photo.png"), file("notes.pdf"), file("movie.exe"), file("large.jpg", MAX_COMMENT_FILE_SIZE + 1)];
    const result = validateCommentFiles([], selected);
    expect(result.accepted).toEqual(selected.slice(0, 2));
    expect(result.rejected).toHaveLength(2);
    expect(validateCommentFiles(Array.from({ length: MAX_COMMENT_FILES }, (_, i) => file(`${i}.png`)), [file("one.png")]).accepted).toHaveLength(0);
    expect(validateCommentFiles([], [file("zero.png", 0)]).accepted).toHaveLength(0);
  });

  it("sends a typing start only once for a ready, authorized, connected composer", () => {
    const state = { isConnected: true, canCollaborate: true, taskReady: true };
    expect(shouldSendTypingStart({ ...state, alreadyTyping: false })).toBe(true);
    expect(shouldSendTypingStart({ ...state, alreadyTyping: true })).toBe(false);
    expect(shouldSendTypingStart({ ...state, canCollaborate: false, alreadyTyping: false })).toBe(false);
    expect(shouldSendTypingStart({ ...state, taskReady: false, alreadyTyping: false })).toBe(false);
    expect(shouldSendTypingStart({ ...state, isConnected: false, alreadyTyping: false })).toBe(false);
  });
});
