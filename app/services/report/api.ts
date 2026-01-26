
import { AggregatedReportRequest, GeneratedReport } from './types';
import { supabase } from '../../utils/supabaseClient'; // Assuming you have a client

const FORCE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

export async function generateReport(request: AggregatedReportRequest): Promise<GeneratedReport> {
  const { data, error } = await supabase.functions.invoke('generate-report', {
    body: request
  });

  if (error) {
    console.error("Function invoke error:", error);
    throw error;
  }

  return data as GeneratedReport;
}
