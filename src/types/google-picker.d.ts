/**
 * Minimal ambient type declarations for the Google API JS client (gapi)
 * and the Google Picker API loaded via https://apis.google.com/js/api.js
 *
 * Only the surface actually used by useGooglePicker.ts is declared here.
 * Do not expand this file for unrelated Google APIs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare namespace google {
  namespace picker {
    /** The numeric action value indicating the user picked file(s). */
    const Action: {
      PICKED: string;
      CANCEL: string;
    };

    /** Document field keys returned in a picker response document. */
    const Document: {
      ID: string;
      NAME: string;
      MIME_TYPE: string;
      URL: string;
      THUMBNAILS: string;
      DESCRIPTION: string;
    };

    /** Response keys returned from the Picker callback. */
    const Response: {
      ACTION: string;
      DOCUMENTS: string;
    };

    interface PickerDocument {
      [key: string]: any;
    }

    interface PickerResponse {
      [key: string]: any;
    }

    class PickerBuilder {
      constructor();
      addView(view: any): PickerBuilder;
      addViewGroup(group: any): PickerBuilder;
      setOAuthToken(token: string): PickerBuilder;
      setDeveloperKey(key: string): PickerBuilder;
      setAppId(appId: string): PickerBuilder;
      setCallback(callback: (data: PickerResponse) => void): PickerBuilder;
      setTitle(title: string): PickerBuilder;
      enableFeature(feature: any): PickerBuilder;
      disableFeature(feature: any): PickerBuilder;
      build(): Picker;
    }

    interface Picker {
      setVisible(visible: boolean): void;
      dispose(): void;
    }

    class DocsView {
      constructor(viewId?: ViewId);
      setIncludeFolders(include: boolean): DocsView;
      setSelectFolderEnabled(enabled: boolean): DocsView;
      setMimeTypes(types: string): DocsView;
      setMode(mode: any): DocsViewMode;
    }

    class DocsUploadView {
      constructor();
      setIncludeFolders(include: boolean): DocsUploadView;
    }

    class ViewGroup {
      constructor(view: any);
      addLabel(label: string): ViewGroup;
      addView(view: any): ViewGroup;
    }

    const ViewId: {
      DOCS: string;
      DOCS_IMAGES: string;
      DOCS_IMAGES_AND_VIDEOS: string;
      DOCS_VIDEOS: string;
      DOCUMENTS: string;
      DRAWINGS: string;
      FOLDERS: string;
      FORMS: string;
      IMAGE_SEARCH: string;
      MY_MAPS: string;
      PDF: string;
      PHOTOS: string;
      PHOTO_ALBUMS: string;
      PHOTO_UPLOAD: string;
      PRESENTATIONS: string;
      RECENTLY_PICKED: string;
      SPREADSHEETS: string;
      VIDEO_SEARCH: string;
      YOUTUBE: string;
    };

    const DocsViewMode: {
      GRID: string;
      LIST: string;
    };

    const Feature: {
      MULTISELECT_ENABLED: string;
      NAV_HIDDEN: string;
      SIMPLE_UPLOAD_ENABLED: string;
      SUPPORT_DRIVES: string;
    };
  }
}

interface Window {
  gapi: {
    load(libraries: string, callback: () => void): void;
    client?: any;
  };
  google: typeof google;
  /** Set to true once the gapi script has been injected. */
  _gapiScriptInjected?: boolean;
  /** Set to true once gapi.load('picker') has resolved. */
  _gapiPickerReady?: boolean;
}
