
// Web compatibility shim for localdb
// Uses localStorage to persist reports roughly

export async function getDB() {
  return {
    getAllAsync: async (query: string) => {
      // Mock implementation for "SELECT report_json FROM local_reports ..."
      if (query.includes('local_reports')) {
         const json = localStorage.getItem('last_report');
         if (json) {
             return [{ report_json: json }];
         }
      }
      return [];
    },
    runAsync: async () => {},
    execAsync: async () => {}
  };
}

export async function initDatabase() {
  // No-op on web
}

export async function saveGlucoseRecords(records: any[]) {
  // No-op on web
}

export async function saveReport(report: any) {
  localStorage.setItem('last_report', JSON.stringify(report));
}
