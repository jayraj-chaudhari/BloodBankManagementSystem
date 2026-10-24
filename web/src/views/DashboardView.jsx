import React from 'react';
import Banner from '../components/Banner';
import MetricCards from '../components/MetricCards';
import SupplyDemandChart from '../components/SupplyDemandChart';
import DonorCardWidget from '../components/DonorCardWidget';
import InventoryOverview from '../components/InventoryOverview';
import UrgentRequests from '../components/UrgentRequests';

export default function DashboardView({
  stats,
  trends,
  inventory,
  requests,
  onOpenAnnouncement,
  onOpenNewRequest,
  onAllocate,
  onDownloadReport,
}) {
  return (
    <div className="space-y-6">
      {/* 1. Curved Blue Gradient Banner: "Hello Devs!" */}
      <Banner onOpenAnnouncement={onOpenAnnouncement} />

      {/* 2. Four Metric Cards Row with Circular Progress Rings */}
      <MetricCards stats={stats} />

      {/* 3. Middle Section: Dual Wave Curve Chart & Glassmorphic Donor Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left 2 Cols: Sine Wave Chart */}
        <div className="lg:col-span-2">
          <SupplyDemandChart trends={trends} />
        </div>

        {/* Right 1 Col: VISA Glassmorphic Card + Mini Stats */}
        <div className="lg:col-span-1">
          <DonorCardWidget onDownloadReport={onDownloadReport} />
        </div>
      </div>

      {/* 4. Bottom Row: Stock Levels & Critical Rh-ve Inventory */}
      <InventoryOverview inventory={inventory} />

      {/* 5. Live Urgent Blood Requests Table */}
      <UrgentRequests
        requests={requests}
        onAllocate={onAllocate}
        onNewRequest={onOpenNewRequest}
      />
    </div>
  );
}
