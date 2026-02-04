'use client';

export default function ReservationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-72 bg-gray-200 rounded" />
        </div>
        <div className="h-10 w-36 bg-gray-200 rounded-lg" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div>
                <div className="h-6 w-12 bg-gray-200 rounded mb-1" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar/List View Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-24 bg-gray-200 rounded" />
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded text-center" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-50 rounded border p-2">
                <div className="h-4 w-6 bg-gray-200 rounded mb-2" />
                {i % 3 === 0 && (
                  <div className="h-3 w-full bg-gray-200 rounded" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
