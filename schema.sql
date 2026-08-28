-- Create Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Clear existing data if re-running
TRUNCATE TABLE products;

-- Insert 15 Premium Unique Products
INSERT INTO products (name, category, price, image_url, stock) VALUES
('MSI GeForce RTX 4090 Suprim X 24G', 'Computer Parts', 12999.00, '/images/msi_rtx_4090.png', 5),
('ASUS ROG Strix GeForce RTX 4080 16GB', 'Computer Parts', 13950.00, '/images/gpu.png', 10),
('Ryzen 9 9950X3D Desktop Processor', 'Computer Parts', 23999.00, 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=400&q=80', 15),
('AMD Ryzen 9 7950X3D Gaming Processor', 'Computer Parts', 21999.00, 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=400&q=80', 8),
('Corsair Dominator Titanium RGB 64GB DDR5', 'Computer Parts', 49999.00, 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=400&q=80', 20),
('NZXT H9 Elite Dual-Chamber ATX - White', 'Cases', 239.99, 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=400&q=80', 12),
('Lian Li O11 Dynamic EVO XL - Black', 'Cases', 244.99, 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80', 7),
('ASUS ROG Swift OLED PG27AQDM 27"', 'Monitors', 999.99, '/images/monitor.png', 6),
('Alienware AW3423DWF 34" QD-OLED', 'Monitors', 1099.99, 'https://images.unsplash.com/photo-1542393545-10f5cde2c810?auto=format&fit=crop&w=400&q=80', 4),
('Secretlab TITAN Evo 2024 - Stealth', 'Gaming Chairs', 549.00, '/images/chair.png', 14),
('TTRacing Swift X 2020 Gaming Chair', 'Gaming Chairs', 1299.00, 'https://ttracing.co.th/cdn/shop/products/Swift_Stealth_Product.png', 2),
('Logitech G Pro X Superlight 2', 'Accessories', 159.00, '/images/mouse.png', 35),
('Razer Huntsman V3 Pro TKL', 'Accessories', 219.99, 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=400&q=80', 18),
('SteelSeries Arctis Nova Pro Wireless', 'Audio', 349.99, 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=400&q=80', 22),
('RGB Carbon Fiber Gaming Desk 160cm', 'Desks', 299.99, '/images/desk.png', 10);
