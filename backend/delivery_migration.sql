USE ecommerce_supermarket;

CREATE TABLE IF NOT EXISTS delivery_pricing (
  tier_id VARCHAR(50) PRIMARY KEY,
  tier_name VARCHAR(100) NOT NULL,
  home_fee DECIMAL(10,2) NOT NULL DEFAULT 600,
  stop_desk_fee DECIMAL(10,2) NOT NULL DEFAULT 400
);

INSERT IGNORE INTO delivery_pricing (tier_id, tier_name, home_fee, stop_desk_fee) VALUES
('local', 'العاصمة', 300, 200),
('north', 'ولايات الشمال', 500, 350),
('center', 'ولايات الهضاب', 600, 400),
('south1', 'جنوب 1', 800, 550),
('south2', 'الجنوب الكبير', 1000, 700);

ALTER TABLE orders 
ADD COLUMN delivery_type ENUM('home', 'stop_desk') DEFAULT 'home' AFTER status,
ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0 AFTER delivery_type;

ALTER TABLE customers
ADD COLUMN wilaya VARCHAR(100) DEFAULT NULL AFTER address_line,
ADD COLUMN commune VARCHAR(100) DEFAULT NULL AFTER wilaya;
