const { minify } = require("html-minifier-terser");
const fs = require("fs");
const path = require("path");
const { glob } = require("fs").promises;

const DIST = path.join(__dirname, "dist");
const SRC = __dirname;

const OPTIONS = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeEmptyAttributes: true,
  minifyCSS: true,
  minifyJS: true,
  collapseBooleanAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
};

async function findHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await findHtmlFiles(full));
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

async function build() {
  const files = await findHtmlFiles(SRC);
  if (files.length === 0) {
    console.log("No HTML files found.");
    return;
  }

  fs.mkdirSync(DIST, { recursive: true });

  for (const file of files) {
    const rel = path.relative(SRC, file);
    const dest = path.join(DIST, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    const src = fs.readFileSync(file, "utf-8");
    const result = await minify(src, OPTIONS);

    const saved = ((1 - result.length / src.length) * 100).toFixed(1);
    fs.writeFileSync(dest, result);
    console.log(`${rel} → dist/${rel}  (${saved}% smaller)`);
  }

  console.log(`\nDone. ${files.length} file(s) written to dist/`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
