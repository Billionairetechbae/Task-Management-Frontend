export interface GoogleDriveOwner {
  displayName?: string;
  emailAddress?: string;
  photoLink?: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  modifiedTime: string;
  createdTime?: string;
  parents?: string[];
  owners?: GoogleDriveOwner[];
  iconLink?: string;
  starred?: boolean;
  trashed?: boolean;
}

export interface DriveFolder {
  id: string;
  name: string;
  mimeType?: string;
  parents?: string[];
  webViewLink?: string;
  iconLink?: string;
}

export interface DrivePagination {
  nextPageToken?: string;
  pageToken?: string;
  totalItems?: number;
}

export interface DriveSearchResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

export interface DriveUploadResponse {
  file: GoogleDriveFile;
}
