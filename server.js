const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, process.env.UPLOAD_DIR || "uploads");

// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path
      .basename(file.originalname || "image", ext)
      .replace(/\s+/g, "-");
    const unique = `${base}-${Date.now()}${ext || ".png"}`;
    cb(null, unique);
  },
});

// Only images
const fileFilter = (req, file, cb) => {
  if (/^image\//.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Serve images
app.use("/images", express.static(UPLOAD_DIR));

// Health check
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Image upload API running" });
});

// Upload
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });

  const fileUrl = `${req.protocol}://${req.get("host")}/images/${
    req.file.filename
  }`;
  res.status(201).json({
    message: "Image uploaded successfully",
    filename: req.file.filename,
    url: fileUrl,
  });
});

// List images
app.get("/images-list", (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: "Failed to read uploads" });

    const list = files.map((f) => ({
      filename: f,
      url: `${req.protocol}://${req.get("host")}/images/${encodeURIComponent(
        f
      )}`,
    }));

    res.json(list);
  });
});

// Single image metadata
app.get("/image/:filename", (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  fs.stat(filePath, (err, stats) => {
    if (err) return res.status(404).json({ error: "File not found" });

    res.json({
      filename: req.params.filename,
      size: stats.size,
      modifiedAt: stats.mtime,
      url: `${req.protocol}://${req.get("host")}/images/${encodeURIComponent(
        req.params.filename
      )}`,
    });
  });
});

// Error handler
app.use((err, req, res, next) => {
  return res.status(400).json({ error: err.message || "Bad request" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server..yeooo running at http://localhost:${PORT}`);
});
