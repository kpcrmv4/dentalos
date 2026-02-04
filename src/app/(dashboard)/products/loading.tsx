'use client';

export default function ProductsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>
        <div className="h-10 w-36 bg-gray-200 rounded-lg" />
      </div>

      {/* Search and Filter Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-gray-200 rounded-lg" />
            <div className="h-10 w-32 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Product Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-1/2 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-2/3 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-6 w-16 bg-gray-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
