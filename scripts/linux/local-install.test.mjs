import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const installer = join(root, "install-linux.sh").replaceAll("\\", "/");
const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "/bin/bash";
const hasBash = existsSync(bash);
const temporaryFolders = [];

afterEach(() => {
  // Only remove exact directories created by this test, never project data.
  for (const folder of temporaryFolders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

function fixture() {
  const folder = mkdtempSync(join(tmpdir(), "vundy-install-test-"));
  temporaryFolders.push(folder);
  return folder;
}

function prepare(folder, bind = "", port = "") {
  return spawnSync(bash, [
    "-c", 'source "$1"; prepare_config "$2" "$3" "$4"', "test", installer,
    folder.replaceAll("\\", "/"), bind, port
  ], { encoding: "utf8", timeout: 20000 });
}

function settings(folder) {
  return Object.fromEntries(readFileSync(join(folder, ".env.linux.local"), "utf8")
    .split("\n").filter(line => line && !line.startsWith("#"))
    .map(line => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]));
}

describe.skipIf(!hasBash)("local Linux installer configuration", () => {
  it("has valid Bash syntax and exposes help without installing", () => {
    for (const file of ["run.sh", "install-linux.sh"]) {
      const path = join(root, file).replaceAll("\\", "/");
      expect(readFileSync(path, "utf8")).not.toMatch(/\r|^\uFEFF/);
      expect(spawnSync(bash, ["-n", path]).status).toBe(0);
      const help = spawnSync(bash, [path, "--help"], { encoding: "utf8" });
      expect(help.status, help.stderr).toBe(0);
      expect(help.stdout).toContain("MongoDB replica set");
    }
  }, 30000);

  it("creates private local credentials without reading or modifying the existing env", () => {
    const folder = fixture();
    const atlas = 'DATABASE_URL="mongodb+srv://example.invalid/unchanged"\n';
    writeFileSync(join(folder, ".env"), atlas);
    const result = prepare(folder);
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(folder, ".env"), "utf8")).toBe(atlas);
    const config = settings(folder);
    expect(config.BIND_ADDRESS).toBe("127.0.0.1");
    expect(config.APP_PORT).toBe("3000");
    expect(config.R2_ACCESS_KEY_ID).toBe("");
    expect(config.MONGO_ROOT_PASSWORD).toMatch(/^[a-f0-9]{48}$/);
    expect(config.MONGO_APP_PASSWORD).toMatch(/^[a-f0-9]{48}$/);
    expect(config.MONGO_APP_PASSWORD).not.toBe(config.MONGO_ROOT_PASSWORD);
    expect(config.SESSION_SECRET).toHaveLength(64);
    for (const key of ["OWNER_PASSWORD", "STAFF_PASSWORD", "MONGO_ROOT_PASSWORD", "MONGO_APP_PASSWORD", "SESSION_SECRET"]) {
      expect(result.stdout + result.stderr).not.toContain(config[key]);
    }
    const keyfile = readFileSync(join(folder, ".local-data/linux/mongo-keyfile"), "utf8").replace(/\s/g, "");
    expect(keyfile).toMatch(/^[A-Za-z0-9+/=]{1008}$/);
    if (process.platform !== "win32") {
      expect(statSync(join(folder, ".env.linux.local")).mode & 0o777).toBe(0o600);
      expect(statSync(join(folder, ".local-data/linux/mongo-keyfile")).mode & 0o777).toBe(0o600);
    }
  }, 30000);

  it("keeps passwords, keyfile, and port on rerun and supports returning to localhost", () => {
    const folder = fixture();
    expect(prepare(folder, "0.0.0.0", "3001").status).toBe(0);
    const before = settings(folder);
    const keyfile = readFileSync(join(folder, ".local-data/linux/mongo-keyfile"), "utf8");
    expect(prepare(folder).status).toBe(0);
    expect(settings(folder)).toEqual(before);
    expect(readFileSync(join(folder, ".local-data/linux/mongo-keyfile"), "utf8")).toBe(keyfile);
    expect(prepare(folder, "127.0.0.1").status).toBe(0);
    expect(settings(folder)).toEqual({ ...before, BIND_ADDRESS: "127.0.0.1" });
  }, 30000);

  it("rejects invalid ports and missing database passwords without replacing the config", () => {
    const folder = fixture();
    expect(prepare(folder).status).toBe(0);
    const path = join(folder, ".env.linux.local");
    const original = readFileSync(path, "utf8");
    for (const port of ["80", "65536", "03000", "3000; exit 0"]) {
      expect(prepare(folder, "", port).status).not.toBe(0);
      expect(readFileSync(path, "utf8")).toBe(original);
    }
    const broken = original.replace(/^MONGO_APP_PASSWORD=.*$/m, "MONGO_APP_PASSWORD=");
    writeFileSync(path, broken);
    expect(prepare(folder).status).not.toBe(0);
    expect(readFileSync(path, "utf8")).toBe(broken);
  }, 30000);

  it("never executes shell commands contained in the config", () => {
    const folder = fixture();
    expect(prepare(folder).status).toBe(0);
    const path = join(folder, ".env.linux.local");
    // If sourced, this would terminate the shell with code 77.
    writeFileSync(path, readFileSync(path, "utf8") + '\nUNTRUSTED="$(exit 77)"\n');
    expect(prepare(folder).status).toBe(0);
    expect(settings(folder).UNTRUSTED).toBe('"$(exit 77)"');
  }, 30000);

  it("prints a usable localhost URL and only private LAN IPs, never a 0.0.0.0 browser URL", () => {
    const folder = fixture();
    expect(prepare(folder, "0.0.0.0", "3001").status).toBe(0);
    const config = join(folder, ".env.linux.local").replaceAll("\\", "/");
    const show = () => spawnSync(bash, ["-c",
      'source "$1"; hostname() { printf "%s\\n" "192.168.1.20 172.17.0.1 192.168.1.20 127.0.0.1 0.0.0.0 8.8.8.8 ::1"; }; print_access_urls "$2"',
      "test", installer, config
    ], { encoding: "utf8", timeout: 10000 });
    const lan = show();
    expect(lan.status, lan.stderr).toBe(0);
    expect(lan.stdout).toContain("http://localhost:3001");
    expect(lan.stdout).toContain("http://192.168.1.20:3001");
    expect(lan.stdout).not.toContain("http://0.0.0.0");
    expect(lan.stdout).not.toContain("http://8.8.8.8");
    expect(lan.stdout.match(/http:\/\/192\.168\.1\.20:3001/g)).toHaveLength(1);
    expect(prepare(folder, "127.0.0.1").status).toBe(0);
    expect(show().stdout).not.toContain("LAN address:");
  }, 30000);
});

