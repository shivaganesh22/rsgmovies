import React from 'react';

export const MediaCardSkeleton = () => (
  <div className="flex flex-col rounded-xl overflow-hidden bg-surface-card border border-white/5 animate-pulse">
    <div className="aspect-[2/3] w-full bg-gray-800" />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-gray-800 rounded w-3/4" />
      <div className="h-3 bg-gray-800 rounded w-1/2" />
    </div>
  </div>
);

export const BannerSkeleton = () => (
  <div className="w-full h-[60vh] max-h-[600px] bg-surface rounded-2xl animate-pulse border border-white/5 p-8 flex flex-col justify-end gap-4">
    <div className="h-8 bg-gray-800 rounded w-1/3" />
    <div className="h-4 bg-gray-800 rounded w-1/2" />
    <div className="flex gap-3">
      <div className="h-10 w-28 bg-gray-800 rounded-xl" />
      <div className="h-10 w-28 bg-gray-800 rounded-xl" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="w-full space-y-3 animate-pulse">
    <div className="h-10 bg-surface-elevated rounded-xl w-full" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-12 bg-surface rounded-xl w-full border border-white/5" />
    ))}
  </div>
);

export const CardSkeleton = MediaCardSkeleton;

export const DetailSkeleton = () => (
  <div className="w-full space-y-8 animate-pulse p-4">
    <div className="w-full aspect-video max-h-[450px] bg-gray-800 rounded-3xl" />
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-40 aspect-[2/3] bg-gray-800 rounded-2xl flex-shrink-0 mx-auto md:mx-0" />
      <div className="flex-1 space-y-4">
        <div className="h-8 bg-gray-800 rounded w-1/2" />
        <div className="h-4 bg-gray-800 rounded w-1/4" />
        <div className="h-16 bg-gray-800 rounded w-3/4" />
      </div>
    </div>
  </div>
);

export default MediaCardSkeleton;
