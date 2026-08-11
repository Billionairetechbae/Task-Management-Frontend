/**
 * useGooglePicker
 *
 * Opens the official Google Picker API so the user can browse their full
 * Google Drive and select a file to attach.
 *
 * Architecture:
 *  1. Lazy-loads https://apis.google.com/js/api.js once per page lifetime.
 *  2. Calls gapi.load("picker") once, caches readiness on window._gapiPickerReady.
 *  3. Requests a short-lived access token from the backend (never a refresh token).
 *  4. Opens the Picker; resolves the promise with a normalized GoogleDriveFile.
 *  5. Returns null when the user cancels.
 *
 * Required environment variable (browser-safe, NOT a secret):
 *   VITE_GOOGLE_API_KEY — a Google Cloud API key restricted to the Picker API.
 *
 * Backend dependency:
 *   GET /api/v1/integrations/google/picker-token
 *   → { data: { accessToken: string, expiresAt?: string } }
 *
 * The access token is held only in a JS local variable during the Picker
 * session and is never written to localStorage / sessionStorage.
 */

import { useCallback, useEffect, useRef } from "react";
import { googleIntegrationService } from "@/services/googleIntegrationService";
import type { GoogleDriveFile } from "@/types/googleDrive";

// ─── Folder MIME type — must never be attachable ────────────────────────────
const FOLDER_MIME = "application/vnd.google-apps.folder";

// ─── GAPI script URL ─────────────────────────────────────────────────────────
const GAPI_SCRIPT_SRC = "https://apis.google.com/js/api.js";

// ─── Normalise a raw Google Picker document into Admiino's canonical shape ──
function normalizePickerDocument(doc: google.picker.PickerDocument): GoogleDriveFile {
  const D = google.picker.Document;
  const thumbnails: any[] = doc[D.THUMBNAILS] ?? [];
  return {
    fileId: String(doc[D.ID] ?? ""),
    name: String(doc[D.NAME] ?? ""),
    mimeType: String(doc[D.MIME_TYPE] ?? "application/octet-stream"),
    // Picker returns the file's Drive URL in Document.URL
    webViewLink: (doc[D.URL] as string) ?? null,
    thumbnailLink: (thumbnails[thumbnails.length - 1]?.url as string) ?? null,
    iconLink: null,
    size: null,
    modifiedTime: null,
  };
}

// ─── Inject the gapi script tag exactly once ─────────────────────────────────
function injectGapiScript(): Promise<void> {
  if (window._gapiScriptInjected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GAPI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window._gapiScriptInjected = true;
      resolve();
    };
    script.onerror = () =>
      reject(new Error("Failed to load Google API script. Check your network connection."));
    document.head.appendChild(script);
  });
}

