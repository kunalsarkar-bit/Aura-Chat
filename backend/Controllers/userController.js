const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require("uuid");
const User = require("../Models/User.js");

// Configure Cloudinary (make sure to set these environment variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getPresignedUrl = async (req, res) => {
  const filename = req.query.filename;
  const filetype = req.query.filetype;

  if (!filename || !filetype) {
    return res
      .status(400)
      .json({ error: "Filename and filetype are required" });
  }

  if (!filetype.startsWith("image/")) {
    return res.status(400).json({ error: "Invalid file type" });
  }

  const userId = req.user.id;
  const publicId = `conversa/${userId}/${uuidv4()}/${filename.replace(
    /\.[^/.]+$/,
    ""
  )}`;

  try {
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: "conversa",
        public_id: publicId,
        allowed_formats: ["jpg", "png", "jpeg", "gif", "webp"],
      },
      process.env.CLOUDINARY_API_SECRET
    );

    return res.status(200).json({
      url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      fields: {
        api_key: process.env.CLOUDINARY_API_KEY,
        timestamp: timestamp,
        signature: signature,
        public_id: publicId,
        folder: "conversa",
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getOnlineStatus = async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ isOnline: user.isOnline });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = { getPresignedUrl, getOnlineStatus };
