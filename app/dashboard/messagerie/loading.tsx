import React from 'react';

export default function MessagerieLoading() {
  return (
    <div className="flex h-full bg-gray-50">
      {/* Conversation List Skeleton */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header Skeleton */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Conversation Items Skeleton */}
        <div className="flex-1 overflow-y-auto p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Thread Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header Skeleton */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Messages Skeleton */}
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                i % 2 === 0 ? 'bg-blue-500' : 'bg-gray-200'
              }`}>
                <div className={`h-4 rounded w-${Math.floor(Math.random() * 20) + 10} animate-pulse`}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Skeleton */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 bg-gray-200 rounded flex-1 animate-pulse"></div>
            <div className="h-10 w-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
