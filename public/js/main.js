// Simple frontend JavaScript for enhancements
console.log('Farmer Direct Market loaded');

// Add smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';

// Auto-hide alerts after 5 seconds
document.addEventListener('DOMContentLoaded', () => {
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.5s';
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  });
});

// Confirm before deleting
document.querySelectorAll('form[method="POST"]').forEach(form => {
  if (form.action.includes('delete') || form.querySelector('button[type="submit"]')?.textContent.includes('Delete')) {
    form.addEventListener('submit', (e) => {
      if (!confirm('Are you sure you want to delete this?')) {
        e.preventDefault();
      }
    });
  }
});
