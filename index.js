import Debug from "debug";
const debug = Debug.debug("elpa");
import { promisify } from "util";
import { execFile as _execFile } from "child_process";
const execFile = promisify(_execFile);
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { mkdir } from "fs/promises";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EL = join(__dirname, "archive-contents-to-json.el");

// https://dev.to/cdanielsen/wrap-your-streams-with-promises-for-fun-and-profit-51ka
const streamToFile = (inputStream, filePath) => {
  return new Promise((resolve, reject) => {
    const fileWriteStream = fs.createWriteStream(filePath, {
      flags: "w",
      encoding: "binary",
    });
    inputStream.pipe(fileWriteStream).on("finish", resolve).on("error", reject);
  });
};

const isFileTooNew = (path, age = 15 * 60 * 1000) => {
  const fileAge = new Date() - fs.statSync(path).mtime;
  return fileAge < age;
};

class Elpa {
  constructor(id, location) {
    this.id = id;
    this.location = location;
  }

  async wget(filename) {
    const url = this.location + filename;
    const path = join(this.id, filename);
    debug(`Downloading ${url} into ${path}...`);
    const response = await axios.get(url, {
      responseType: "stream",
    });
    try {
      await streamToFile(response.data, path);
    } catch (error) {
      if (error) {
        fs.rmSync(path);
        throw error;
      }
    }
    debug(`Downloading ${url} into ${path}...Done`);
  }

  async getPkgs() {
    const archiveFile = join(this.id, "archive-contents");
    const jsonFile = join(this.id, "archive-contents.json");
    debug(`Parsing ${archiveFile} into ${jsonFile}...`);
    const { error, stdout, stderr } = await execFile("emacs", [
      "-Q",
      "--batch",
      "-l",
      EL,
      archiveFile,
      jsonFile,
    ]);
    if (error || stdout || stderr) {
      if (error) throw error;
      if (stdout || stderr) throw new Error(stdout || stderr);
    }
    this.pkgs = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));
    debug("Found %d packages", this.pkgs.length);
    debug(`Parsing ${archiveFile} into ${jsonFile}...Done`);
  }

  async sync() {
    await mkdir(this.id, {
      recursive: true,
    });

    if (!isFileTooNew("archive-contents")) {
      await this.wget("archive-contents");
    }

    await this.getPkgs();
    for (let index = 0; index < this.pkgs.length; index++) {
      const fn = this.pkgs[index];
      debug("%d/%d %s", index + 1, this.pkgs.length, fn);
      const path = join(this.id, fn);
      if (!fs.existsSync(path)) {
        await this.wget(fn);
      }
    }
  }
}

// const gelpa = new Elpa("gnu","https://mirrors.sjtug.sjtu.edu.cn/emacs-elpa/gnu/");
// const gelpa = new Elpa("gnu", "https://elpa.gnu.org/packages/");
const gelpa = new Elpa("gnu", "https://mirrors.tuna.tsinghua.edu.cn/elpa/gnu/");
(async () => {
  await gelpa.sync();
})();

// const melpa = new Elpa("melpa", "https://melpa.org/packages/");
// (async () => await melpa.sync())();

// const melpaStable = new Elpa(
//   "melpa-stable",
//   "https://stable.melpa.org/packages/"
// );
// (async () => await melpaStable.sync())();

// (async () => new Elpa("org", "https://orgmode.org/elpa/").sync())();
