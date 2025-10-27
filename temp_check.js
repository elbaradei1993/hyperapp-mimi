// Temporary script to add sample reports for testing
// Run this in the browser console to populate the database with test data

async function addSampleReports() {
  const supabase = window.supabaseClientManager.initialize(
    'https://nqwejzbayquzsvcodunl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2VqemJheXF1enN2Y29kdW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTA0MjAsImV4cCI6MjA3Mzk2NjQyMH0.01yifC-tfEbBHD5u315fpb_nZrqMZCbma_UrMacMb78'
  );

  const sampleReports = [
    {
      vibe_type: 'calm',
      location: 'Tahrir Square, Downtown Cairo',
      notes: 'Peaceful atmosphere, good lighting',
      latitude: 30.0444,
      longitude: 31.2357
    },
    {
      vibe_type: 'crowded',
      location: 'Khan el-Khalili Bazaar',
      notes: 'Very busy with tourists and locals',
      latitude: 30.0478,
      longitude: 31.2625
    },
    {
      vibe_type: 'noisy',
      location: 'Near Metro Station',
      notes: 'Construction work nearby, loud traffic',
      latitude: 30.0561,
      longitude: 31.3399
    },
    {
      vibe_type: 'festive',
      location: 'Zamalek District',
      notes: 'Cafes and restaurants open, lively atmosphere',
      latitude: 30.0667,
      longitude: 31.2167
    },
    {
      vibe_type: 'suspicious',
      location: 'Dark alley near Corniche',
      notes: 'Poor lighting, few people around',
      latitude: 30.0459,
      longitude: 31.2243
    },
    {
      vibe_type: 'dangerous',
      location: 'Industrial area outskirts',
      notes: 'Reports of theft in this area',
      latitude: 30.1234,
      longitude: 31.3456
    },
    {
      vibe_type: 'calm',
      location: 'Al-Azhar Park',
      notes: 'Beautiful park, well-maintained',
      latitude: 30.0667,
      longitude: 31.2667
    },
    {
      vibe_type: 'crowded',
      location: 'Cairo International Airport',
      notes: 'Busy terminal with many travelers',
      latitude: 30.1219,
      longitude: 31.4056
    }
  ];

  console.log('Adding sample reports...');

  for (const report of sampleReports) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert([report]);

      if (error) {
        console.error('Error adding report:', error);
      } else {
        console.log('Added report:', report.vibe_type, report.location);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  console.log('Sample reports added! Refresh the page to see them.');
}

// Run the function
addSampleReports();
