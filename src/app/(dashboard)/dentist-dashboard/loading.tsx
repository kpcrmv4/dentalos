'use client';

// Skeleton component for loading state
export function DentistDashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div>
                <div className="h-4 w-16 bg-gray-200 rounded mb-2" />
                <div className="h-6 w-12 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Cases Skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b">
            <div className="h-5 w-32 bg-gray-200 rounded" />
          </div>
          <div className="divide-y">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-grow">
                    <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                  </div>
                  <div className="h-8 w-20 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b">
            <div className="h-5 w-40 bg-gray-200 rounded" />
          </div>
          <div className="divide-y">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-grow">
                    <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-32 bg-gray-200 rounded" />
                  </div>
                  <div className="h-6 w-6 bg-gray-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="h-5 w-24 bg-gray-200 rounded" />
          <div className="flex items-center gap-4">
            <div className="h-8 w-48 bg-gray-200 rounded" />
            <div className="h-8 w-32 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Default export for Next.js loading.tsx
export default function Loading() {
  return <DentistDashboardSkeleton />;
}
