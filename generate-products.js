const fs = require('fs');

const generateProducts = () => {
  const products = [];
  let idCounter = 1;

  // Helpers
  const addProducts = (category, names, priceRange, image) => {
    names.forEach(name => {
      const price = (Math.random() * (priceRange[1] - priceRange[0]) + priceRange[0]).toFixed(2);
      products.push({
        id: String(idCounter++),
        name,
        category,
        price: parseFloat(price),
        image_url: image
      });
    });
  };

  // 1. Computers (30)
  const computerNames = [];
  for (let i = 1; i <= 15; i++) computerNames.push(`Horizon Pre-built Gaming PC V${i} (RTX 40${70 + (i%3)*10}, i${7 + (i%2)*2})`);
  for (let i = 1; i <= 15; i++) computerNames.push(`Horizon Pro Laptop Gen${i} (16GB RAM, 1TB SSD)`);
  addProducts('Computers', computerNames, [899.99, 2999.99], '/images/gpu.png'); // using gpu image as placeholder

  // 2. Graphics Cards (40)
  const gpuNames = [];
  const gpuBrands = ['NVIDIA RTX', 'AMD Radeon RX'];
  const gpuSeries = ['3060', '3070', '3080', '4060', '4070', '4080', '4090', '7600', '7800 XT', '7900 XTX'];
  const gpuEditions = ['OC Edition', 'Gaming X', 'Supreme', 'Dual', 'TUF', 'ROG Strix'];
  for (let i = 0; i < 40; i++) {
    const brand = gpuBrands[Math.floor(Math.random() * gpuBrands.length)];
    const series = gpuSeries[Math.floor(Math.random() * gpuSeries.length)];
    const edition = gpuEditions[Math.floor(Math.random() * gpuEditions.length)];
    gpuNames.push(`${brand} ${series} ${edition} ${Math.floor(Math.random() * 12 + 8)}GB`);
  }
  addProducts('Computer Parts', gpuNames, [299.99, 1999.99], '/images/gpu.png');

  // 3. RAM & CPUs (40)
  const partNames = [];
  for (let i = 1; i <= 20; i++) partNames.push(`Corsair Vengeance RGB Pro ${16 * (i%4 + 1)}GB (2x${8 * (i%4 + 1)}GB) DDR${4 + (i%2)} ${3200 + (i*100)}MHz`);
  for (let i = 1; i <= 10; i++) partNames.push(`Intel Core i${5 + (i%3)*2}-13${600 + (i%4)*100}K Desktop Processor`);
  for (let i = 1; i <= 10; i++) partNames.push(`AMD Ryzen ${5 + (i%3)*2} 7${600 + (i%4)*100}X Processor`);
  addProducts('Computer Parts', partNames, [89.99, 599.99], '/images/gpu.png'); // placeholder

  // 4. Cases (White, Black, Gray) (30)
  const caseNames = [];
  const caseColors = ['White', 'Black', 'Gray'];
  const caseTypes = ['Mid-Tower', 'Full-Tower', 'Mini-ITX'];
  for (let i = 0; i < 30; i++) {
    const color = caseColors[Math.floor(Math.random() * caseColors.length)];
    const type = caseTypes[Math.floor(Math.random() * caseTypes.length)];
    caseNames.push(`Horizon ${type} Gaming Case - ${color} Edition w/ Tempered Glass`);
  }
  addProducts('Cases', caseNames, [69.99, 249.99], '/images/desk.png'); // placeholder

  // 5. Audio (Headphones & Mics) (30)
  const audioNames = [];
  for (let i = 1; i <= 15; i++) audioNames.push(`HyperX Cloud V${i} Wireless Gaming Headset`);
  for (let i = 1; i <= 15; i++) audioNames.push(`Blue Yeti Pro USB Microphone Edition ${i}`);
  addProducts('Audio', audioNames, [49.99, 199.99], '/images/mouse.png'); // placeholder

  // 6. Monitors, Chairs, Desks, Accessories (40)
  const otherNames = [];
  for (let i = 1; i <= 10; i++) otherNames.push(`UltraWide Gaming Monitor ${24 + i*2}" 144Hz`);
  addProducts('Monitors', otherNames.splice(0, 10), [199.99, 899.99], '/images/monitor.png');
  
  for (let i = 1; i <= 10; i++) otherNames.push(`ErgoPro Gaming Chair Series ${i}`);
  addProducts('Gaming Chairs', otherNames.splice(0, 10), [149.99, 499.99], '/images/chair.png');

  for (let i = 1; i <= 10; i++) otherNames.push(`RGB Carbon Fiber Desk ${100 + i*10}cm`);
  addProducts('Desks', otherNames.splice(0, 10), [129.99, 399.99], '/images/desk.png');

  for (let i = 1; i <= 10; i++) otherNames.push(`Precision Wireless Gaming Mouse v${i}`);
  addProducts('Accessories', otherNames.splice(0, 10), [39.99, 129.99], '/images/mouse.png');

  return products;
};

const products = generateProducts();

// 1. Write to JSON for local mock
fs.writeFileSync('./src/data/products.json', JSON.stringify(products, null, 2));

// 2. Write to schema.sql for Supabase
let sql = `-- Create Products table
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

-- Insert 200+ dummy data items
INSERT INTO products (name, category, price, image_url, stock) VALUES
`;

const values = products.map(p => `('${p.name.replace(/'/g, "''")}', '${p.category}', ${p.price}, '${p.image_url}', ${Math.floor(Math.random() * 50) + 1})`);
sql += values.join(',\n') + ';\n';

fs.writeFileSync('./schema.sql', sql);

console.log(`Generated ${products.length} products successfully!`);
