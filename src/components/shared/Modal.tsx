import React from 'react';
import { Box } from '@chakra-ui/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'lg'
}) => {
  if (!isOpen) return null;

  const maxWidth = {
    sm: '400px',
    md: '500px',
    lg: '600px',
    xl: '800px'
  }[size];

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(0, 0, 0, 0.7)"
      backdropFilter="blur(8px)"
      display="flex"
      justifyContent="center"
      alignItems="center"
      zIndex={1100}
      p={3}
      opacity={isOpen ? 1 : 0}
      pointerEvents={isOpen ? 'all' : 'none'}
      transition="opacity 0.3s ease"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="modal-overlay"
    >
      <Box
        bg="gray.50"
        _dark={{ bg: "gray.800" }}
        borderRadius="2xl"
        boxShadow="2xl"
        width="100%"
        maxWidth={maxWidth}
        maxHeight={['85vh', '90vh']}
        overflowY="auto"
        overflowX="hidden"
        transform={isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)'}
        transition="transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
        position="relative"
        className="modal-content"
      >
        <Box
          position="absolute"
          top={5}
          right={5}
          as="button"
          onClick={onClose}
          aria-label="Close modal"
          bg="gray.200"
          w={10}
          h={10}
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          color="gray.600"
          transition="all 0.2s"
          zIndex={10}
          _dark={{
            color: "gray.300",
            bg: "gray.700"
          }}
          _hover={{
            bg: "gray.300",
            _dark: { bg: "gray.600" },
            transform: "rotate(90deg)"
          }}
        >
          ✕
        </Box>
        {title && (
          <Box p={6} pb={0}>
            <Box as="h2" fontSize="xl" fontWeight="bold" color="gray.900" _dark={{ color: "gray.100" }}>
              {title}
            </Box>
          </Box>
        )}
        <Box p={6}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Modal;
