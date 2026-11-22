USE reva_wifi_mapping_db;

-- Query 1. Display campus locations and their Wi-Fi access points
-- Purpose: Find which Wi-Fi access points are installed at each campus location.
-- SQL concept: INNER JOIN

SELECT
    l.location_name,
    l.building_block,
    a.ap_code,
    a.network_label,
    a.ap_status
FROM locations l
JOIN access_points a
    ON l.location_id = a.location_id
ORDER BY l.location_name;

-- Query 2. Display complete Wi-Fi reading details
-- SQL concept: VIEW, ORDER BY

SELECT *
FROM vw_wifi_reading_details
ORDER BY measured_at;


-- Query 3. Find Wi-Fi activity in each campus location
-- Purpose: Identify which locations have the highest number of recorded Wi-Fi readings.
-- SQL concept: JOIN, GROUP BY, COUNT

SELECT
    l.location_name,
    COUNT(w.reading_id) AS total_readings
FROM locations l
JOIN access_points a
    ON l.location_id = a.location_id
JOIN wifi_readings w
    ON a.ap_id = w.ap_id
GROUP BY l.location_id, l.location_name
ORDER BY total_readings DESC;


-- Query 4. Analyze Wi-Fi usage by user role
-- Purpose: Compare Wi-Fi activity among students, faculty and other user roles present in the dataset.
-- SQL concept: GROUP BY, COUNT, DISTINCT

SELECT
    u.user_role,
    COUNT(w.reading_id) AS total_readings,
    COUNT(DISTINCT u.user_id) AS unique_people
FROM campus_users u
LEFT JOIN wifi_readings w
    ON u.user_id = w.user_id
GROUP BY u.user_role
ORDER BY total_readings DESC;


-- Query 5. Analyze Wi-Fi activity during different time slots
-- Purpose: Find which time period has the highest Wi-Fi activity.
-- SQL concept: LEFT JOIN, GROUP BY, COUNT, DISTINCT

SELECT
    t.slot_name,
    COUNT(w.reading_id) AS total_readings,
    COUNT(DISTINCT w.user_id) AS unique_people
FROM time_slots t
LEFT JOIN wifi_readings w
    ON t.time_slot_id = w.time_slot_id
GROUP BY t.time_slot_id, t.slot_name
ORDER BY total_readings DESC;


-- Query 6. Calculate average Wi-Fi signal strength by location
-- Purpose: Compare signal strength across campus locations.
-- SQL concept: AVG, GROUP BY, ORDER BY

SELECT
    l.location_name,
    ROUND(AVG(w.signal_dbm), 2) AS average_signal_dbm
FROM locations l
JOIN access_points a
    ON l.location_id = a.location_id
JOIN wifi_readings w
    ON a.ap_id = w.ap_id
GROUP BY l.location_id, l.location_name
ORDER BY average_signal_dbm DESC;


-- Query 7 – Classify Wi-Fi signal quality with complete details
-- Purpose: Identify the Wi-Fi signal quality experienced by each person at a particular campus location.
-- SQL concept: CASE statement


SELECT
    w.reading_id,
    u.participant_code,
    u.user_role,
    l.location_name,
    a.ap_code,
    w.signal_dbm,
    CASE
        WHEN w.signal_dbm >= -50 THEN 'Excellent'
        WHEN w.signal_dbm >= -67 THEN 'Good'
        WHEN w.signal_dbm >= -75 THEN 'Fair'
        ELSE 'Poor'
    END AS signal_quality
FROM wifi_readings w
JOIN campus_users u
    ON w.user_id = u.user_id
JOIN access_points a
    ON w.ap_id = a.ap_id
JOIN locations l
    ON a.location_id = l.location_id
ORDER BY w.signal_dbm DESC;



-- Query 8. Identify people experiencing weak Wi-Fi signals
-- Purpose: Find individual readings where the Wi-Fi signal is below -75 dBm.

-- SQL concept: WHERE, JOIN, ORDER BY
SELECT
    u.participant_code,
    a.ap_code,
    l.location_name,
    w.signal_dbm,
    w.measured_at
FROM wifi_readings w
JOIN campus_users u
    ON w.user_id = u.user_id
JOIN access_points a
    ON w.ap_id = a.ap_id
JOIN locations l
    ON a.location_id = l.location_id
WHERE w.signal_dbm < -75
ORDER BY w.signal_dbm ASC;



-- Query 9. Compare download and upload speeds across locations
-- Purpose: Find locations with better internet speed performance.

-- SQL concept: AVG, GROUP BY, ORDER BY
SELECT
    l.location_name,
    ROUND(AVG(w.download_mbps), 2) AS avg_download_mbps,
    ROUND(AVG(w.upload_mbps), 2) AS avg_upload_mbps
FROM locations l
JOIN access_points a
    ON l.location_id = a.location_id
JOIN wifi_readings w
    ON a.ap_id = w.ap_id
GROUP BY l.location_id, l.location_name
ORDER BY avg_download_mbps DESC;



-- Query 10. Rank Wi-Fi access points by signal strength
-- Purpose: Identify the best-performing and weakest access points based on average signal strength.

-- SQL concept: JOIN, AVG, GROUP BY, ORDER BY
SELECT
    a.ap_code,
    a.network_label,
    l.location_name,
    ROUND(AVG(w.signal_dbm), 2) AS avg_signal_dbm,
    ROUND(AVG(w.download_mbps), 2) AS avg_download_mbps
FROM access_points a
JOIN locations l
    ON a.location_id = l.location_id
JOIN wifi_readings w
    ON a.ap_id = w.ap_id
GROUP BY
    a.ap_id,
    a.ap_code,
    a.network_label,
    l.location_name
ORDER BY avg_signal_dbm DESC;


-- Query 11. Identify access points with high network latency
-- Purpose: Find access points whose average ping is greater than 50 milliseconds.

-- SQL concept: GROUP BY, AVG, HAVING
SELECT
    a.ap_code,
    l.location_name,
    ROUND(AVG(w.ping_ms), 2) AS avg_latency_ms
FROM access_points a
JOIN locations l
    ON a.location_id = l.location_id
JOIN wifi_readings w
    ON a.ap_id = w.ap_id
GROUP BY a.ap_id, a.ap_code, l.location_name
HAVING AVG(w.ping_ms) > 50
ORDER BY avg_latency_ms DESC;


-- Query 12. Find readings with download speed below the campus average
-- Purpose: Identify Wi-Fi readings where download speed is lower than the overall average download speed.

-- SQL concept: Subquery, AVG, WHERE
SELECT
    w.reading_id,
    u.participant_code,
    a.ap_code,
    l.location_name,
    w.download_mbps
FROM wifi_readings w
JOIN campus_users u
    ON w.user_id = u.user_id
JOIN access_points a
    ON w.ap_id = a.ap_id
JOIN locations l
    ON a.location_id = l.location_id
WHERE w.download_mbps < (
    SELECT AVG(download_mbps)
    FROM wifi_readings
)
ORDER BY w.download_mbps ASC;