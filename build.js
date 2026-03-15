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
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "build.js") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await findHtmlFiles(full));
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

const ASSET_EXTS = new Set([
  ".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
  ".css", ".js", ".woff", ".woff2", ".ttf", ".eot", ".webmanifest", ".json",
]);

function copyAssets(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "build.js" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += copyAssets(full);
    } else if (ASSET_EXTS.has(path.extname(entry.name).toLowerCase()) && !entry.name.startsWith("package")) {
      const rel = path.relative(SRC, full);
      const dest = path.join(DIST, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(full, dest);
      console.log(`${rel} → dist/${rel}  (copied)`);
      count++;
    }
  }
  return count;
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

  const assetCount = copyAssets(SRC);
  console.log(`\nDone. ${files.length} HTML file(s) + ${assetCount} asset(s) written to dist/`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
