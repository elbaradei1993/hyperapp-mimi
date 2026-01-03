-- User Location Functions for HyperApp User App
-- These functions handle user location tracking and nearby user discovery

-- Drop existing functions if they exist with different signatures
DROP FUNCTION IF EXISTS find_nearby_users_for_map(double precision, double precision, double precision) CASCADE;
DROP FUNCTION IF EXISTS update_user_location(text, numeric, numeric, numeric, numeric, numeric, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS update_user_location(uuid, double precision, double precision, real, real, real, real, text) CASCADE;

-- Function to update user location in user_locations table
CREATE OR REPLACE FUNCTION update_user_location(
  p_user_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_accuracy REAL DEFAULT NULL,
  p_heading REAL DEFAULT NULL,
  p_speed REAL DEFAULT NULL,
  p_altitude REAL DEFAULT NULL,
  p_location_source TEXT DEFAULT 'gps'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- PostGIS not available, store location as NULL
  -- The admin console will need to be updated to work without PostGIS
  RAISE LOG 'Storing user location as NULL (PostGIS not available) for user %', p_user_id;

  -- Delete existing location for this user
  DELETE FROM user_locations WHERE user_id = p_user_id;

  -- Insert new location with NULL geometry
  INSERT INTO user_locations (
    user_id,
    location,
    accuracy,
    last_updated,
    created_at
  ) VALUES (
    p_user_id,
    NULL,  -- No PostGIS geometry available
    p_accuracy,
    NOW(),
    NOW()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error updating user location for user %: %', p_user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Function to find nearby users for map display
CREATE OR REPLACE FUNCTION find_nearby_users_for_map(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  user_location_lat DOUBLE PRECISION,
  user_location_lng DOUBLE PRECISION,
  distance DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if PostGIS functions are available
  BEGIN
    RETURN QUERY
    SELECT
      ul.user_id,
      ST_Y(ul.location::geometry) as user_location_lat,
      ST_X(ul.location::geometry) as user_location_lng,
      ST_Distance(
        ul.location,
        ST_GeomFromText('POINT(' || center_lng || ' ' || center_lat || ')', 4326)
      ) / 1000 as distance -- Convert meters to kilometers
    FROM user_locations ul
    WHERE ul.location IS NOT NULL
      AND ST_DWithin(
        ul.location,
        ST_GeomFromText('POINT(' || center_lng || ' ' || center_lat || ')', 4326),
        radius_km * 1000 -- Convert km to meters
      )
      AND ul.last_updated > NOW() - INTERVAL '24 hours' -- Only recent locations
    ORDER BY distance ASC;
  EXCEPTION
    WHEN undefined_function THEN
      -- PostGIS not available, return empty result set
      RAISE LOG 'PostGIS not available for find_nearby_users_for_map';
      RETURN;
  END;
END;
$$;

-- Function to get user location statistics
CREATE OR REPLACE FUNCTION get_user_location_stats(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  total_locations BIGINT,
  avg_accuracy REAL,
  last_location TIMESTAMPTZ,
  location_count_last_24h BIGINT,
  location_count_last_7d BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.user_id,
    COUNT(*) as total_locations,
    ROUND(AVG(ul.accuracy), 2) as avg_accuracy,
    MAX(ul.last_updated) as last_location,
    COUNT(CASE WHEN ul.last_updated > NOW() - INTERVAL '24 hours' THEN 1 END) as location_count_last_24h,
    COUNT(CASE WHEN ul.last_updated > NOW() - INTERVAL '7 days' THEN 1 END) as location_count_last_7d
  FROM user_locations ul
  WHERE (p_user_id IS NULL OR ul.user_id = p_user_id)
  GROUP BY ul.user_id
  ORDER BY last_location DESC;
END;
$$;
