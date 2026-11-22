CREATE DATABASE IF NOT EXISTS reva_wifi_mapping_db;
USE reva_wifi_mapping_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS wifi_readings;
DROP TABLE IF EXISTS access_points;
DROP TABLE IF EXISTS campus_users;
DROP TABLE IF EXISTS time_slots;
DROP TABLE IF EXISTS locations;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Campus areas / locations
CREATE TABLE locations (
    location_id INT PRIMARY KEY,
    location_name VARCHAR(100) NOT NULL UNIQUE,
    building_block VARCHAR(100) NULL,
    area_type VARCHAR(30) NOT NULL,
    CONSTRAINT chk_location_type
        CHECK (area_type IN ('Academic', 'Administrative', 'Residential', 'Student Facility', 'Auditorium'))
);

-- 2. WiFi access points. A location can have multiple access points.
-- AP codes and network labels below are simulated identifiers, not actual REVA inventory.
CREATE TABLE access_points (
    ap_id INT PRIMARY KEY,
    ap_code VARCHAR(20) NOT NULL UNIQUE,
    location_id INT NOT NULL,
    network_label VARCHAR(80) NOT NULL,
    ap_status VARCHAR(15) NOT NULL DEFAULT 'Active',
    CONSTRAINT chk_ap_status CHECK (ap_status IN ('Active', 'Inactive')),
    CONSTRAINT fk_ap_location
        FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

-- 3. People who participate in / perform WiFi experience measurements.
-- No real names, email addresses, or student IDs are stored.
CREATE TABLE campus_users (
    user_id INT PRIMARY KEY,
    participant_code VARCHAR(20) NOT NULL UNIQUE,
    user_role VARCHAR(20) NOT NULL,
    department VARCHAR(100) NOT NULL,
    CONSTRAINT chk_user_role
        CHECK (user_role IN ('Student', 'Faculty', 'Staff'))
);

-- 4. Standard measurement periods
CREATE TABLE time_slots (
    time_slot_id INT PRIMARY KEY,
    slot_name VARCHAR(30) NOT NULL UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CONSTRAINT chk_time_range CHECK (start_time < end_time)
);

-- 5. One row = one person's WiFi performance measurement through one AP.
-- Location is obtained through access_points.location_id, avoiding duplicate location data.
CREATE TABLE wifi_readings (
    reading_id INT PRIMARY KEY,
    ap_id INT NOT NULL,
    user_id INT NOT NULL,
    time_slot_id INT NOT NULL,
    signal_dbm DECIMAL(5,2) NOT NULL,
    download_mbps DECIMAL(8,2) NOT NULL,
    upload_mbps DECIMAL(8,2) NOT NULL,
    ping_ms DECIMAL(8,2) NOT NULL,
    measured_at DATETIME NOT NULL,
    CONSTRAINT chk_signal_range CHECK (signal_dbm BETWEEN -100 AND 0),
    CONSTRAINT chk_download CHECK (download_mbps >= 0),
    CONSTRAINT chk_upload CHECK (upload_mbps >= 0),
    CONSTRAINT chk_ping CHECK (ping_ms >= 0),
    CONSTRAINT fk_reading_ap
        FOREIGN KEY (ap_id) REFERENCES access_points(ap_id),
    CONSTRAINT fk_reading_user
        FOREIGN KEY (user_id) REFERENCES campus_users(user_id),
    CONSTRAINT fk_reading_slot
        FOREIGN KEY (time_slot_id) REFERENCES time_slots(time_slot_id)
);

CREATE INDEX idx_readings_ap ON wifi_readings(ap_id);
CREATE INDEX idx_readings_user ON wifi_readings(user_id);
CREATE INDEX idx_readings_time ON wifi_readings(measured_at);

-- Locations are based on facility/block names published by REVA University.
-- A NULL building_block means the official page identifies the facility but
-- does not specify a separate block for it.
INSERT INTO locations (location_id, location_name, building_block, area_type) VALUES
(1, 'Central Library', 'Central Library', 'Academic'),
(2, 'Administrative Block', 'Administrative Block', 'Administrative'),
(3, 'Sir M. Visvesvaraya Block', 'Sir M. Visvesvaraya Block', 'Academic'),
(4, 'Swami Vivekananda Block', 'Swami Vivekananda Block', 'Academic'),
(5, 'Sir C.V. Raman Block', 'Sir C.V. Raman Block', 'Academic'),
(6, 'Science Block', 'Science Block', 'Academic'),
(7, 'RBS Block', 'RBS Block', 'Academic'),
(8, 'Food Court', NULL, 'Student Facility'),
(9, 'Boys Hostel', NULL, 'Residential'),
(10, 'Girls Hostel', NULL, 'Residential'),
(11, 'Kuvempu Auditorium', 'Sir C.V. Raman Block', 'Auditorium'),
(12, 'REVA Rangasthala', 'Swami Vivekananda Block', 'Auditorium');

INSERT INTO access_points (ap_id, ap_code, location_id, network_label, ap_status) VALUES
(1, 'SIM-AP-01', 1, 'REVA-WiFi-DEMO', 'Active'),
(2, 'SIM-AP-02', 1, 'REVA-WiFi-DEMO', 'Active'),
(3, 'SIM-AP-03', 2, 'REVA-WiFi-DEMO', 'Active'),
(4, 'SIM-AP-04', 3, 'REVA-WiFi-DEMO', 'Active'),
(5, 'SIM-AP-05', 3, 'REVA-WiFi-DEMO', 'Active'),
(6, 'SIM-AP-06', 4, 'REVA-WiFi-DEMO', 'Active'),
(7, 'SIM-AP-07', 5, 'REVA-WiFi-DEMO', 'Active'),
(8, 'SIM-AP-08', 5, 'REVA-WiFi-DEMO', 'Active'),
(9, 'SIM-AP-09', 6, 'REVA-WiFi-DEMO', 'Active'),
(10, 'SIM-AP-10', 7, 'REVA-WiFi-DEMO', 'Active'),
(11, 'SIM-AP-11', 8, 'REVA-WiFi-DEMO', 'Active'),
(12, 'SIM-AP-12', 9, 'REVA-WiFi-DEMO', 'Active'),
(13, 'SIM-AP-13', 10, 'REVA-WiFi-DEMO', 'Active'),
(14, 'SIM-AP-14', 11, 'REVA-WiFi-DEMO', 'Active'),
(15, 'SIM-AP-15', 12, 'REVA-WiFi-DEMO', 'Active');

INSERT INTO campus_users (user_id, participant_code, user_role, department) VALUES
(1, 'PART-001', 'Student', 'School of Computing and Information Technology'),
(2, 'PART-002', 'Student', 'School of Computer Science and Applications'),
(3, 'PART-003', 'Student', 'School of Electronics and Communication Engineering'),
(4, 'PART-004', 'Student', 'School of Electrical and Electronics Engineering'),
(5, 'PART-005', 'Student', 'School of Mechanical Engineering'),
(6, 'PART-006', 'Student', 'School of Civil Engineering'),
(7, 'PART-007', 'Student', 'School of Applied Sciences'),
(8, 'PART-008', 'Student', 'School of Commerce'),
(9, 'PART-009', 'Faculty', 'School of Computing and Information Technology'),
(10, 'PART-010', 'Faculty', 'School of Applied Sciences'),
(11, 'PART-011', 'Staff', 'Administration'),
(12, 'PART-012', 'Staff', 'Information Technology Services');

INSERT INTO time_slots (time_slot_id, slot_name, start_time, end_time) VALUES
(1, 'Morning', '08:00:00', '11:59:59'),
(2, 'Afternoon', '12:00:00', '15:59:59'),
(3, 'Evening', '16:00:00', '19:59:59');


-- 120 simulated WiFi experience measurements (10 per campus area)
INSERT INTO wifi_readings (reading_id, ap_id, user_id, time_slot_id, signal_dbm, download_mbps, upload_mbps, ping_ms, measured_at) VALUES
(1, 1, 11, 1, -49.85, 46.50, 11.44, 17.13, '2026-11-18 09:00:00'),
(2, 2, 6, 2, -48.01, 85.60, 33.74, 14.00, '2026-11-18 13:15:00'),
(3, 1, 1, 3, -53.98, 46.79, 10.88, 23.62, '2026-11-18 17:30:00'),
(4, 2, 8, 1, -61.50, 56.93, 19.13, 24.53, '2026-11-19 09:45:00'),
(5, 1, 3, 2, -57.81, 80.36, 30.08, 12.15, '2026-11-19 13:00:00'),
(6, 2, 10, 3, -46.69, 86.89, 22.74, 15.58, '2026-11-19 17:15:00'),
(7, 1, 5, 1, -43.81, 65.20, 13.19, 14.22, '2026-11-20 09:30:00'),
(8, 2, 12, 2, -45.90, 81.22, 30.35, 28.78, '2026-11-20 13:45:00'),
(9, 1, 7, 3, -51.81, 103.39, 28.00, 24.70, '2026-11-20 17:00:00'),
(10, 2, 2, 1, -46.24, 82.11, 31.76, 25.28, '2026-11-18 09:15:00'),
(11, 3, 12, 1, -50.91, 37.52, 8.81, 22.23, '2026-11-18 09:00:00'),
(12, 3, 7, 2, -63.40, 47.80, 9.76, 21.95, '2026-11-18 13:15:00'),
(13, 3, 2, 3, -52.29, 55.07, 14.81, 20.24, '2026-11-18 17:30:00'),
(14, 3, 9, 1, -59.66, 86.52, 29.03, 30.23, '2026-11-19 09:45:00'),
(15, 3, 4, 2, -61.58, 75.10, 16.46, 24.49, '2026-11-19 13:00:00'),
(16, 3, 11, 3, -45.21, 70.20, 22.02, 32.12, '2026-11-19 17:15:00'),
(17, 3, 6, 1, -48.14, 77.68, 18.25, 15.80, '2026-11-20 09:30:00'),
(18, 3, 1, 2, -58.69, 49.73, 11.47, 38.57, '2026-11-20 13:45:00'),
(19, 3, 8, 3, -47.47, 52.31, 17.64, 24.89, '2026-11-20 17:00:00'),
(20, 3, 3, 1, -46.71, 60.24, 14.67, 21.17, '2026-11-18 09:15:00'),
(21, 4, 1, 1, -58.53, 39.45, 12.64, 44.93, '2026-11-18 09:00:00'),
(22, 5, 8, 2, -62.41, 37.06, 15.54, 33.29, '2026-11-18 13:15:00'),
(23, 4, 3, 3, -69.82, 27.59, 5.69, 36.82, '2026-11-18 17:30:00'),
(24, 5, 10, 1, -52.99, 48.22, 9.41, 29.45, '2026-11-19 09:45:00'),
(25, 4, 5, 2, -48.09, 54.10, 22.35, 43.82, '2026-11-19 13:00:00'),
(26, 5, 12, 3, -71.72, 64.64, 22.21, 34.11, '2026-11-19 17:15:00'),
(27, 4, 7, 1, -65.60, 60.25, 12.46, 31.04, '2026-11-20 09:30:00'),
(28, 5, 2, 2, -61.11, 77.46, 30.23, 25.90, '2026-11-20 13:45:00'),
(29, 4, 9, 3, -59.99, 34.83, 13.90, 44.12, '2026-11-20 17:00:00'),
(30, 5, 4, 1, -64.84, 60.14, 19.61, 22.59, '2026-11-18 09:15:00'),
(31, 6, 2, 1, -57.70, 48.74, 17.88, 38.56, '2026-11-18 09:00:00'),
(32, 6, 9, 2, -75.99, 36.48, 6.74, 52.52, '2026-11-18 13:15:00'),
(33, 6, 4, 3, -54.91, 65.40, 16.60, 22.03, '2026-11-18 17:30:00'),
(34, 6, 11, 1, -54.93, 71.98, 14.44, 37.01, '2026-11-19 09:45:00'),
(35, 6, 6, 2, -74.34, 61.35, 22.32, 24.49, '2026-11-19 13:00:00'),
(36, 6, 1, 3, -64.59, 49.34, 12.02, 50.54, '2026-11-19 17:15:00'),
(37, 6, 8, 1, -65.84, 30.07, 9.30, 45.55, '2026-11-20 09:30:00'),
(38, 6, 3, 2, -71.17, 35.77, 14.98, 42.75, '2026-11-20 13:45:00'),
(39, 6, 10, 3, -65.49, 47.50, 9.93, 27.86, '2026-11-20 17:00:00'),
(40, 6, 5, 1, -67.89, 51.53, 12.12, 27.71, '2026-11-18 09:15:00'),
(41, 7, 3, 1, -68.23, 72.87, 17.12, 39.35, '2026-11-18 09:00:00'),
(42, 8, 10, 2, -48.51, 39.25, 9.31, 32.73, '2026-11-18 13:15:00'),
(43, 7, 5, 3, -64.64, 42.94, 17.37, 29.99, '2026-11-18 17:30:00'),
(44, 8, 12, 1, -58.18, 82.08, 30.68, 19.33, '2026-11-19 09:45:00'),
(45, 7, 7, 2, -67.58, 60.86, 17.14, 27.08, '2026-11-19 13:00:00'),
(46, 8, 2, 3, -51.77, 75.40, 31.38, 16.76, '2026-11-19 17:15:00'),
(47, 7, 9, 1, -59.93, 55.36, 21.41, 20.96, '2026-11-20 09:30:00'),
(48, 8, 4, 2, -65.24, 61.92, 17.42, 21.80, '2026-11-20 13:45:00'),
(49, 7, 11, 3, -63.75, 90.40, 25.89, 38.12, '2026-11-20 17:00:00'),
(50, 8, 6, 1, -56.24, 38.04, 15.97, 37.41, '2026-11-18 09:15:00'),
(51, 9, 4, 1, -50.71, 80.58, 30.92, 22.16, '2026-11-18 09:00:00'),
(52, 9, 11, 2, -61.83, 37.82, 10.45, 18.82, '2026-11-18 13:15:00'),
(53, 9, 6, 3, -64.28, 84.12, 20.50, 41.31, '2026-11-18 17:30:00'),
(54, 9, 1, 1, -62.53, 50.38, 20.64, 47.86, '2026-11-19 09:45:00'),
(55, 9, 8, 2, -60.22, 68.10, 14.79, 26.20, '2026-11-19 13:00:00'),
(56, 9, 3, 3, -50.72, 59.75, 18.53, 40.19, '2026-11-19 17:15:00'),
(57, 9, 10, 1, -71.69, 60.05, 18.06, 43.43, '2026-11-20 09:30:00'),
(58, 9, 5, 2, -69.38, 82.65, 16.47, 22.76, '2026-11-20 13:45:00'),
(59, 9, 12, 3, -59.31, 65.51, 15.49, 20.72, '2026-11-20 17:00:00'),
(60, 9, 7, 1, -52.52, 39.77, 12.83, 36.20, '2026-11-18 09:15:00'),
(61, 10, 5, 1, -60.78, 65.02, 19.86, 43.04, '2026-11-18 09:00:00'),
(62, 10, 12, 2, -65.51, 72.97, 17.31, 26.87, '2026-11-18 13:15:00'),
(63, 10, 7, 3, -55.22, 48.00, 12.28, 37.56, '2026-11-18 17:30:00'),
(64, 10, 2, 1, -68.40, 57.50, 24.13, 44.88, '2026-11-19 09:45:00'),
(65, 10, 9, 2, -68.39, 42.79, 10.43, 43.00, '2026-11-19 13:00:00'),
(66, 10, 4, 3, -50.62, 82.76, 22.24, 19.73, '2026-11-19 17:15:00'),
(67, 10, 11, 1, -51.66, 72.21, 23.60, 44.62, '2026-11-20 09:30:00'),
(68, 10, 6, 2, -55.61, 30.47, 11.46, 23.98, '2026-11-20 13:45:00'),
(69, 10, 1, 3, -55.41, 86.34, 18.32, 18.46, '2026-11-20 17:00:00'),
(70, 10, 8, 1, -67.65, 63.19, 15.50, 33.14, '2026-11-18 09:15:00'),
(71, 11, 6, 1, -70.65, 11.72, 3.89, 55.69, '2026-11-18 09:00:00'),
(72, 11, 1, 2, -75.23, 34.88, 13.36, 44.18, '2026-11-18 13:15:00'),
(73, 11, 8, 3, -76.53, 14.13, 2.56, 89.66, '2026-11-18 17:30:00'),
(74, 11, 3, 1, -72.26, 13.64, 4.88, 74.96, '2026-11-19 09:45:00'),
(75, 11, 10, 2, -76.45, 5.32, 1.05, 97.17, '2026-11-19 13:00:00'),
(76, 11, 5, 3, -66.92, 23.00, 8.75, 77.03, '2026-11-19 17:15:00'),
(77, 11, 12, 1, -82.04, 9.21, 2.34, 98.23, '2026-11-20 09:30:00'),
(78, 11, 7, 2, -69.08, 33.40, 13.22, 52.08, '2026-11-20 13:45:00'),
(79, 11, 2, 3, -80.01, 8.39, 3.08, 97.24, '2026-11-20 17:00:00'),
(80, 11, 9, 1, -76.87, 25.48, 5.53, 100.30, '2026-11-18 09:15:00'),
(81, 12, 7, 1, -58.11, 58.86, 22.05, 69.07, '2026-11-18 09:00:00'),
(82, 12, 2, 2, -77.43, 47.36, 12.30, 71.54, '2026-11-18 13:15:00'),
(83, 12, 9, 3, -59.55, 53.48, 20.03, 38.34, '2026-11-18 17:30:00'),
(84, 12, 4, 1, -59.89, 17.19, 6.69, 67.93, '2026-11-19 09:45:00'),
(85, 12, 11, 2, -72.88, 51.20, 14.87, 40.26, '2026-11-19 13:00:00'),
(86, 12, 6, 3, -59.71, 22.92, 4.26, 34.66, '2026-11-19 17:15:00'),
(87, 12, 1, 1, -70.45, 53.49, 22.04, 38.96, '2026-11-20 09:30:00'),
(88, 12, 8, 2, -63.25, 31.18, 12.95, 51.81, '2026-11-20 13:45:00'),
(89, 12, 3, 3, -56.40, 17.54, 7.24, 33.93, '2026-11-20 17:00:00'),
(90, 12, 10, 1, -55.86, 24.74, 5.10, 46.73, '2026-11-18 09:15:00'),
(91, 13, 8, 1, -61.79, 25.06, 8.16, 53.13, '2026-11-18 09:00:00'),
(92, 13, 3, 2, -70.37, 37.68, 9.09, 63.98, '2026-11-18 13:15:00'),
(93, 13, 10, 3, -79.96, 54.43, 16.83, 64.57, '2026-11-18 17:30:00'),
(94, 13, 5, 1, -61.45, 42.19, 11.28, 28.85, '2026-11-19 09:45:00'),
(95, 13, 12, 2, -63.39, 25.85, 6.60, 71.64, '2026-11-19 13:00:00'),
(96, 13, 7, 3, -62.01, 24.42, 6.21, 47.46, '2026-11-19 17:15:00'),
(97, 13, 2, 1, -69.94, 24.19, 5.09, 48.12, '2026-11-20 09:30:00'),
(98, 13, 9, 2, -56.49, 42.51, 16.86, 58.85, '2026-11-20 13:45:00'),
(99, 13, 4, 3, -72.48, 36.30, 6.54, 40.78, '2026-11-20 17:00:00'),
(100, 13, 11, 1, -69.25, 37.84, 12.76, 50.57, '2026-11-18 09:15:00'),
(101, 14, 9, 1, -64.83, 29.11, 8.55, 60.55, '2026-11-18 09:00:00'),
(102, 14, 4, 2, -56.69, 26.82, 5.37, 43.20, '2026-11-18 13:15:00'),
(103, 14, 11, 3, -60.44, 35.43, 13.34, 53.80, '2026-11-18 17:30:00'),
(104, 14, 6, 1, -59.53, 29.68, 6.76, 21.10, '2026-11-19 09:45:00'),
(105, 14, 1, 2, -69.37, 42.71, 16.40, 23.28, '2026-11-19 13:00:00'),
(106, 14, 8, 3, -65.47, 50.75, 11.50, 51.34, '2026-11-19 17:15:00'),
(107, 14, 3, 1, -63.63, 30.69, 10.36, 20.25, '2026-11-20 09:30:00'),
(108, 14, 10, 2, -57.73, 58.04, 11.93, 39.13, '2026-11-20 13:45:00'),
(109, 14, 5, 3, -70.95, 67.81, 20.64, 22.26, '2026-11-20 17:00:00'),
(110, 14, 12, 1, -69.27, 62.11, 17.98, 56.06, '2026-11-18 09:15:00'),
(111, 15, 10, 1, -70.64, 41.54, 13.41, 111.25, '2026-11-18 09:00:00'),
(112, 15, 5, 2, -64.82, 27.28, 9.62, 77.86, '2026-11-18 13:15:00'),
(113, 15, 12, 3, -66.41, 24.82, 9.81, 95.77, '2026-11-18 17:30:00'),
(114, 15, 7, 1, -75.66, 13.85, 3.31, 87.82, '2026-11-19 09:45:00'),
(115, 15, 2, 2, -68.09, 23.81, 7.87, 60.59, '2026-11-19 13:00:00'),
(116, 15, 9, 3, -85.99, 14.86, 3.64, 63.98, '2026-11-19 17:15:00'),
(117, 15, 4, 1, -73.96, 9.26, 2.18, 92.05, '2026-11-20 09:30:00'),
(118, 15, 11, 2, -69.63, 6.44, 1.79, 80.70, '2026-11-20 13:45:00'),
(119, 15, 6, 3, -77.19, 11.86, 3.33, 107.86, '2026-11-20 17:00:00'),
(120, 15, 1, 1, -72.81, 30.43, 11.73, 97.42, '2026-11-18 09:15:00');

-- VIEW: Complete Wi-Fi reading details
-- Purpose: Display each person's Wi-Fi experience with AP and location details.

CREATE OR REPLACE VIEW vw_wifi_reading_details AS
SELECT
    w.reading_id,
    u.participant_code,
    u.user_role,
    u.department,
    a.ap_code,
    l.location_name,
    t.slot_name,
    w.signal_dbm,
    w.download_mbps,
    w.upload_mbps,
    w.ping_ms,
    w.measured_at
FROM wifi_readings w
JOIN campus_users u
    ON w.user_id = u.user_id
JOIN access_points a
    ON w.ap_id = a.ap_id
JOIN locations l
    ON a.location_id = l.location_id
JOIN time_slots t
    ON w.time_slot_id = t.time_slot_id;
    
-- REVA University Campus WiFi Signal Mapping System
-- REDESIGNED DEMONSTRATION DATABASE
-- IMPORTANT: All participant codes, access points, network labels, and WiFi readings
-- in this file are fictional/simulated for coursework. They are NOT actual REVA
-- user records, access-point inventory, SSIDs, or measured network results.
--
-- This script creates a NEW database so your existing campus_wifi_db is not changed.
-- Review and run this script only after keeping a backup of your existing work.


