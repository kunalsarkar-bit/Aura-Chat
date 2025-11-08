const express = require("express");
const router = express.Router();
const multer = require("multer");
const { imageupload } = require("../config/imageupload.js"); // Import the fixed upload utility

// 1. FIXED: Configure Multer properly for Cloudinary
const upload = multer({
  storage: multer.memoryStorage(), // Required for Cloudinary
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // 2. ADDED: File type validation
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only images and videos are allowed"), false);
    }
  },
});

const {
  sendMessage,
  allMessage,
  deletemesage,
  getPresignedUrl,
} = require("../Controllers/message_controller.js");
const fetchuser = require("../middleware/fetchUser.js");

// 3. IMPROVED: Better organized routes with error handling
router.get("/presigned-url", fetchuser, getPresignedUrl);
router.get("/:id/:userid", fetchuser, allMessage);

// 4. FIXED: Upload middleware properly applied
router.post(
  "/send",
  fetchuser,
  upload.single("file"), // Handles single file upload
  (err, req, res, next) => {
    // Error handling middleware
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(415).json({ error: err.message });
    }
    next();
  },
  sendMessage
);

router.post("/delete", fetchuser, deletemesage);

module.exports = router;
