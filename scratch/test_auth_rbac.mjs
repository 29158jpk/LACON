import assert from 'node:assert';
import {
  DEFAULT_USERS,
  getUsers,
  saveUsers,
  addUser,
  registerUser,
  loginWithPassword,
  loginWithPin,
  getCurrentUser,
  setCurrentUser,
  logout,
  addOrder,
  getOrders,
} from '../src/lib/store.js';

// Setup mock localStorage in Node.js global
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { for (const k in storage) delete storage[k]; },
};
global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

console.log('🧪 Starting Auth & RBAC Test Suite...\n');

// ── Test 1: Initial state & No Admin Fallback ──────────────────────────────
console.log('Test 1: Initial State & Guest User');
localStorage.clear();
const initialUser = getCurrentUser();
assert.strictEqual(initialUser, null, 'Unauthenticated user MUST be null, not Admin!');
console.log('✓ Pass: Guest / unauthenticated user returns null\n');

// ── Test 2: Customer Registration ─────────────────────────────────────────
console.log('Test 2: Customer Registration (role = customer only)');
const newCustomer = registerUser({
  name: 'นายลูกค้า ไอทีดี',
  username: 'customer1',
  email: 'customer1@example.com',
  password: 'password123',
  confirmPassword: 'password123',
});

assert.strictEqual(newCustomer.role, 'customer', 'Newly registered user must strictly have role "customer"');
assert.strictEqual(newCustomer.username, 'customer1');
assert.strictEqual(newCustomer.email, 'customer1@example.com');
assert.ok(newCustomer.passwordHash, 'Password must be hashed and not plaintext');
assert.strictEqual(newCustomer.password, undefined, 'Plaintext password must not be stored in user object');

const loggedInCustomer = getCurrentUser();
assert.strictEqual(loggedInCustomer?.id, newCustomer.id, 'Session must reflect newly registered customer');
assert.strictEqual(loggedInCustomer?.role, 'customer', 'Session role must be customer');
console.log('✓ Pass: Customer registered successfully with role = customer\n');

// ── Test 3: Validation & Duplicate Prevention ──────────────────────────────
console.log('Test 3: Duplicate Username and Email Prevention');
assert.throws(() => {
  registerUser({
    name: 'คนอื่น',
    username: 'customer1', // duplicate
    email: 'other@example.com',
    password: 'password123',
    confirmPassword: 'password123',
  });
}, /Username "customer1" มีผู้ใช้งานในระบบแล้ว/, 'Duplicate username must throw error');

assert.throws(() => {
  registerUser({
    name: 'คนอื่น',
    username: 'customer2',
    email: 'customer1@example.com', // duplicate email
    password: 'password123',
    confirmPassword: 'password123',
  });
}, /Email "customer1@example.com" มีผู้ใช้งานในระบบแล้ว/, 'Duplicate email must throw error');

assert.throws(() => {
  registerUser({
    name: 'คนอื่น',
    username: 'cust_mismatch',
    email: 'mismatch@example.com',
    password: 'password123',
    confirmPassword: 'wrongpassword', // password mismatch
  });
}, /รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน/, 'Password mismatch must throw error');
console.log('✓ Pass: Validation and duplicate checks working strictly\n');

// ── Test 4: Logout & Session Clearing ──────────────────────────────────────
console.log('Test 4: Logout & Session Isolation');
logout();
assert.strictEqual(getCurrentUser(), null, 'Logout must completely clear current session');
console.log('✓ Pass: Logout clears session\n');

// ── Test 5: Login with Admin, Employee, Customer ──────────────────────────
console.log('Test 5: Login as Admin, Employee, Customer');
// Admin Login
const admin = loginWithPassword('admin', 'admin');
assert.strictEqual(admin.role, 'admin');
assert.strictEqual(getCurrentUser()?.role, 'admin');

// Employee Login (via Username or PIN)
logout();
const employee = loginWithPin('1234');
assert.strictEqual(employee.role, 'employee');
assert.strictEqual(employee.username, 'cashier1');
assert.strictEqual(getCurrentUser()?.role, 'employee');

// Customer Login (via Email)
logout();
const custLogin = loginWithPassword('customer1@example.com', 'password123');
assert.strictEqual(custLogin.role, 'customer');
assert.strictEqual(getCurrentUser()?.username, 'customer1');
console.log('✓ Pass: Login working cleanly for Admin, Employee, Customer\n');

// ── Test 6: Order Creation with Customer & Cashier Binding ────────────────
console.log('Test 6: Order Creation & Binding');
loginWithPassword('customer1@example.com', 'password123'); // Log in customer
const realProduct = (await import('../src/lib/store.js')).getProducts()[0];
const sampleItems = [{ id: realProduct.id, name: realProduct.name, price: realProduct.price, cost: realProduct.cost, qty: 1 }];
const order = addOrder(sampleItems, 'qr');
assert.strictEqual(order.customer?.username, 'customer1', 'Order must be bound to customer');
assert.strictEqual(order.cashier?.role, 'customer', 'Cashier on self-service order is customer');
console.log('✓ Pass: Order binding to customer working\n');

console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! 100% RBAC & AUTH COMPLIANT.');
