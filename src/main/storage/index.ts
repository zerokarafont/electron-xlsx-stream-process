import os from "os";
import storage, { DataOptions } from "electron-json-storage";
import { promisify } from "util";

export async function getFileMD5(key: string): Promise<string> {
  const map = storage.getSync("md5", { dataPath: os.tmpdir() });
  return (map as Record<string, string>)[key];
}

export async function setFileMD5(key: string, hash: string): Promise<void> {
  const map = storage.getSync("md5", { dataPath: os.tmpdir() }) as Record<
    string,
    string
  >;
  map[key] = hash;

  await promisify<string, Record<string, string>, DataOptions>(storage.set)(
    "md5",
    map,
    {
      dataPath: os.tmpdir(),
    }
  );
}

export async function clearMD5Storage(): Promise<void> {
  await promisify<string, Record<string, unknown>, DataOptions>(storage.set)(
    "md5",
    {},
    { dataPath: os.tmpdir() }
  );
}

export function configureLocalStorage(): void {
  storage.setDataPath(os.tmpdir());
  if (!storage.getSync("md5")) {
    storage.set("md5", {}, (err) => {
      if (err) throw err;
    });
  }
}
