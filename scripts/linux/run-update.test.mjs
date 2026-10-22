import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const source = readFileSync(join(root, "run.sh"), "utf8");
const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "/bin/bash";
const available = existsSync(bash) && spawnSync("git", ["--version"]).status === 0;
const temporaryFolders = [];
const shellPath = path => path.replaceAll("\\", "/");

afterEach(() => {
  // Exact private fixture directories created by mkdtemp, never shop/repo data.
  for (const folder of temporaryFolders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

function git(folder, ...args) {
  const result = spawnSync("git", ["-c", "core.autocrlf=false", "-c", "commit.gpgsign=false", ...args], {
    cwd: folder, encoding: "utf8", timeout: 20000
  });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message);
  return result.stdout.trim();
}

function folder() {
  const path = mkdtempSync(join(tmpdir(), "vundy-update test-"));
  temporaryFolders.push(path);
  return path;
}

function installer(version) {
  return `#!/usr/bin/env bash
set -Eeuo pipefail
cd -- "$(dirname -- "$0")"
mkdir -p .local-data
printf '%s\\n' '${version}' > .local-data/installed
printf '%s\\n' "$@" > .local-data/args
`;
}

function fixture() {
  const base = folder();
  const remote = join(base, "remote.git"), publisher = join(base, "publisher"), checkout = join(base, "shop");
  git(base, "init", "--bare", "--initial-branch=main", remote);
  git(base, "init", "--initial-branch=main", publisher);
  git(publisher, "config", "user.name", "Vundy test");
  git(publisher, "config", "user.email", "test@example.invalid");
  writeFileSync(join(publisher, ".gitignore"), ".env\n.env*.local\n.local-data\n");
  writeFileSync(join(publisher, "run.sh"), source);
  writeFileSync(join(publisher, "install-linux.sh"), installer("old"));
  writeFileSync(join(publisher, "product.txt"), "old product\n");
  git(publisher, "add", ".");
  git(publisher, "commit", "-m", "initial");
  git(publisher, "remote", "add", "origin", remote);
  git(publisher, "push", "origin", "main");
  git(base, "clone", remote, checkout);
  git(checkout, "config", "user.name", "Vundy test");
  git(checkout, "config", "user.email", "test@example.invalid");
  git(checkout, "config", "core.autocrlf", "false");
  mkdirSync(join(checkout, ".local-data", "linux"), { recursive: true });
  writeFileSync(join(checkout, ".env"), "PRIVATE_ENV=do-not-change\n");
  writeFileSync(join(checkout, ".env.linux.local"), "PRIVATE_CONFIG=do-not-change\n");
  writeFileSync(join(checkout, ".local-data", "linux", "mongo-keyfile"), "private-fixture-key\n");
  return { base, remote, publisher, checkout };
}

function publish(f, change = () => {}) {
  writeFileSync(join(f.publisher, "product.txt"), "new product\n");
  writeFileSync(join(f.publisher, "install-linux.sh"), installer("new"));
  change(f.publisher);
  git(f.publisher, "add", ".");
  git(f.publisher, "commit", "-m", "update");
  git(f.publisher, "push", "origin", "main");
  return git(f.publisher, "rev-parse", "HEAD");
}

function update(f) {
  return spawnSync(bash, ["-c", 'source "$1"; update_source "$2"', "test",
    shellPath(join(f.checkout, "run.sh")), shellPath(f.checkout)
  ], { cwd: f.checkout, encoding: "utf8", timeout: 20000 });
}

function assertPrivateFiles(f) {
  expect(readFileSync(join(f.checkout, ".env"), "utf8")).toBe("PRIVATE_ENV=do-not-change\n");
  expect(readFileSync(join(f.checkout, ".env.linux.local"), "utf8")).toBe("PRIVATE_CONFIG=do-not-change\n");
  expect(readFileSync(join(f.checkout, ".local-data/linux/mongo-keyfile"), "utf8")).toBe("private-fixture-key\n");
}

// Real Git processes are slower than unit tests, especially in a parallel run.
describe.skipIf(!available)("safe source update using real temporary Git repositories", { timeout: 30000 }, () => {
  it("fast-forwards origin/main, keeps ignored credentials/data and supports an up-to-date rerun", () => {
    const f = fixture(), head = publish(f);
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = update(f);
      expect(result.status, result.stderr).toBe(0);
      expect(git(f.checkout, "rev-parse", "HEAD")).toBe(head);
      expect(readFileSync(join(f.checkout, "product.txt"), "utf8")).toBe("new product\n");
      expect(result.stdout).toContain(head.slice(0, 7));
      assertPrivateFiles(f);
    }
  });

  it("calls git pull explicitly while overriding rebase/autostash only for this command", () => {
    const f = fixture(), head = publish(f);
    git(f.checkout, "config", "pull.rebase", "true");
    git(f.checkout, "config", "merge.autostash", "true");
    git(f.checkout, "config", "branch.main.mergeOptions", "--overwrite-ignore");
    const configBefore = readFileSync(join(f.checkout, ".git/config"), "utf8");
    const result = spawnSync(bash, ["-c",
      'source "$1"; git() { if [[ "$1" == pull ]]; then printf "%s\\n" "$*" >> .local-data/git-calls; fi; command git "$@"; }; update_source "$2"',
      "test", shellPath(join(f.checkout, "run.sh")), shellPath(f.checkout)
    ], { cwd: f.checkout, encoding: "utf8", timeout: 20000 });
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(f.checkout, ".local-data/git-calls"), "utf8")).toBe("pull --ff-only origin main --no-rebase --no-autostash\n");
    expect(git(f.checkout, "rev-parse", "HEAD")).toBe(head);
    expect(readFileSync(join(f.checkout, ".git/config"), "utf8")).toBe(configBefore);
    assertPrivateFiles(f);
  });

  it("stops when pull fails even after a successful preflight fetch", () => {
    const f = fixture(), before = git(f.checkout, "rev-parse", "HEAD");
    publish(f);
    const result = spawnSync(bash, ["-c",
      'source "$1"; git() { if [[ "$1" == pull ]]; then return 1; fi; command git "$@"; }; update_source "$2"',
      "test", shellPath(join(f.checkout, "run.sh")), shellPath(f.checkout)
    ], { cwd: f.checkout, encoding: "utf8", timeout: 20000 });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Git pull failed");
    expect(git(f.checkout, "rev-parse", "HEAD")).toBe(before);
    assertPrivateFiles(f);
  });

  it.each(["private file", "normal commit"])("handles a remote %s arriving between preflight and pull without unsafe deployment", kind => {
    const f = fixture(), before = git(f.checkout, "rev-parse", "HEAD");
    publish(f);
    if (kind === "private file") {
      writeFileSync(join(f.publisher, ".env.linux.local"), "unsafe upstream content\n");
      git(f.publisher, "add", "--force", ".env.linux.local");
    } else {
      writeFileSync(join(f.publisher, "product.txt"), "newer product\n");
      git(f.publisher, "add", "product.txt");
    }
    git(f.publisher, "commit", "-m", "arrives during pull");
    const newer = git(f.publisher, "rev-parse", "HEAD");
    const result = spawnSync(bash, ["-c",
      'source "$1"; test_publisher="$3"; git() { if [[ "$1" == pull ]]; then command git -C "$test_publisher" push origin main || return; fi; command git "$@"; }; update_source "$2"',
      "test", shellPath(join(f.checkout, "run.sh")), shellPath(f.checkout), shellPath(f.publisher)
    ], { cwd: f.checkout, encoding: "utf8", timeout: 20000 });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(kind === "private file" ? "Git pull failed" : "changed during the update");
    expect(git(f.checkout, "rev-parse", "HEAD")).toBe(kind === "private file" ? before : newer);
    assertPrivateFiles(f);
  });

  it.each(["unstaged", "staged", "untracked"])("stops before fetch with %s work and never stashes or resets it", kind => {
    const f = fixture(), before = git(f.checkout, "rev-parse", "HEAD");
    publish(f);
    const path = join(f.checkout, kind === "untracked" ? "notes.txt" : "product.txt");
    writeFileSync(path, "shop edits\n");
    if (kind === "staged") git(f.checkout, "add", "product.txt");
    const result = update(f);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Local edits or untracked files");
    expect(existsSync(join(f.checkout, ".git/FETCH_HEAD"))).toBe(false);
    expect(git(f.checkout, "rev-parse", "HEAD")).toBe(before);
    expect(readFileSync(path, "utf8")).toBe("shop edits\n");
    assertPrivateFiles(f);
  });

  it.each(["ahead", "diverged"])("refuses %s local commits without rewriting history", mode => {
    const f = fixture();
    if (mode === "diverged") publish(f);
    writeFileSync(join(f.checkout, "local.txt"), "local commit\n");
    git(f.checkout, "add", "local.txt");
    git(f.checkout, "commit", "-m", "local change");
    const before = git(f.checkout, "rev-parse", "HEAD"), result = update(f);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("commits not present");
    expect(git(f.checkout, "rev-parse", "HEAD")).toBe(before);
    assertPrivateFiles(f);
  });

  it.each(["branch", "detached", "merge"])("rejects an unsafe %s state", state => {
    const f = fixture();
    if (state === "branch") git(f.checkout, "switch", "-c", "work");
    if (state === "detached") git(f.checkout, "switch", "--detach");
    if (state === "merge") writeFileSync(join(f.checkout, ".git/MERGE_HEAD"), git(f.checkout, "rev-parse", "HEAD") + "\n");
    expect(update(f).status).not.toBe(0);
    expect(existsSync(join(f.checkout, ".git/FETCH_HEAD"))).toBe(false);
  });

  it("stops on fetch failure and does not fall back to silently deploying stale code", () => {
    const f = fixture(), before = git(f.checkout, "rev-parse", "HEAD");
    git(f.checkout, "remote", "set-url", "origin", join(f.base, "unreachable.git"));
    const result = update(f);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Could not fetch origin/main");
    expect(git(f.checkout, "rev-parse", "HEAD")).toBe(before);
    expect(existsSync(join(f.checkout, ".local-data/installed"))).toBe(false);
    assertPrivateFiles(f);
  });

  it.each([".env", ".env.linux.local", ".local-data/linux/mongo-keyfile"])("rejects an incoming tracked %s before it can overwrite ignored data", path => {
    const f = fixture(), before = git(f.checkout, "rev-parse", "HEAD");
    publish(f, publisher => {
      mkdirSync(join(publisher, ".local-data/linux"), { recursive: true });
      writeFileSync(join(publisher, path), "unsafe upstream content\n");
      git(publisher, "add", "--force", path);
    });
    const result = update(f);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("private configuration/data paths");
    expect(git(f.checkout, "rev-parse", "HEAD")).toBe(before);
    assertPrivateFiles(f);
  });

  it("explains ZIP folders without creating Git metadata or replacing files", () => {
    const checkout = folder();
    writeFileSync(join(checkout, "run.sh"), source);
    const result = update({ checkout });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("possibly downloaded as ZIP");
    expect(existsSync(join(checkout, ".git"))).toBe(false);
  });

  it("help and invalid arguments never fetch, install or require Linux", () => {
    const f = fixture();
    for (const args of [["--help"], ["--port", "80"], ["--port"], ["--typo"]]) {
      const result = spawnSync(bash, [shellPath(join(f.checkout, "run.sh")), ...args], { encoding: "utf8" });
      expect(result.status).toBe(args[0] === "--help" ? 0 : 1);
      expect(existsSync(join(f.checkout, ".git/FETCH_HEAD"))).toBe(false);
      expect(existsSync(join(f.checkout, ".local-data/installed"))).toBe(false);
    }
  });
});

