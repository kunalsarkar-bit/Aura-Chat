import React from "react";
import {
  Box,
  Button,
  Divider,
  Flex,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Circle,
  Stack,
  Spinner,
} from "@chakra-ui/react";
import { useState, useEffect, useContext } from "react";
import chatContext from "../../context/chatContext";
import { AddIcon, Search2Icon } from "@chakra-ui/icons";
import { useToast } from "@chakra-ui/react";
import ProfileMenu from "../Navbar/ProfileMenu";
import { useDisclosure } from "@chakra-ui/react";
import NewMessage from "../miscellaneous/NewMessage";
import wavFile from "../../assets/newmessage.wav";
import { ProfileModal } from "../miscellaneous/ProfileModal";

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

const MyChatList = (props) => {
  var sound = new Audio(wavFile);
  const toast = useToast();
  const context = useContext(chatContext);
  const {
    hostName,
    user,
    socket,
    myChatList: chatlist = [], // Default empty array
    originalChatList: data = [], // Default empty array
    activeChatId,
    setActiveChatId,
    setMyChatList,
    setIsChatLoading,
    setMessageList,
    setIsOtherUserTyping,
    setReceiver,
    isLoading,
    isOtherUserTyping,
  } = context;
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    const handleNewMessage = async (data) => {
      if (!chatlist) return;

      var newlist = [...chatlist];

      let chatIndex = newlist.findIndex(
        (chat) => chat?._id === data?.conversationId
      );

      if (chatIndex === -1 && data?.conversation) {
        newlist.unshift(data.conversation);
      }

      chatIndex = newlist.findIndex(
        (chat) => chat?._id === data?.conversationId
      );
      if (chatIndex === -1) return;

      newlist[chatIndex].latestmessage = data?.text;

      if (activeChatId !== data?.conversationId) {
        newlist[chatIndex].unreadCounts = (
          newlist[chatIndex].unreadCounts || []
        ).map((unread) => {
          if (unread?.userId === user?._id) {
            unread.count = (unread.count || 0) + 1;
          }
          return unread;
        });
        newlist[chatIndex].updatedAt = new Date();
      }

      // Move the updated chat to the beginning of the list
      let updatedChat = newlist.splice(chatIndex, 1)[0];
      newlist.unshift(updatedChat);

      setMyChatList(newlist);

      // Find the name of person who sent the message
      let sender = newlist.find((chat) => chat?._id === data?.conversationId)
        ?.members?.[0];

      if (activeChatId !== data?.conversationId) {
        sound.play().catch((error) => {
          console.log(error);
        });

        toast({
          status: "success",
          duration: 5000,
          position: "top-right",
          render: () => (
            <NewMessage
              sender={sender}
              data={data}
              handleChatOpen={handleChatOpen}
            />
          ),
        });
      }
    };

    socket.on("new-message-notification", handleNewMessage);

    return () => {
      socket.off("new-message-notification", handleNewMessage);
    };
  }, [chatlist, activeChatId, user?._id]); // Add dependencies

  const [squery, setsquery] = useState("");

  const handleUserSearch = async (e) => {
    const value = e.target.value.toLowerCase();
    setsquery(value);

    if (value !== "") {
      const newchatlist = (data || []).filter((chat) =>
        chat?.members?.[0]?.name?.toLowerCase().includes(value)
      );
      setMyChatList(newchatlist);
    } else {
      setMyChatList(context.originalChatList || []);
    }
  };

  const handleChatOpen = async (chatid, receiver) => {
    if (!chatid || !receiver) return;

    try {
      setIsChatLoading(true);
      setMessageList([]);
      setIsOtherUserTyping(false);

      const msg = document.getElementById("new-message");
      if (msg) {
        msg.value = "";
        msg.focus();
      }

      await socket.emit("stop-typing", {
        typer: user?._id,
        conversationId: activeChatId,
      });
      await socket.emit("leave-chat", activeChatId);

      socket.emit("join-chat", { roomId: chatid, userId: user?._id });
      setActiveChatId(chatid);

      const response = await fetch(
        `${hostName}/message/${chatid}/${user?._id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const jsonData = await response.json();
      setMessageList(jsonData);
      setReceiver(receiver);
      setIsChatLoading(false);

      const newlist = (chatlist || []).map((chat) => {
        if (chat?._id === chatid) {
          chat.unreadCounts = (chat.unreadCounts || []).map((unread) => {
            if (unread?.userId === user?._id) {
              unread.count = 0;
            }
            return unread;
          });
        }
        return chat;
      });

      setMyChatList(newlist);

      setTimeout(() => {
        const chatBox = document.getElementById("chat-box");
        if (chatBox) {
          chatBox.scrollTo({
            top: chatBox.scrollHeight,
          });
        }
      }, 100);
    } catch (error) {
      console.log(error);
    }
  };

  if (isLoading) {
    return (
      <Box margin={"auto"} w={"max-content"} mt={"30vh"}>
        <Spinner size={"xl"} />
      </Box>
    );
  }

  return (
    <Box
      display={"flex"}
      justifyContent={"space-between"}
      flexDir={"column"}
      mt={1}
      h={"100%"}
    >
      <Flex zIndex={1} justify={"space-between"}>
        <Text mb={"10px"} fontWeight={"bold"} fontSize={"2xl"}>
          Chats
        </Text>

        <Flex>
          <InputGroup w={{ base: "fit-content", md: "fit-content" }} mx={2}>
            <InputLeftElement pointerEvents="none">
              <Search2Icon color="gray.300" />
            </InputLeftElement>
            <Input
              type="text"
              placeholder="search user"
              onChange={handleUserSearch}
              id="search-input"
            />
          </InputGroup>

          <Box minW={"fit-content"} display={{ base: "block", md: "none" }}>
            <ProfileMenu
              user={user}
              isOpen={isOpen}
              onOpen={onOpen}
              onClose={onClose}
            />
          </Box>
        </Flex>
      </Flex>

      <Divider my={1} />

      <Button m={2} colorScheme="purple" onClick={() => props.setactiveTab(1)}>
        Add new Chat <AddIcon ml={2} fontSize={"12px"} />
      </Button>

      <Box h={"100%"} px={2} flex={1} overflowY={"auto"} sx={scrollbarconfig}>
        {(chatlist || []).map((chat) => {
          const member = chat?.members?.[0];
          if (!member) return null;

          const unreadCount =
            chat?.unreadCounts?.find((unread) => unread?.userId === user?._id)
              ?.count || 0;

          return (
            <Flex
              key={member?._id || Math.random()} // Fallback key
              my={2}
              justify={"space-between"}
              align={"center"}
              w={"100%"}
              overflow={"hidden"}
            >
              <Button
                h={"4em"}
                w={"100%"}
                justifyContent={"space-between"}
                onClick={() => handleChatOpen(chat?._id, member)}
                colorScheme={chat?._id === activeChatId ? "purple" : "gray"}
              >
                <Flex>
                  <Box>
                    <img
                      src={
                        member?.profilePic || "https://via.placeholder.com/150"
                      }
                      alt="profile"
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                      }}
                    />
                  </Box>
                  <Box ml={3} w={"50%"} textAlign={"left"}>
                    <Text
                      textOverflow={"ellipsis"}
                      fontSize={"lg"}
                      fontWeight={"bold"}
                    >
                      {member?.name?.length > 11
                        ? member?.name?.substring(0, 13) + "..."
                        : member?.name}
                    </Text>
                    {isOtherUserTyping && chat?._id === activeChatId ? (
                      <Text fontSize={"sm"} color={"purple.100"}>
                        typing...
                      </Text>
                    ) : (
                      <Text fontSize={"sm"} color={"gray.400"}>
                        {chat?.latestmessage?.substring(0, 15) +
                          (chat?.latestmessage?.length > 15 ? "..." : "")}
                      </Text>
                    )}
                  </Box>
                </Flex>

                <Stack direction={"row"} align={"center"}>
                  <Box textAlign={"right"} fontSize={"x-small"}>
                    {chat?.updatedAt && (
                      <>
                        {new Date(chat.updatedAt).toDateString() ===
                        new Date().toDateString() ? (
                          <Text mb={1} fontSize={"x-small"}>
                            Today
                          </Text>
                        ) : new Date(chat.updatedAt).toDateString() ===
                          new Date(
                            new Date().setDate(new Date().getDate() - 1)
                          ).toDateString() ? (
                          <Text mb={1} fontSize={"x-small"}>
                            Yesterday
                          </Text>
                        ) : (
                          <Text mb={1} fontSize={"x-small"}>
                            {new Date(chat.updatedAt).toLocaleDateString()}
                          </Text>
                        )}
                        {new Date(chat.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </>
                    )}
                  </Box>

                  {unreadCount > 0 && (
                    <Circle
                      backgroundColor={"black"}
                      color={"white"}
                      p={1}
                      borderRadius={40}
                      size={"20px"}
                    >
                      <Text fontSize={12} p={1} borderRadius={50}>
                        &nbsp;{unreadCount}&nbsp;
                      </Text>
                    </Circle>
                  )}
                </Stack>
              </Button>
            </Flex>
          );
        })}
      </Box>
      <ProfileModal
        isOpen={isOpen}
        onClose={onClose}
        onOpen={onOpen}
        user={user}
      />
    </Box>
  );
};

export default MyChatList;
