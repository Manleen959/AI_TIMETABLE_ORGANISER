import React from 'react';

export function Skeleton({ className = '', variant = 'rect' }) {
  const baseClasses = 'animate-pulse bg-slate-200/80';
  const radius = variant === 'circle' ? 'rounded-full' : variant === 'card' ? 'rounded-2xl' : 'rounded-lg';
  return <div className={`${baseClasses} ${radius} ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="bg-slate-200 h-44 rounded-panel" />

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-panel p-6 border border-line space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>

        <div className="bg-white rounded-panel p-6 border border-line space-y-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export function TimetableSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white rounded-panel p-6 border border-line flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>

      <div className="bg-white rounded-panel p-6 border border-line space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}
