import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onManualLocation: () => void;
}

const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onManualLocation
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Location Access Required
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enable location to see nearby safety reports
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Why we need your location:
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• Show safety reports near you</li>
                      <li>• Help others find your reports</li>
                      <li>• Provide location-based alerts</li>
                      <li>• Improve community safety mapping</li>
                    </ul>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                      How to enable location:
                    </h4>
                    <div className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
                      <div>
                        <strong>iOS:</strong> Settings → Privacy → Location Services → Safari → Allow
                      </div>
                      <div>
                        <strong>Android:</strong> Settings → Apps → [Browser] → Permissions → Location → Allow
                      </div>
                      <div>
                        <strong>Desktop:</strong> Click the location icon in your browser's address bar
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 space-y-3">
                <button
                  onClick={onManualLocation}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200"
                >
                  Set Location Manually
                </button>

                <button
                  onClick={onClose}
                  className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-3 px-4 rounded-xl transition-colors duration-200"
                >
                  Continue Without Location
                </button>

                <button
                  onClick={() => {
                    onClose();
                    // Try to request permissions again
                    if (navigator.permissions && navigator.permissions.query) {
                      navigator.permissions.query({ name: 'geolocation' }).then(result => {
                        if (result.state === 'prompt') {
                          // Try to trigger the permission prompt
                          navigator.geolocation.getCurrentPosition(
                            () => window.location.reload(),
                            () => {},
                            { timeout: 1000 }
                          );
                        }
                      });
                    }
                  }}
                  className="w-full text-blue-600 dark:text-blue-400 font-medium py-2 px-4 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200"
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LocationPermissionModal;
