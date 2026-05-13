import { v4 as uuidv4 } from 'uuid';

// UUID fallback using crypto.randomUUID if available
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return uuidv4();
}

// Format currency in INR
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Format relative time
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Get greeting based on time
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Clamp number
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Get priority color class
export function getPriorityColor(priority) {
  const map = {
    low: 'text-blue-400 bg-blue-400/10',
    medium: 'text-amber-400 bg-amber-400/10',
    high: 'text-red-400 bg-red-400/10',
    urgent: 'text-pink-400 bg-pink-400/10',
  };
  return map[priority] || 'text-gray-400 bg-gray-400/10';
}

// Get status color class for leads
export function getLeadStatusColor(status) {
  const map = {
    lead: 'text-indigo-400 bg-indigo-400/10',
    contacted: 'text-blue-400 bg-blue-400/10',
    demo: 'text-amber-400 bg-amber-400/10',
    negotiation: 'text-red-400 bg-red-400/10',
    closed: 'text-accent bg-accent/10',
  };
  return map[status] || 'text-gray-400 bg-gray-400/10';
}

// Get order status color
export function getOrderStatusColor(status) {
  const map = {
    pending: 'text-amber-400 bg-amber-400/10',
    'in-progress': 'text-blue-400 bg-blue-400/10',
    shipped: 'text-purple-400 bg-purple-400/10',
    delivered: 'text-accent bg-accent/10',
  };
  return map[status] || 'text-gray-400 bg-gray-400/10';
}

// Truncate text
export function truncate(str, len = 80) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

// Is deadline overdue
export function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// Sort items
export function sortBy(arr, key, dir = 'asc') {
  return [...arr].sort((a, b) => {
    if (a[key] < b[key]) return dir === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}
