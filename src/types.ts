export interface ScimMeta {
  resourceType: "User" | "Group";
  created: string;
  lastModified: string;
  location: string;
}

export interface ScimName {
  formatted?: string;
  familyName?: string;
  givenName?: string;
}

export interface ScimEmail {
  value: string;
  type?: string;
  primary?: boolean;
}

export interface ScimUser {
  schemas: string[];
  id: string;
  externalId?: string;
  userName: string;
  name?: ScimName;
  displayName?: string;
  emails?: ScimEmail[];
  active: boolean;
  meta: ScimMeta;
}

export interface ScimGroupMember {
  value: string;
  display?: string;
  $ref?: string;
}

export interface ScimGroup {
  schemas: string[];
  id: string;
  displayName: string;
  members: ScimGroupMember[];
  meta: ScimMeta;
}

export interface ScimListResponse<T> {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}

export interface ScimError {
  schemas: string[];
  status: string;
  scimType?: string;
  detail: string;
}

export interface ScimPatchOp {
  op: string;
  path?: string;
  value?: unknown;
}

export interface ScimPatchRequest {
  schemas: string[];
  Operations: ScimPatchOp[];
}