'use client';

export default function OrdersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-lg" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div>
                <div className="h-6 w-12 bg-gray-200 rounded mb-1" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <div className="h-5 w-32 bg-gray-200 rounded" />
        </div>
        <div className="divide-y">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
              </div>
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-6 w-20 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
