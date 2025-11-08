import React, { useState, useEffect, useContext } from "react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import Lottie from "react-lottie";
import animationdata from "../../typingAnimation.json";
import {
  Box,
  InputGroup,
  Input,
  Text,
  InputRightElement,
  Button,
  FormControl,
  InputLeftElement,
  useToast,
  useDisclosure,
   Flex,
} from "@chakra-ui/react";
import { FaFileUpload } from "react-icons/fa";
import { marked } from "marked";
import chatContext from "../../context/chatContext";
import ChatAreaTop from "./ChatAreaTop";
import FileUploadModal from "../miscellaneous/FileUploadModal";
import ChatLoadingSpinner from "../miscellaneous/ChatLoadingSpinner";
import axios from "axios";
import SingleMessage from "./SingleMessage";

const scrollbarconfig = {
  "&::-webkit-scrollbar": {
    width: "5px",
    height: "5px",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "gray.300",
    borderRadius: "5px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "gray.400",
  },
  "&::-webkit-scrollbar-track": {
    display: "none",
  },
};

// const markdownToHtml = (markdownText) => {
//   const html = marked(markdownText);
//   return { __html: html };
// };

const markdownToHtml = (markdownText) => {
  // Add null/undefined check
  if (!markdownText) return { __html: "" };

  try {
    const html = marked(markdownText);
    return { __html: html };
  } catch (error) {
    console.error("Markdown processing error:", error);
    return { __html: markdownText }; // Fallback to raw text
  }
};

