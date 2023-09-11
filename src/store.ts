import { JSONObject, JSONPrimitive, JSONArray } from "./json-types";
import "reflect-metadata";
import { Ability, AbilityInterface, Permission } from "./Helpers/Ability";

export const ABILITY_METADATA = "ability";

export type StoreResult = IStore | JSONPrimitive | undefined;

export type StoreValue = JSONObject | JSONArray | StoreResult | (() => StoreResult);

export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): StoreResult;
  write(path: string, value: StoreValue): StoreValue;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}

/**
 * A decorator function to set permissions on store properties.
 * @param permission - The permission to set for the property.
 */
export function Restrict(permission: Permission): any {
  return function (target: Store, propertyKey: string) {
    Reflect.defineMetadata(ABILITY_METADATA, new Ability(permission), target, propertyKey);
  };
}

export class Store implements IStore {
  defaultPolicy: Permission = "rw";
  [key: string]: any;

  /**
   * Retrieves or creates ability metadata for a specific key.
   * @param key - The key for which ability metadata is needed.
   * @returns The ability metadata for the key.
   */
  private getAbilityMetadata(key: string) {
    const abilityMetaData = Reflect.getMetadata(ABILITY_METADATA, this, key) as AbilityInterface;

    return abilityMetaData || new Ability(this.defaultPolicy);
  }

  /**
   * Recursively reads a value from the store based on a given path.
   * @param path - The path to the value to be read.
   * @returns The value read from the store.
   * @throws Error if the path cannot be read due to lack of permission.
   * @private
   */
  private deepReading(path: string[]): StoreResult {
    if (!this.allowedToRead(path[0])) {
      throw new Error("Cannot read property");
    }

    const itemToRead = typeof this[path[0]] === "function" ? this[path[0]]() : this[path[0]];
    if (itemToRead instanceof Store && path.length > 1) {
      path.shift();
      return itemToRead.deepReading(path);
    }

    return itemToRead;
  }

  /**
   * Recursively writes a value to the store based on a given path.
   * @param path - The path where the value should be written.
   * @param value - The value to be written to the store.
   * @returns The value that was written to the store.
   * @throws Error if the path cannot be written due to lack of permission.
   * @private
   */
  private deepWriting(path: string[], value: StoreValue): StoreResult {
    const pathToWrite = path[0];

    if (!this.allowedToWrite(pathToWrite)) {
      throw new Error("Cannot read property");
    }

    if (!this[pathToWrite] && path.length > 1) {
      this[pathToWrite] = new Store();
    } else if (path.length === 1) {
      this[pathToWrite] = value;
    }

    if (path.length > 1) {
      path.shift();
      return this[pathToWrite].deepWriting(path, value);
    }

    return this[pathToWrite];
  }

  /**
   * Recursively creates paths from a JSONObject.
   * @param base - The base path for creating paths.
   * @param value - The JSONObject to create paths from.
   * @returns An array of objects containing paths and values to be written.
   * @private
   */
  private deepCreatingPathFromJSONObject(
    basePath: string | null,
    value: JSONObject
  ): { path: string; value: JSONPrimitive }[] {
    const entries = Object.entries(value);

    return entries
      .map((entry) => {
        const childBasePath = `${basePath ? `${basePath}:` : ""}${entry[0]}`;

        if (typeof entry[1] !== "object") {
          return { path: childBasePath, value: entry[1] };
        }

        return this.deepCreatingPathFromJSONObject(childBasePath, entry[1] as JSONObject);
      })
      .flat();
  }

  /**
   * Checks if a key is allowed to be read.
   * @param key - The key to check for read permission.
   * @returns True if the key is allowed to be read, otherwise false.
   */
  allowedToRead(key: string): boolean {
    return this.getAbilityMetadata(key).canRead();
  }

  /**
   * Checks if a key is allowed to be written.
   * @param key - The key to check for write permission.
   * @returns True if the key is allowed to be written, otherwise false.
   */
  allowedToWrite(key: string): boolean {
    return this.getAbilityMetadata(key).canWrite();
  }

  /**
   * Reads a value from the store based on a given path.
   * @param path - The path to the value to be read.
   * @returns The value read from the store.
   */
  read(path: string): StoreResult {
    return this.deepReading(path.split(":"));
  }

  /**
   * Writes a value to the store based on a given path.
   * @param path - The path where the value should be written.
   * @param value - The value to be written to the store.
   * @returns The value that was written to the store.
   */
  write(path: string, value: StoreValue): StoreValue {
    if (typeof value === "object") {
      const paths = this.deepCreatingPathFromJSONObject(path, value as JSONObject);
      paths.map((path) => this.write(path.path, path.value));

      return value;
    }

    return this.deepWriting(path.split(":"), value);
  }

  /**
   * Writes multiple entries to the store based on a JSONObject.
   * @param entries - The entries to be written to the store.
   */
  writeEntries(entries: JSONObject): void {
    const paths = this.deepCreatingPathFromJSONObject(null, entries);

    paths.map((path) => this.write(path.path, path.value));
  }

  /**
   * Retrieves all entries from the store that have read permission.
   * @returns A JSONObject containing the entries with read permission.
   */
  entries(): JSONObject {
    const entriesOrEmptyObject = (key: string, value: any) => {
      if (!this.allowedToRead(key)) {
        return {};
      }

      if (value instanceof Store) {
        return { [key]: value.entries() };
      }

      return { [key]: value };
    };

    return Object.entries(this).reduce(
      (entries, entry) => ({
        ...entries,
        ...entriesOrEmptyObject(entry[0], entry[1]),
      }),
      {}
    );
  }
}
