const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nqwejzbayquzsvcodunl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2VqemJheXF1enN2Y29kdW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTA0MjAsImV4cCI6MjA3Mzk2NjQyMH0.01yifC-tfEbBHD5u315fpb_nZrqMZCbma_UrMacMb78'
);

async function checkReports() {
  try {
    console.log('Checking recent reports...');

    const { data: reports, error } = await supabase
      .from('reports')
      .select('id, vibe_type, location, latitude, longitude, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Database error:', error);
      return;
    }

    console.log(`Found ${reports.length} recent reports:`);
    reports.forEach(report => {
      console.log(`ID: ${report.id}, Vibe: ${report.vibe_type}, Location: ${report.location}`);
      console.log(`  Coordinates: ${report.latitude}, ${report.longitude}`);
      console.log(`  Created: ${report.created_at}`);
      console.log('---');
    });

    const withCoords = reports.filter(r => r.latitude && r.longitude);
    console.log(`\nReports with coordinates: ${withCoords.length}/${reports.length}`);

    if (withCoords.length === 0) {
      console.log('No reports have coordinates - this explains why no icons appear on the map!');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkReports();
