import type { ScimGroup, ScimUser } from "./types.js";

/** In-memory SCIM resource store (lab only). */
export class Store {
  users = new Map<string, ScimUser>();
  groups = new Map<string, ScimGroup>();

  clear(): void {
    this.users.clear();
    this.groups.clear();
  }

  findUserByUserName(userName: string): ScimUser | undefined {
    for (const user of this.users.values()) {
      if (user.userName.toLowerCase() === userName.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }

  findGroupByDisplayName(displayName: string): ScimGroup | undefined {
    for (const group of this.groups.values()) {
      if (group.displayName.toLowerCase() === displayName.toLowerCase()) {
        return group;
      }
    }
    return undefined;
  }
}

export const store = new Store();