// Dispatch tests mock only Linux/locking preflight. Git really fetches/merges;
// the installer is a harmless marker, not Docker/apt or a real shop database.
describe.skipIf(!available || process.getuid?.() === 0)("run.sh installer dispatch", { timeout: 30000 }, () => {
  function run(f, ...args) {
    return spawnSync(bash, ["-c", 'source "$1"; shift; uname() { printf "Linux\\n"; }; flock() { return 0; }; run_main "$@"',
      "test", shellPath(join(f.checkout, "run.sh")), ...args
    ], { cwd: f.checkout, encoding: "utf8", timeout: 20000 });
  }

  it("executes the newly fetched installer once and forwards LAN/port options even when run.sh itself changes", () => {
    const f = fixture();
    const head = publish(f, publisher => writeFileSync(join(publisher, "run.sh"), source + "\n# Upstream revision changed the running file.\n"));
    const result = run(f, "--lan", "--port", "3001");
    expect(result.status, result.stderr).toBe(0);
    expect(git(f.checkout, "rev-parse", "HEAD")).toBe(head);
    expect(readFileSync(join(f.checkout, ".local-data/installed"), "utf8")).toBe("new\n");
    expect(readFileSync(join(f.checkout, ".local-data/args"), "utf8")).toBe("--lan\n--port\n3001\n");
    assertPrivateFiles(f);
  });

  it("never starts the installer when an update fails", () => {
    const f = fixture();
    writeFileSync(join(f.checkout, "product.txt"), "local edits\n");
    expect(run(f).status).not.toBe(0);
    expect(existsSync(join(f.checkout, ".local-data/installed"))).toBe(false);
  });

  it("stops before fetching when another update holds the lock", () => {
    const f = fixture();
    const result = spawnSync(bash, ["-c",
      'source "$1"; uname() { printf "Linux\\n"; }; flock() { return 1; }; run_main',
      "test", shellPath(join(f.checkout, "run.sh"))
    ], { encoding: "utf8", timeout: 10000 });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Another update or installation is running");
    expect(existsSync(join(f.checkout, ".git/FETCH_HEAD"))).toBe(false);
    expect(existsSync(join(f.checkout, ".local-data/installed"))).toBe(false);
  });

  it("propagates an installer/build failure after updating source without resetting Git or data", () => {
    const f = fixture();
    const head = publish(f, publisher => writeFileSync(join(publisher, "install-linux.sh"), "#!/usr/bin/env bash\nexit 17\n"));
    const result = run(f);
    expect(result.status).toBe(17);
    expect(git(f.checkout, "rev-parse", "HEAD")).toBe(head);
    assertPrivateFiles(f);
  });

  it("supports explicitly building an existing ZIP folder without a Git update", () => {
    const checkout = folder();
    writeFileSync(join(checkout, "run.sh"), source);
    writeFileSync(join(checkout, "install-linux.sh"), installer("zip"));
    const result = run({ checkout }, "--no-update", "--localhost");
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(checkout, ".local-data/installed"), "utf8")).toBe("zip\n");
    expect(readFileSync(join(checkout, ".local-data/args"), "utf8")).toBe("--localhost\n");
    expect(existsSync(join(checkout, ".git"))).toBe(false);
  });
});
