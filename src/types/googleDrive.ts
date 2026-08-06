export interface GoogleDriveOwner {
  displayName?: string;
  emailAddress?: string;
  photoLink?: string;
}

export interface GoogleDriveFile {
  fileId: string;
  name: string;
  mimeType: string;
  webViewLink?: string | null;
  webContentLink?: string | null;
  thumbnailLink?: string | null;
  iconLink?: string | null;
  size?: string | null;
  modifiedTime?: string | null;
  // Legacy fields still tolerated from partial raw payloads pre-normalization
  id?: string;
  createdTime?: string | null;
  parents?: string[];
  owners?: GoogleDriveOwner[];
  starred?: boolean;
  trashed?: boolean;
}

export interface DriveFolder {
  fileId: string;
  id?: string;
  name: string;
  mimeType?: string;
  parents?: string[];
  webViewLink?: string;
  iconLink?: string;
}

export interface DrivePagination {
  nextPageToken?: string | null;
  pageToken?: string | null;
  totalItems?: number;
}

export interface DriveSearchResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string | null;
}

export interface DriveUploadResponse {
  file: GoogleDriveFile;
}