// ─── Load the picker module via gapi.load exactly once ───────────────────────
function loadPickerModule(): Promise<void> {
  if (window._gapiPickerReady) return Promise.resolve();
  return new Promise((resolve, reject) => {
    try {
      window.gapi.load("picker", () => {
        window._gapiPickerReady = true;
        resolve();
      });
    } catch (err) {
      reject(new Error("gapi.load failed — Google API may not have loaded correctly."));
    }
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface GooglePickerResult {
  fileId: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  source: "google-drive";
}

export interface UseGooglePickerOptions {
  /** Called when the user cancels the Picker without selecting. */
  onCancel?: () => void;
  /** Called when the Picker or token request fails. */
  onError?: (err: Error) => void;
}

export function useGooglePicker(options: UseGooglePickerOptions = {}) {
  const { onCancel, onError } = options;

  // Live picker instance — kept in a ref so we can dispose it at any time.
  const pickerRef = useRef<google.picker.Picker | null>(null);

  // The resolve function from the pending promise.  When we dispose the
  // picker programmatically (Cancel button, Escape, unmount) we call this
  // with `null` so the awaiting caller in the dialog can clean up.
  const resolveRef = useRef<((value: GooglePickerResult | null) => void) | null>(null);

  // Keep callbacks in refs so `openGooglePicker` never re-creates between
  // renders.  Without this the inline closures in the dialog component would
  // change on every render, invalidating memoised callers.
  const onCancelRef = useRef(onCancel);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onCancelRef.current = onCancel;
    onErrorRef.current = onError;
  });

  // ─── Tear down the live picker + resolve the pending promise with null ──
  const dispose = useCallback(() => {
    if (pickerRef.current) {
      try { pickerRef.current.dispose(); } catch { /* noop */ }
      pickerRef.current = null;
    }
    if (resolveRef.current) {
      const fn = resolveRef.current;
      resolveRef.current = null;
      fn(null);
    }
  }, []);

  // Cleanup on unmount — never leave a dangling picker iframe.
  useEffect(() => () => dispose(), [dispose]);

  const openGooglePicker = useCallback((): Promise<GooglePickerResult | null> => {
    // If a previous picker is somehow still alive, tear it down first so we
    // don't leak overlapping iframes or dangling promises.
    if (pickerRef.current) {
      try { pickerRef.current.dispose(); } catch { /* noop */ }
      pickerRef.current = null;
    }
    if (resolveRef.current) {
      const fn = resolveRef.current;
      resolveRef.current = null;
      fn(null);
    }

    return new Promise(async (resolve, reject) => {
      resolveRef.current = resolve;
      try {
        // 1. Get the browser-safe API key from Vite env
        const apiKey = (import.meta as any).env?.VITE_GOOGLE_API_KEY as string | undefined;
        if (!apiKey) {
          throw new Error(
            "VITE_GOOGLE_API_KEY is not set. Add it to your .env file."
          );
        }

        // 2. Lazy-load gapi script + picker module
        await injectGapiScript();
        await loadPickerModule();

        // 3. Request a short-lived access token from backend (never refresh token)
        const { accessToken } = await googleIntegrationService.getPickerToken();

        // 4. Build the Picker
        const { PickerBuilder, DocsView, Feature, Action, Response, Document } =
          google.picker;

        // All-Drive view: allows browsing My Drive + Shared Drives.
        // Folders are browsable (double-click to enter) but NOT selectable.
        const allDriveView = new DocsView()
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false);

        // Shared-with-me view
        const sharedView = new DocsView(google.picker.ViewId.DOCS);

        const picker = new PickerBuilder()
          .addView(allDriveView)
          .addView(sharedView)
          .enableFeature(Feature.SUPPORT_DRIVES)   // include Shared Drives
          .setOAuthToken(accessToken)
          .setDeveloperKey(apiKey)
          .setTitle("Select a file from Google Drive")
          .setCallback((data: google.picker.PickerResponse) => {
            const action = data[Response.ACTION];

            if (action === Action.PICKED) {
              const docs: google.picker.PickerDocument[] =
                data[Response.DOCUMENTS] ?? [];
              const doc = docs[0];

              if (!doc) {
                // Defensive: no document in payload
                onCancelRef.current?.();
                pickerRef.current = null;
                resolveRef.current = null;
                resolve(null);
                return;
              }

              const mimeType = String(doc[Document.MIME_TYPE] ?? "");

              // Hard-block folder attachments
              if (mimeType === FOLDER_MIME) {
                onErrorRef.current?.(new Error("Folders cannot be attached. Please select a file."));
                pickerRef.current = null;
                resolveRef.current = null;
                resolve(null);
                return;
              }

              const normalized = normalizePickerDocument(doc);
              pickerRef.current = null;
              resolveRef.current = null;
              resolve({
                fileId: normalized.fileId,
                name: normalized.name,
                mimeType: normalized.mimeType,
                webViewLink: normalized.webViewLink ?? undefined,
                thumbnailLink: normalized.thumbnailLink ?? undefined,
                source: "google-drive",
              });
            } else if (action === Action.CANCEL) {
              onCancelRef.current?.();
              pickerRef.current = null;
              resolveRef.current = null;
              resolve(null);
            }
            // Any other action (e.g. navigation) does not resolve/reject —
            // the picker stays open and the user can continue browsing.
          })
          .build();

        pickerRef.current = picker;
        picker.setVisible(true);
      } catch (err: any) {
        const error =
          err instanceof Error ? err : new Error(String(err?.message ?? err));
        onErrorRef.current?.(error);
        pickerRef.current = null;
        resolveRef.current = null;
        reject(error);
      }
    });
  }, []);  // stable — refs absorb callback changes

  return { openGooglePicker, dispose };
}

export default useGooglePicker;
