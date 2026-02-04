'use client';

export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-56 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-gray-200 rounded-lg" />
          <div className="h-10 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 border-b pb-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 w-28 bg-gray-200 rounded-lg" />
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <div className="h-5 w-40 bg-gray-200 rounded" />
        </div>
        <div className="divide-y">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-56 bg-gray-200 rounded" />
              </div>
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
