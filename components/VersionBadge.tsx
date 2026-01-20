import React from 'react';
import BUILD_INFO from '../CACHE_BUSTER';

export function VersionBadge() {
  return (
    <span className="text-xs text-gray-400" title={`Build: ${BUILD_INFO.build} | Timestamp: ${BUILD_INFO.timestamp}`}>
      v{BUILD_INFO.version}
    </span>
  );
}
