export type Permission = "r" | "w" | "rw" | "none";

export interface AbilityInterface {
  permission: Permission;
  canRead: () => boolean;
  canWrite: () => boolean;
}

export class Ability implements AbilityInterface {
  permission: Permission = "none";

  constructor(permission: Permission) {
    this.permission = permission;
  }

  /**
   * Checks if the ability has permission to read.
   * @returns True if the ability can read, otherwise false.
   */
  canRead() {
    return this.permission === "r" || this.permission === "rw";
  }

  /**
   * Checks if the ability has permission to write.
   * @returns True if the ability can write, otherwise false.
   */
  canWrite() {
    return this.permission === "w" || this.permission === "rw";
  }
}
