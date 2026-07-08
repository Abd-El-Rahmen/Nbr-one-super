ALTER TABLE customers ADD COLUMN wilaya VARCHAR(100);
ALTER TABLE customers ADD COLUMN commune VARCHAR(100);
ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'confirmed', 'shipped', 'rejected', 'delivered', 'failed') DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN delivery_type VARCHAR(30) DEFAULT 'home';
ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10, 2) DEFAULT 0;
