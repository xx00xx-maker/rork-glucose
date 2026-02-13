
// Web compatibility shim for background tasks
// Background fetch is not supported/needed on web for this use case
export async function registerBackgroundTask() {
  console.log("[Background Fetch] Web: Background tasks are not supported on web. Skipping registration.");
  return Promise.resolve();
}