export const ChatArea = () => {
  const context = useContext(chatContext);
  const {
    hostName,
    user,
    receiver,
    socket,
    activeChatId,
    messageList,
    setMessageList,
    isOtherUserTyping,
    setIsOtherUserTyping,
    setActiveChatId,
    setReceiver,
    setMyChatList,
    myChatList,
    isChatLoading,
  } = context;
  const [typing, settyping] = useState(false);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Lottie Options for typing
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationdata,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  useEffect(() => {
    return () => {
      window.addEventListener("popstate", () => {
        socket.emit("leave-chat", activeChatId);
        setActiveChatId("");
        setMessageList([]);
        setReceiver({});
      });
    };
  }, [socket, activeChatId, setActiveChatId, setMessageList, setReceiver]);

  useEffect(() => {
    socket.on("user-joined-room", (userId) => {
      const updatedList = messageList.map((message) => {
        if (message.senderId === user._id && userId !== user._id) {
          const index = message.seenBy.findIndex(
            (seen) => seen.user === userId
          );
          if (index === -1) {
            message.seenBy.push({ user: userId, seenAt: new Date() });
          }
        }
        return message;
      });
      setMessageList(updatedList);
    });

    socket.on("typing", (data) => {
      if (data.typer !== user._id) {
        setIsOtherUserTyping(true);
      }
    });

    socket.on("stop-typing", (data) => {
      if (data.typer !== user._id) {
        setIsOtherUserTyping(false);
      }
    });

    socket.on("receive-message", (data) => {
      setMessageList((prev) => [...prev, data]);
      setTimeout(() => {
        document.getElementById("chat-box")?.scrollTo({
          top: document.getElementById("chat-box").scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    });

    socket.on("message-deleted", (data) => {
      const { messageId } = data;
      setMessageList((prev) => prev.filter((msg) => msg._id !== messageId));
    });

    return () => {
      socket.off("typing");
      socket.off("stop-typing");
      socket.off("receive-message");
      socket.off("message-deleted");
    };
  }, [socket, messageList, setMessageList, user._id, setIsOtherUserTyping]);

  const handleTyping = () => {
    const messageInput = document.getElementById("new-message");
    if (!messageInput) return;

    if (messageInput.value === "" && typing) {
      settyping(false);
      socket.emit("stop-typing", {
        typer: user._id,
        conversationId: activeChatId,
      });
    } else if (messageInput.value !== "" && !typing) {
      settyping(true);
      socket.emit("typing", {
        typer: user._id,
        conversationId: activeChatId,
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage(e);
    }
  };

  const handleSendMessage = async (e, messageText, file) => {
    e.preventDefault();

    const finalMessageText =
      messageText || document.getElementById("new-message")?.value || "";

    socket.emit("stop-typing", {
      typer: user._id,
      conversationId: activeChatId,
    });

    if (finalMessageText === "" && !file) {
      toast({
        title: "Message cannot be empty",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      let imageUrl = null;

      if (file) {
        console.log("Preparing to upload file:", file.name, file.type); // Debug

        const formData = new FormData();
        formData.append("conversationId", activeChatId);
        formData.append("sender", user._id);
        formData.append("text", finalMessageText);
        formData.append("file", file);

        for (let [key, value] of formData.entries()) {
          console.log(key, value);
        }

        const endpoint = `${hostName}/message/send`;

        const response = await axios.post(endpoint, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            "auth-token": localStorage.getItem("token"),
          },
        });

        if (!response.data.imageUrl) {
          throw new Error("Backend didn't return imageUrl");
        }
        imageUrl = response.data.imageUrl;
      }

      const socketData = {
        text: finalMessageText,
        conversationId: activeChatId,
        senderId: user._id,
        imageUrl: imageUrl,
      };

      socket.emit("send-message", socketData);

      const inputElem = document.getElementById("new-message");
      if (inputElem) inputElem.value = "";

      setMyChatList((prevChats) =>
        prevChats
          .map((chat) =>
            chat._id === activeChatId
              ? {
                  ...chat,
                  latestmessage: finalMessageText,
                  updatedAt: new Date().toISOString(),
                }
              : chat
          )
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );

      setTimeout(() => {
        document.getElementById("chat-box")?.scrollTo({
          top: document.getElementById("chat-box").scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    } catch (error) {
      console.error("Full error details:", {
        message: error.message,
        response: error.response?.data,
        config: error.config,
      });
      toast({
        title: "Failed to send message",
        description: error.response?.data?.error || error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const removeMessageFromList = (messageId) => {
    setMessageList((prev) => prev.filter((msg) => msg._id !== messageId));
  };

  return (
    <>
      {activeChatId !== "" ? (
        <>
          <Box
            justifyContent="space-between"
            h="100%"
            w={{
              base: "100vw",
              md: "100%",
            }}
          >
            <ChatAreaTop />

            {isChatLoading && <ChatLoadingSpinner />}

            <Box
              id="chat-box"
              h="85%"
              overflowY="auto"
              sx={scrollbarconfig}
              mt={1}
              mx={1}
            >
              {messageList?.map((message) => {
                // Skip if message is invalid
                if (!message || message.deletedby?.includes(user._id))
                  return null;

                return (
                  <SingleMessage
                    key={message._id}
                    message={message}
                    user={user}
                    receiver={receiver}
                    markdownToHtml={markdownToHtml}
                    scrollbarconfig={scrollbarconfig}
                    socket={socket}
                    activeChatId={activeChatId}
                    removeMessageFromList={removeMessageFromList}
                    toast={toast}
                  />
                );
              })}
            </Box>

            <Box
              py={2}
              position="fixed"
              w={{
                base: "100%",
                md: "70%",
              }}
              bottom={{
                base: 1,
                md: 3,
              }}
              backgroundColor={
                localStorage.getItem("chakra-ui-color-mode") === "dark"
                  ? "#1a202c"
                  : "white"
              }
            >
              {/* 
? "#273443"
: "#1BEBA5" */}
              <Box
                mx={{
                  base: 6,
                  md: 3,
                }}
                w="fit-content"
              >
                {isOtherUserTyping && (
                  <Lottie
                    options={defaultOptions}
                    height={20}
                    width={20}
                    isStopped={false}
                    isPaused={false}
                  />
                )}
              </Box>
              <FormControl>
                <InputGroup
                  w={{
                    base: "95%",
                    md: "98%",
                  }}
                  m="auto"
                  onKeyDown={handleKeyPress}
                >
                  {!receiver?.email?.includes("bot") && (
                    <InputLeftElement>
                      <Button
                        mx={2}
                        size="sm"
                        onClick={onOpen}
                        borderRadius="lg"
                      >
                        <FaFileUpload />
                      </Button>
                    </InputLeftElement>
                  )}

                  <Input
                    placeholder="Type a message"
                    id="new-message"
                    onChange={handleTyping}
                    borderRadius="10px"
                  />

                  <InputRightElement>
                    <Button
                      onClick={(e) =>
                        handleSendMessage(
                          e,
                          document.getElementById("new-message")?.value
                        )
                      }
                      size="sm"
                      mx={2}
                      borderRadius="10px"
                    >
                      <ArrowForwardIcon />
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>
            </Box>
          </Box>
          <FileUploadModal
            isOpen={isOpen}
            onClose={onClose}
            handleSendMessage={handleSendMessage}
          />
        </>
      ) : (
        !isChatLoading && (
          <Box
            display={{
              base: "none",
              md: "block",
            }}
            mx="auto"
            w="fit-content"
            mt="30vh"
            textAlign="center"
          >
            <Flex align="center" justify="center" mb={2}>
              <Box
                as="img"
                src="/logo.png"
                alt="logo"
                boxSize="105px" // bigger logo for hero section
                mr={3} // spacing from text
                borderRadius="full"
                objectFit="cover"
              />

              <Text fontSize="6vw" fontWeight="bold" fontFamily="Work sans">
                Aura Chat
              </Text>
            </Flex>

            <Text fontSize="2vw" opacity="0.9">
              Online chatting app
            </Text>
            <Text fontSize="md" opacity="0.8">
              Select a chat to start messaging
            </Text>
          </Box>
        )
      )}
    </>
  );
};
