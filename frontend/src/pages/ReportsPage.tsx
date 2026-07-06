import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { reportsApi } from '../api';

const reports = [
  { type: 'resource-utilization', title: 'Resource Utilization Report', description: 'Current utilization, capacity, and availability per resource' },
  { type: 'project-allocation', title: 'Project Allocation Report', description: 'Resource assignments and allocation percentages per project' },
  { type: 'capacity', title: 'Capacity Report', description: 'Monthly capacity breakdown by resource' },
];

export function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (type: string, format: 'csv' | 'xlsx') => {
    setDownloading(`${type}-${format}`);
    try {
      const blob = await reportsApi.download(type, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-gray-500 dark:text-gray-400">Generate and export capacity planning reports</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <div key={report.type} className="card">
            <h3 className="mb-2 font-semibold">{report.title}</h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload(report.type, 'csv')}
                disabled={downloading === `${report.type}-csv`}
                className="btn-secondary flex-1"
              >
                <Download className="h-4 w-4" />
                {downloading === `${report.type}-csv` ? 'Exporting...' : 'CSV'}
              </button>
              <button
                onClick={() => handleDownload(report.type, 'xlsx')}
                disabled={downloading === `${report.type}-xlsx`}
                className="btn-primary flex-1"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {downloading === `${report.type}-xlsx` ? 'Exporting...' : 'Excel'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
