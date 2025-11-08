import { Button, CloseButton, Input, Modal } from "@chakra-ui/react";
import React, { useRef, useState } from "react";
import {
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Box,
  Text,
  Flex,
  Image,
} from "@chakra-ui/react";
import { ArrowForwardIcon } from "@chakra-ui/icons";

const FileUploadModal = (props) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setmessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const handleFileUpload = () => {
    fileInputRef.current.click();
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      // Create a preview URL for the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      fileInputRef.current.value = null;
      setSelectedFile(null);
      setPreviewUrl("");
      alert("Please select a valid image file.");
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl("");
  };

  return (
    <>
      <Modal isOpen={props.isOpen} onClose={props.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader display={"flex"} justifyContent={"space-between"}>
            <Text w={"max-content"}>Send a photo</Text>
            <CloseButton onClick={props.onClose} />
          </ModalHeader>
          <ModalBody>
            <Input
              type="file"
              display={"none"}
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*"
            />

            {/* Image preview container */}
            {previewUrl && (
              <Box
                mb={4}
                width="100%"
                height="200px"
                display="flex"
                justifyContent="center"
                alignItems="center"
                overflow="hidden"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
              >
                <Image
                  src={previewUrl}
                  alt="Preview"
                  objectFit="contain"
                  maxW="100%"
                  maxH="100%"
                />
              </Box>
            )}

            <Box display={"flex"} justifyContent={"space-between"}>
              <Flex>
                <Button mr={3} onClick={handleFileUpload}>
                  <Text>Choose a photo</Text>
                </Button>
                {selectedFile && (
                  <Box
                    display={"flex"}
                    alignItems={"center"}
                    justifyContent={"space-between"}
                  >
                    <Text>
                      {selectedFile.name.length > 10
                        ? selectedFile.name.substring(0, 10) + "..."
                        : selectedFile.name}
                    </Text>
                    <CloseButton onClick={removeFile} ml={2} />
                  </Box>
                )}
              </Flex>
              <Button
                onClick={(e) => {
                  props.handleSendMessage(e, message, selectedFile);
                  props.onClose();
                }}
                isDisabled={!selectedFile}
                size={"md"}
              >
                Send
                <ArrowForwardIcon />
              </Button>
            </Box>
            <Input
              type="text"
              placeholder="Add a message..."
              mt={3}
              onChange={(e) => {
                setmessage(e.target.value);
              }}
            ></Input>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default FileUploadModal;