const replicaSource = readFileSync(join(root, "scripts/linux/mongo-replica.js"), "utf8");

function replicaTest({ status = { ok: 1 }, hello = { setName: "rs0", isWritablePrimary: true }, authError = false } = {}) {
  const commands = [];
  const print = vi.fn();
  const sleep = vi.fn();
  const quit = vi.fn(code => { throw new Error(`exit ${code}`); });
  const auth = vi.fn(() => { if (authError) throw new Error("secret-do-not-log"); });
  function Mongo() {
    return { getDB: () => ({ auth, runCommand: command => {
      commands.push(command);
      if (command.replSetGetStatus) {
        if (status instanceof Error) throw status;
        return status;
      }
      if (command.hello) return hello;
      return { ok: 1 };
    } }) };
  }
  const run = () => runInNewContext(replicaSource, {
    Mongo, print, sleep, quit, process: { env: { MONGO_ROOT_PASSWORD: "fake-test-password" } }
  });
  return { run, commands, print, sleep, quit, auth };
}

describe("local MongoDB bootstrap", () => {
  it.each(["returned", "thrown"])("initializes a new replica set when code 94 is %s", mode => {
    const status = mode === "thrown" ? Object.assign(new Error("NotYetInitialized"), { code: 94 }) : { code: 94 };
    const test = replicaTest({ status });
    test.run();
    expect(test.commands.filter(command => command.replSetInitiate)).toEqual([
      { replSetInitiate: { _id: "rs0", members: [{ _id: 0, host: "mongo:27017" }] } }
    ]);
    expect(test.quit).not.toHaveBeenCalled();
  });

  it("never reinitializes an existing replica set", () => {
    const test = replicaTest();
    test.run();
    expect(test.commands.some(command => command.replSetInitiate)).toBe(false);
    expect(test.auth).toHaveBeenCalledWith("vundy_root", "fake-test-password");
  });

  it("does not mistake the temporary standalone init server for a ready replica", () => {
    const test = replicaTest({ status: { code: 76 }, hello: { isWritablePrimary: true } });
    expect(test.run).toThrow("exit 1");
    expect(test.sleep).toHaveBeenCalledTimes(90);
    expect(test.commands.some(command => command.replSetInitiate)).toBe(false);
  });

  it("fails safely without leaking credentials when authentication fails", () => {
    const test = replicaTest({ authError: true });
    expect(test.run).toThrow("exit 1");
    expect(test.commands).toEqual([]);
    expect(JSON.stringify(test.print.mock.calls)).not.toContain("secret-do-not-log");
    expect(JSON.stringify(test.print.mock.calls)).not.toContain("fake-test-password");
  });

  it("creates an app account scoped to its own database", () => {
    const createUser = vi.fn();
    const getSiblingDB = vi.fn(() => ({ createUser }));
    runInNewContext(readFileSync(join(root, "scripts/linux/mongo-user.js"), "utf8"), {
      db: { getSiblingDB }, process: { env: { MONGO_APP_PASSWORD: "test-password" } }
    });
    expect(getSiblingDB).toHaveBeenCalledWith("vundy_pos");
    expect(createUser).toHaveBeenCalledWith({
      user: "vundy_app", pwd: "test-password", roles: [{ role: "readWrite", db: "vundy_pos" }]
    });
  });
});
