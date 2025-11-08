import React, { useContext, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Text,
  Link,
  useDisclosure,
  useColorModeValue,
} from "@chakra-ui/react";
import { FaGithub, FaMoon, FaSun } from "react-icons/fa";
import ProfileMenu from "./ProfileMenu";
import chatContext from "../../context/chatContext";

const Navbar = (props) => {
  const context = useContext(chatContext);
  const { isAuthenticated } = context;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const colormode = localStorage.getItem("chakra-ui-color-mode");
  const [icon, seticon] = useState(colormode === "dark" ? <FaSun /> : <FaMoon />);

  const handleToggle = () => {
    if (colormode === "dark") {
      seticon(<FaMoon />);
      props.toggleColorMode();
    } else {
      seticon(<FaSun />);
      props.toggleColorMode();
    }
  };

  const path = window.location.pathname;

  const glassBg = useColorModeValue(
    "rgba(255,255,255,0.25)",
    "rgba(0,0,0,0.25)"
  );
  const borderColor = useColorModeValue("rgba(0,0,0,0.15)", "rgba(255,255,255,0.15)");

  return (
    <>
      {/* Mobile */}
      {!path.includes("dashboard") && (
        <Box position={"absolute"} top={5} left={5} display={{ md: "none", base: "flex" }}>
          <Button
            p={3}
            borderRadius="full"
            borderWidth={1}
            borderColor={borderColor}
            backdropFilter="blur(12px)"
            background={glassBg}
            onClick={handleToggle}
            mx={1}
            _hover={{ boxShadow: "0 0 12px rgba(255,255,255,0.5)" }}
          >
            {icon}
          </Button>

          <Link
            p={3}
            borderRadius="full"
            borderWidth={1}
            borderColor={borderColor}
            backdropFilter="blur(12px)"
            background={glassBg}
            href="https://github.com/kunalsarkar-bit"
            mx={1}
            _hover={{ boxShadow: "0 0 12px rgba(255,255,255,0.5)" }}
          >
            <FaGithub />
          </Link>
        </Box>
      )}

      {/* Desktop */}
      <Box
        p={4}
        w={{ base: "94vw", md: "98vw" }}
        m="auto"
        mt={2}     // moved up
        mb={3}     // added space below
        borderRadius="14px"
        borderWidth="1.5px"
        borderColor={borderColor}
        background={glassBg}
        backdropFilter="blur(20px)"
        transition="0.3s"
        _hover={{ boxShadow: "0 0 25px rgba(255,255,255,0.25)" }}
        display={{ base: "none", md: "block" }}
      >
        <Flex justify={"space-between"} align="center">
         <Flex align="center">
 <Box
  as="img"
  src="/logo.png"
  alt="logo"
  boxSize="30px"
  mr={1}
  borderRadius="full"
  objectFit="cover"     // ensures circle crop
/>

  <Text
    fontSize="2xl"
    fontWeight="600"
    letterSpacing="0.5px"
  >
    Aura Chat
  </Text>
</Flex>


          <Box display="flex" alignItems="center">
            <Button
              onClick={handleToggle}
              borderRadius="full"
              borderWidth={1}
              borderColor={borderColor}
              backdropFilter="blur(12px)"
              background={glassBg}
              p={3}
              mr={2}
              _hover={{ boxShadow: "0 0 12px rgba(255,255,255,0.5)" }}
            >
              {icon}
            </Button>

            <Button
              borderRadius="full"
              borderWidth={1}
              borderColor={borderColor}
              backdropFilter="blur(12px)"
              background={glassBg}
              p={3}
              mr={3}
              onClick={() => window.open("https://github.com/")}
              _hover={{ boxShadow: "0 0 12px rgba(255,255,255,0.5)" }}
            >
              <FaGithub />
            </Button>

            {isAuthenticated && <ProfileMenu isOpen={isOpen} onOpen={onOpen} onClose={onClose} />}
          </Box>
        </Flex>
      </Box>
    </>
  );
};

export default Navbar;
