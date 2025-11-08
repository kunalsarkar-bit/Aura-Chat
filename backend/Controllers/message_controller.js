const Message = require("../Models/Message.js");
const Conversation = require("../Models/Conversation.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
// const OpenAI = require("openai");

const imageupload = require("../config/imageupload.js");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });
const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Initialize OpenAI
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

const configuration = new GoogleGenerativeAI(process.env.GENERATIVE_API_KEY);
const modelId = "gemini-2.5-flash";
const model = configuration.getGenerativeModel({ model: modelId });

const sendMessage = async (req, res) => {
  try {
    console.log("Incoming request:", {
      body: req.body,
      file: req.file
        ? {
            name: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype,
          }
        : null,
    });

    const { conversationId, sender, text } = req.body;
    let imageUrl = null;

    if (req.file) {
      try {
        imageUrl = await imageupload({
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
        });
      } catch (uploadError) {
        console.error("File upload error:", uploadError);
        return res.status(400).json({
          error: "File upload failed",
          details: uploadError.message,
          file: req.file.originalname,
        });
      }
    }

    const newMessage = new Message({
      conversationId,
      senderId: new mongoose.Types.ObjectId(sender), // ✅ FIXED
      text: text || "",
      imageUrl,
      seenBy: [
        {
          user: new mongoose.Types.ObjectId(sender), // ✅ FIXED
        },
      ],
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Controller error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

const allMessage = async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.id,
      deletedFrom: { $ne: req.user.id },
    });

    messages.forEach(async (message) => {
      let isUserAddedToSeenBy = false;
      message.seenBy.forEach((element) => {
        if (element.user == req.user.id) {
          isUserAddedToSeenBy = true;
        }
      });
      if (!isUserAddedToSeenBy) {
        message.seenBy.push({ user: req.user.id });
      }
      await message.save();
    });

    res.json(messages);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const deletemesage = async (req, res) => {
  const msgid = req.body.messageid;
  const userids = req.body.userids;
  try {
    const message = await Message.findById(msgid);

    userids.forEach(async (userid) => {
      if (!message.deletedby.includes(userid)) {
        message.deletedby.push(userid);
      }
    });
    await message.save();
    res.status(200).send("Message deleted successfully");
  } catch (error) {
    console.log(error.message);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

const getPresignedUrl = async (req, res) => {
  const filename = req.query.filename;
  const filetype = req.query.filetype;

  if (!filename || !filetype) {
    return res
      .status(400)
      .json({ error: "Filename and filetype are required" });
  }

  const userId = req.user.id;
  // Remove special characters from filename
  const cleanFilename = filename.replace(/[^\w.-]/g, "_");
  const publicId = `conversa/${userId}/${uuidv4()}/${cleanFilename.replace(
    /\.[^/.]+$/,
    ""
  )}`;

  try {
    const timestamp = Math.round(Date.now() / 1000);

    // Parameters MUST be in alphabetical order
    const paramsToSign = {
      folder: "conversa",
      public_id: publicId,
      timestamp: timestamp,
    };

    // Convert to query string format (alphabetical order)
    const stringToSign = Object.keys(paramsToSign)
      .sort()
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join("&");

    console.log("String being signed:", stringToSign);

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    console.log("Generated signature:", signature);

    return res.status(200).json({
      url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      fields: {
        ...paramsToSign, // Include all signed parameters
        api_key: process.env.CLOUDINARY_API_KEY,
        signature: signature,
      },
    });
  } catch (error) {
    console.error("Signature generation error:", error);
    return res.status(500).json({
      error: "Failed to generate upload URL",
      details: error.message,
    });
  }
};

const getAiResponse = async (prompt, senderId, conversationId) => {
  var currentMessages = [];
  const conv = await Conversation.findById(conversationId);
  const botId = conv.members.find((member) => member != senderId);

  const messagelist = await Message.find({
    conversationId: conversationId,
  })
    .sort({ createdAt: -1 })
    .limit(20);

  messagelist.forEach((message) => {
    if (message.senderId == senderId) {
      currentMessages.push({
        role: "user",
        parts: message.text,
      });
    } else {
      currentMessages.push({
        role: "model",
        parts: message.text,
      });
    }
  });

  currentMessages = currentMessages.reverse();

  try {
    const chat = model.startChat({
      history: currentMessages,
      generationConfig: {
        maxOutputTokens: 2000,
      },
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response;
    var responseText = response.text();

    if (responseText.length < 1) {
      responseText = "Woops!! thats soo long ask me something in short.";
      return -1;
    }

    await Message.create({
      conversationId: conversationId,
      senderId: senderId,
      text: prompt,
      seenBy: [{ user: botId, seenAt: new Date() }],
    });

    const botMessage = await Message.create({
      conversationId: conversationId,
      senderId: botId,
      text: responseText,
    });

    conv.latestmessage = responseText;
    await conv.save();

    return botMessage;
  } catch (error) {
    console.log(error.message);
    return "some error occured while generating response";
  }
};

// const getAiResponse = async (prompt, senderId, conversationId) => {
//   const conv = await Conversation.findById(conversationId);
//   const botId = conv.members.find((member) => member != senderId);

//   // Get the conversation history
//   const messagelist = await Message.find({
//     conversationId: conversationId,
//   })
//     .sort({ createdAt: -1 })
//     .limit(20);

//   // Format messages for OpenAI
//   const messages = messagelist.reverse().map((message) => ({
//     role: message.senderId == senderId ? "user" : "assistant",
//     content: message.text,
//   }));

//   // Add the new prompt
//   messages.push({
//     role: "user",
//     content: prompt,
//   });

//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo", // or "gpt-4" if you have access
//       messages: messages,
//       max_tokens: 2000,
//     });

//     const responseText = completion.choices[0].message.content;

//     if (responseText.length < 1) {
//       responseText = "Woops!! that's too long, ask me something shorter.";
//       return -1;
//     }

//     // Save user message
//     await Message.create({
//       conversationId: conversationId,
//       senderId: senderId,
//       text: prompt,
//       seenBy: [{ user: botId, seenAt: new Date() }],
//     });

//     // Save bot response
//     const botMessage = await Message.create({
//       conversationId: conversationId,
//       senderId: botId,
//       text: responseText,
//     });

//     // Update conversation
//     conv.latestmessage = responseText;
//     await conv.save();

//     return botMessage;
//   } catch (error) {
//     console.error("OpenAI error:", error.message);
//     return "Some error occurred while generating response";
//   }
// };

const sendMessageHandler = async (data) => {
  const {
    text,
    imageUrl,
    senderId,
    conversationId,
    receiverId,
    isReceiverInsideChatRoom,
  } = data;
  const conversation = await Conversation.findById(conversationId);
  if (!isReceiverInsideChatRoom) {
    const message = await Message.create({
      conversationId,
      senderId,
      text,
      imageUrl,
      seenBy: [],
    });

    conversation.latestmessage = text;
    conversation.unreadCounts.map((unread) => {
      if (unread.userId.toString() == receiverId.toString()) {
        unread.count += 1;
      }
    });
    await conversation.save();
    return message;
  } else {
    const message = await Message.create({
      conversationId,
      senderId,
      text,
      seenBy: [
        {
          user: receiverId,
          seenAt: new Date(),
        },
      ],
    });
    conversation.latestmessage = text;
    await conversation.save();
    return message;
  }
};

const deleteMessageHandler = async (data) => {
  const { messageId, deleteFrom } = data;
  const message = await Message.findById(messageId);

  if (!message) {
    return false;
  }

  try {
    deleteFrom.forEach(async (userId) => {
      if (!message.deletedFrom.includes(userId)) {
        message.deletedFrom.push(userId);
      }
    });
    await message.save();

    return true;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

module.exports = {
  sendMessage,
  allMessage,
  getPresignedUrl,
  getAiResponse,
  deletemesage,
  sendMessageHandler,
  deleteMessageHandler,
};
