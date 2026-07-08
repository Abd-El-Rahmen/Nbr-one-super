ALTER TABLE inventory_logs ADD COLUMN product_id INT;
ALTER TABLE inventory_logs MODIFY COLUMN variant_id INT NULL;
ALTER TABLE inventory_logs ADD CONSTRAINT fk_inv_logs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
