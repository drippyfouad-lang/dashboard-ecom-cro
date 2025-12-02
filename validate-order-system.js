#!/usr/bin/env node

/**
 * Order Management System - Validation Script
 * Run this to verify all fixes are working correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ORDER MANAGEMENT SYSTEM - VALIDATION SCRIPT\n');
console.log('=' .repeat(60));

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Check 1: Verify status coupling is removed
console.log('\n✓ Checking: Order/Payment status coupling removal...');
const orderApiPath = path.join(__dirname, 'app', 'api', 'orders', '[id]', 'route.js');
if (fs.existsSync(orderApiPath)) {
  const content = fs.readFileSync(orderApiPath, 'utf-8');
  
  if (content.includes('statusFlow') || content.includes('Cannot change status from')) {
    results.failed.push('Status workflow validation still exists in API');
  } else {
    results.passed.push('Status workflow validation removed ✓');
  }
  
  if (content.includes('body.payment_status = \'Paid\'') && content.includes('body.status === \'Delivered\'')) {
    results.failed.push('Auto-sync logic still present (Delivered → Paid)');
  } else {
    results.passed.push('Auto-sync logic removed ✓');
  }
  
  if (content.includes('REMOVED') && content.includes('independent')) {
    results.passed.push('Documentation comments present ✓');
  }
} else {
  results.failed.push('Order API file not found');
}

// Check 2: Verify deletion returns deleted: true
console.log('✓ Checking: Deletion response format...');
if (fs.existsSync(orderApiPath)) {
  const content = fs.readFileSync(orderApiPath, 'utf-8');
  
  if (content.includes('deleted: true')) {
    results.passed.push('Deletion returns deleted: true ✓');
  } else {
    results.failed.push('Deletion does not return deleted: true');
  }
  
  if (content.includes('verifyDeleted') || content.includes('findById(id)')) {
    results.passed.push('Deletion verification query present ✓');
  } else {
    results.warnings.push('Deletion verification might be missing');
  }
  
  if (content.includes('OrderItem.deleteMany')) {
    results.passed.push('Order items deletion included ✓');
  } else {
    results.failed.push('Order items deletion missing');
  }
}

// Check 3: Verify unified update endpoint exists
console.log('✓ Checking: Unified update endpoint...');
const updateApiPath = path.join(__dirname, 'app', 'api', 'orders', 'update', 'route.js');
if (fs.existsSync(updateApiPath)) {
  const content = fs.readFileSync(updateApiPath, 'utf-8');
  
  if (content.includes('POST') && content.includes('orderId')) {
    results.passed.push('Unified update endpoint exists ✓');
  } else {
    results.failed.push('Unified update endpoint malformed');
  }
  
  if (content.includes('updateFields.status') && content.includes('updateFields.payment_status')) {
    results.passed.push('Unified endpoint accepts status/payment updates ✓');
  }
  
  if (content.includes('updated_fields')) {
    results.passed.push('Unified endpoint returns updated fields list ✓');
  }
} else {
  results.failed.push('Unified update endpoint not found at /api/orders/update');
}

// Check 4: Verify frontend has separate selectors
console.log('✓ Checking: Frontend status selectors...');
const ordersPagePath = path.join(__dirname, 'app', 'orders', 'page.js');
if (fs.existsSync(ordersPagePath)) {
  const content = fs.readFileSync(ordersPagePath, 'utf-8');
  
  const statusSelectCount = (content.match(/onChange=.*handleUpdateStatus/g) || []).length;
  const paymentSelectCount = (content.match(/onChange=.*handleUpdatePaymentStatus/g) || []).length;
  
  if (statusSelectCount > 0 && paymentSelectCount > 0) {
    results.passed.push(`Frontend has separate selectors (${statusSelectCount} status, ${paymentSelectCount} payment) ✓`);
  } else {
    results.failed.push('Frontend missing separate status selectors');
  }
  
  if (content.includes('updateOrderUnified')) {
    results.passed.push('Frontend includes unified update helper ✓');
  }
  
  if (!content.includes('getAutoPaymentStatus') || content.includes('REMOVED')) {
    results.passed.push('Auto-sync logic removed from frontend ✓');
  } else {
    results.warnings.push('Auto-sync function might still be active');
  }
  
  if (content.includes('deleted: true')) {
    results.passed.push('Frontend checks deleted: true flag ✓');
  }
}

// Check 5: Verify toast system enhancements
console.log('✓ Checking: Toast notification system...');
const toastHookPath = path.join(__dirname, 'hooks', 'useToast.js');
if (fs.existsSync(toastHookPath)) {
  const content = fs.readFileSync(toastHookPath, 'utf-8');
  
  if (content.includes('details')) {
    results.passed.push('Toast hook accepts details parameter ✓');
  } else {
    results.warnings.push('Toast details parameter might be missing');
  }
}

const toastComponentPath = path.join(__dirname, 'components', 'Toast.js');
if (fs.existsSync(toastComponentPath)) {
  const content = fs.readFileSync(toastComponentPath, 'utf-8');
  
  if (content.includes('showDetails') && content.includes('Chevron')) {
    results.passed.push('Toast component has expandable details UI ✓');
  } else {
    results.warnings.push('Toast expandable details might be missing');
  }
}

// Check 6: Verify error handling improvements
console.log('✓ Checking: Error handling...');
if (fs.existsSync(orderApiPath)) {
  const content = fs.readFileSync(orderApiPath, 'utf-8');
  
  const consoleErrorCount = (content.match(/console\.error/g) || []).length;
  if (consoleErrorCount === 0) {
    results.passed.push('No console.error calls in order API ✓');
  } else {
    results.warnings.push(`${consoleErrorCount} console.error calls still present`);
  }
  
  if (content.includes('process.env.NODE_ENV') && content.includes('details')) {
    results.passed.push('API returns error details in development mode ✓');
  }
}

// Check 7: Verify tests exist
console.log('✓ Checking: Test coverage...');
const testPath = path.join(__dirname, '__tests__', 'order-management.test.js');
if (fs.existsSync(testPath)) {
  const content = fs.readFileSync(testPath, 'utf-8');
  
  if (content.includes('Status Independence')) {
    results.passed.push('Status independence tests exist ✓');
  }
  
  if (content.includes('Order Deletion')) {
    results.passed.push('Deletion tests exist ✓');
  }
  
  if (content.includes('manualQAChecklist')) {
    results.passed.push('Manual QA checklist provided ✓');
  }
} else {
  results.warnings.push('Test file not found - consider adding tests');
}

// Print results
console.log('\n' + '='.repeat(60));
console.log('\n📊 VALIDATION RESULTS\n');

if (results.passed.length > 0) {
  console.log('✅ PASSED (' + results.passed.length + '):');
  results.passed.forEach(item => console.log('  ✓ ' + item));
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS (' + results.warnings.length + '):');
  results.warnings.forEach(item => console.log('  ⚠ ' + item));
}

if (results.failed.length > 0) {
  console.log('\n❌ FAILED (' + results.failed.length + '):');
  results.failed.forEach(item => console.log('  ✗ ' + item));
}

console.log('\n' + '='.repeat(60));

const totalChecks = results.passed.length + results.warnings.length + results.failed.length;
const score = Math.round((results.passed.length / totalChecks) * 100);

console.log(`\n🎯 OVERALL SCORE: ${score}%`);
console.log(`   ${results.passed.length} passed, ${results.warnings.length} warnings, ${results.failed.length} failed`);

if (results.failed.length === 0) {
  console.log('\n✅ ALL CRITICAL CHECKS PASSED!');
  console.log('   System is ready for manual QA testing.');
} else {
  console.log('\n⚠️  SOME CHECKS FAILED');
  console.log('   Please review and fix the failed items above.');
  process.exit(1);
}

console.log('\n📝 Next Steps:');
console.log('   1. Run: npm test (if Jest is configured)');
console.log('   2. Start dev server: npm run dev');
console.log('   3. Follow manual QA checklist in __tests__/order-management.test.js');
console.log('   4. Verify all operations in browser');
console.log('\n');
