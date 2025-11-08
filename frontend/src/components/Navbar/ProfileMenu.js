import React, { useContext } from "react";
import {
  Button,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Image,
  useColorModeValue,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { ProfileModal } from "../miscellaneous/ProfileModal";
import { useColorMode } from "@chakra-ui/react";
import chatContext from "../../context/chatContext";

const ProfileMenu = (props) => {
  const { toggleColorMode } = useColorMode();
  const context = useContext(chatContext);
  const {
    user,
    setUser,
    setIsAuthenticated,
    setActiveChatId,
    setMessageList,
    setReceiver,
  } = context;
  const navigator = useNavigate();

  const glassBg = useColorModeValue(
    "rgba(255,255,255,0.25)",
    "rgba(0,0,0,0.25)"
  );
  const borderColor = useColorModeValue(
    "rgba(0,0,0,0.15)",
    "rgba(255,255,255,0.15)"
  );

  const handleLogout = async (e) => {
    e.preventDefault();
    setUser({});
    setMessageList([]);
    setActiveChatId("");
    setReceiver({});
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    navigator("/");
  };

  return (
    <>
      <Menu>
        <>
          <MenuButton
            isActive={props.isOpen}
            as={Button}
            rightIcon={<ChevronDownIcon />}
            leftIcon={
              <Image
                boxSize="28px"
                borderRadius="full"
                src={user.profilePic}
                alt="profile-pic"
              />
            }
            borderRadius="full"
            borderWidth="1px"
            borderColor={borderColor}
            background={glassBg}
            backdropFilter="blur(14px)"
            px={4}
            py={2}
            _hover={{
              boxShadow: "0 0 15px rgba(255,255,255,0.4)",
              transform: "translateY(-1px)",
            }}
            transition="0.3s ease"
          >
            <Text
              display={{ base: "none", md: "block" }}
              fontSize={"14px"}
              fontWeight="500"
              letterSpacing="0.3px"
            >
              {user.name}
            </Text>
          </MenuButton>

          <MenuList
            backdropFilter="blur(14px)"
            background={glassBg}
            borderColor={borderColor}
            borderWidth="1px"
            borderRadius="12px"
            overflow="hidden"
          >
            <MenuItem _hover={{ background: "rgba(255,255,255,0.18)" }} onClick={props.onOpen}>
              My Profile
            </MenuItem>

            <MenuItem
              display={{ base: "block", md: "none" }}
              onClick={toggleColorMode}
              _hover={{ background: "rgba(255,255,255,0.18)" }}
            >
              {localStorage.getItem("chakra-ui-color-mode") === "light"
                ? "Dark Mode"
                : "Light Mode"}
            </MenuItem>

            <MenuItem
              color={"red.400"}
              fontWeight="600"
              _hover={{ background: "rgba(255,0,0,0.15)" }}
              onClick={handleLogout}
            >
              Logout
            </MenuItem>
          </MenuList>
        </>
      </Menu>

      <ProfileModal
        isOpen={props.isOpen}
        onClose={props.onClose}
        user={user}
        setUser={setUser}
      />
    </>
  );
};

export default ProfileMenu;
