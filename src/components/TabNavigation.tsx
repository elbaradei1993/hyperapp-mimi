import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import {
  Map,
  Users,
  User,
  Settings,
  Plus
} from 'lucide-react';

export type TabType = 'map' | 'reports' | 'profile' | 'settings';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onNewReport?: () => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, onNewReport }) => {
  const { t } = useTranslation();
  const navRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1200);

  const tabs = [
    {
      id: 'map' as TabType,
      label: t('tabs.map'),
      icon: Map,
      ariaLabel: t('tabs.map')
    },
    {
      id: 'reports' as TabType,
      label: t('tabs.community'),
      icon: Users,
      ariaLabel: t('tabs.community')
    },
    {
      id: 'profile' as TabType,
      label: t('tabs.profile'),
      icon: User,
      ariaLabel: t('tabs.profile')
    },
    {
      id: 'settings' as TabType,
      label: t('tabs.settings'),
      icon: Settings,
      ariaLabel: t('tabs.settings')
    }
  ];

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1200);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update indicator position when activeTab changes (only for mobile)
  useEffect(() => {
    if (isMobile && navRef.current) {
      const activeButton = navRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
      if (activeButton) {
        const navRect = navRef.current.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        setIndicatorStyle({
          width: buttonRect.width,
          left: buttonRect.left - navRect.left
        });
      }
    }
  }, [activeTab, isMobile]);

  // Handle window resize and orientation change
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      if (navRef.current) {
        const activeButton = navRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
        if (activeButton) {
          const navRect = navRef.current.getBoundingClientRect();
          const buttonRect = activeButton.getBoundingClientRect();
          setIndicatorStyle({
            width: buttonRect.width,
            left: buttonRect.left - navRect.left
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 300);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [activeTab, isMobile]);

  const MotionBox = motion.create(Box);

  return (
    <>
      {/* Enhanced Tab Navigation */}
      <Box
        ref={navRef}
        as="nav"
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        bg="transparent"
        zIndex={90}
        display="flex"
        alignItems="center"
        px={3}
        py={0}
        minH="70px"
        width="100vw"
        boxSizing="border-box"
        style={{
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
          paddingTop: '0px',
        }}
      >
        {/* Sliding Tab Indicator - only for mobile */}
        {isMobile && (
          <MotionBox
            className="tab-indicator"
            position="absolute"
            top="8px"
            h="calc(100% - 16px)"
            bg="gray.50"
            borderRadius="12px"
            boxShadow="0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)"
            border="1px solid"
            borderColor="gray.200"
            zIndex={-1}
            animate={{
              width: indicatorStyle.width,
              left: indicatorStyle.left,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
          />
        )}

        {/* Tab Buttons */}
        {tabs.map((tab, index) => (
          <React.Fragment key={tab.id}>
            <MotionBox
              as="button"
              data-tab={tab.id}
              onClick={() => onTabChange(tab.id)}
              flex={1}
              p={isMobile ? "10px 8px" : "14px 12px"}
              border="none"
              bg="transparent"
              color={activeTab === tab.id ? "brand.500" : "gray.500"}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              gap={1}
              cursor="pointer"
              fontSize={isMobile ? "0.7rem" : "0.875rem"}
              fontWeight={activeTab === tab.id ? "600" : "500"}
              borderRadius="12px"
              position="relative"
              zIndex={1}
              minH={isMobile ? "54px" : "64px"}
              style={{
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              whileTap={{ scale: 0.95 }}
              _hover={{
                color: activeTab === tab.id ? "brand.500" : "gray.700",
              }}
            >
              <MotionBox
                as="div"
                display="flex"
                alignItems="center"
                justifyContent="center"
                w={isMobile ? "1.125rem" : "1.375rem"}
                h={isMobile ? "1.125rem" : "1.375rem"}
                animate={{
                  y: activeTab === tab.id ? -2 : 0,
                  opacity: activeTab === tab.id ? 1 : 0.8,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 17
                }}
              >
                <tab.icon
                  size={isMobile ? 18 : 22}
                  color={activeTab === tab.id ? "#3b82f6" : "#6b7280"}
                />
              </MotionBox>
              <MotionBox
                fontSize={isMobile ? "0.7rem" : "0.875rem"}
                fontWeight={activeTab === tab.id ? "600" : "500"}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 17
                }}
              >
                {tab.label}
              </MotionBox>
            </MotionBox>

            {/* Floating Action Button - positioned in the middle of the tabs bar */}
            {index === 1 && onNewReport && (
              <MotionBox
                as="button"
                onClick={onNewReport}
                w="56px"
                h="56px"
                borderRadius="16px"
                bg="#3b82f6"
                border="none"
                boxShadow="0 10px 25px rgba(59, 130, 246, 0.3), 0 4px 10px rgba(59, 130, 246, 0.2)"
                color="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                zIndex={2}
                position="relative"
                mx={2}
                style={{
                  WebkitTapHighlightColor: 'transparent',
                }}
                whileHover={{
                  y: -3,
                  boxShadow: "0 20px 40px rgba(59, 130, 246, 0.4), 0 8px 16px rgba(59, 130, 246, 0.3)",
                }}
                whileTap={{ scale: 0.92 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 17
                }}
                title={t('app.newReport')}
                aria-label={t('app.newReport')}
              >
                <MotionBox
                  animate={{ rotate: 0 }}
                  whileHover={{ rotate: 90 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                >
                  <Plus size={22} />
                </MotionBox>
              </MotionBox>
            )}
          </React.Fragment>
        ))}
      </Box>



      {/* CSS Animations */}
      <style>
        {`
          /* Respect user's motion preferences */
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }

          /* Touch-friendly hover states */
          @media (hover: hover) {
            button[data-tab]:hover {
              background: rgba(37, 99, 235, 0.05);
            }
          }

          /* Enhanced responsive design */
          @media (max-width: 767px) {
            button[data-tab] {
              padding: 12px 8px !important;
              min-height: 58px !important;
              font-size: 0.75rem !important;
            }

            button[data-tab] svg {
              width: 1.125rem !important;
              height: 1.125rem !important;
            }

            button[data-tab] span {
              font-size: 0.7rem !important;
            }
          }

          /* Larger phone screens */
          @media (min-width: 400px) and (max-width: 767px) {
            button[data-tab] {
              padding: 14px 8px !important;
              min-height: 62px !important;
            }

            button[data-tab] svg {
              width: 1.25rem !important;
              height: 1.25rem !important;
            }

            button[data-tab] span {
              font-size: 0.75rem !important;
            }
          }

          /* Tablet and desktop */
          @media (min-width: 768px) {
            nav[ref] {
              position: relative !important;
              border-radius: 16px !important;
              margin-top: 40px !important;
              padding: 12px !important;
              min-height: 80px !important;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
              border: 1px solid rgba(229, 231, 235, 0.4) !important;
            }

            button[data-tab] {
              min-height: 64px !important;
              font-size: 0.875rem !important;
            }

            button[data-tab] svg {
              width: 1.375rem !important;
              height: 1.375rem !important;
            }
          }

          /* Landscape orientation adjustments */
          @media (max-height: 500px) and (orientation: landscape) {
            nav[ref] {
              min-height: 60px !important;
            }

            button[data-tab] {
              min-height: 48px !important;
              padding: 6px 4px !important;
            }

            button[data-tab] svg {
              width: 1rem !important;
              height: 1rem !important;
            }

            button[data-tab] span {
              font-size: 0.65rem !important;
            }
          }
        `}
      </style>
    </>
  );
};

export default TabNavigation;
