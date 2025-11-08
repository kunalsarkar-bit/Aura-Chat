const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
dotenv.config({ path: "../../.env" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_ClOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const imageupload = async (file) => {
  try {
    console.log("Starting Cloudinary upload for:", file.originalname);

    if (!file.buffer) {
      throw new Error("File buffer is empty");
    }

    const result = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
      {
        folder: "Uploads/ChatUploads",
        resource_type: "auto",
        upload_preset: "chat_upload", // Add this if using unsigned uploads
      }
    );

    console.log("Cloudinary upload success:", {
      url: result.secure_url,
      file: file.originalname,
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed:", {
      error: error.message,
      stack: error.stack,
      file: {
        name: file?.originalname,
        size: file?.size,
        type: file?.mimetype,
      },
      cloudinaryError: error.response?.body,
    });
    throw error; // Re-throw to be caught by controller
  }
};

module.exports = imageupload;
