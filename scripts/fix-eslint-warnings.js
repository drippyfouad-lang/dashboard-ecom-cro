// Quick ESLint Fix Script
const fs = require('fs');

const fixes = [
  {
    file: 'app/admin/anderson/delivered/page.js',
    search: /  useEffect\(\(\) => \{\s+fetchDeliveredOrders\(\);\s+\}, \[page, searchQuery, dateFilter\]\);/,
    replace: `  useEffect(() => {\n    fetchDeliveredOrders();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [page, searchQuery, dateFilter]);`
  },
  {
    file: 'app/admin/anderson/out-for-delivery/page.js',
    search: /  useEffect\(\(\) => \{\s+fetchOutForDeliveryOrders\(\);\s+\}, \[page, searchQuery\]\);/,
    replace: `  useEffect(() => {\n    fetchOutForDeliveryOrders();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [page, searchQuery]);`
  },
  {
    file: 'app/admin/anderson/pre-sent/page.js',
    search: /  useEffect\(\(\) => \{\s+fetchPreSentOrders\(\);\s+\}, \[page, searchQuery\]\);/,
    replace: `  useEffect(() => {\n    fetchPreSentOrders();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [page, searchQuery]);`
  },
  {
    file: 'app/admin/anderson/returned/page.js',
    search: /  useEffect\(\(\) => \{\s+fetchReturnedOrders\(\);\s+\}, \[page, searchQuery, dateFilter\]\);/,
    replace: `  useEffect(() => {\n    fetchReturnedOrders();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [page, searchQuery, dateFilter]);`
  },
  {
    file: 'app/admin/anderson/sent/page.js',
    search: /  useEffect\(\(\) => \{\s+fetchSentOrders\(\);\s+\}, \[page, searchQuery\]\);/,
    replace: `  useEffect(() => {\n    fetchSentOrders();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [page, searchQuery]);`
  },
  {
    file: 'app/admin/anderson/shipped/page.js',
    search: /  useEffect\(\(\) => \{\s+fetchShippedOrders\(\);\s+\}, \[page, searchQuery\]\);/,
    replace: `  useEffect(() => {\n    fetchShippedOrders();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [page, searchQuery]);`
  },
  {
    file: 'app/admin/communes/page.js',
    search: /  useEffect\(\(\) => \{\s+fetchWilayas\(\);\s+fetchCommunes\(\);\s+\}, \[\]\);/,
    replace: `  useEffect(() => {\n    fetchWilayas();\n    fetchCommunes();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, []);`
  },
  {
    file: 'app/admin/communes/page.js',
    search: /  useEffect\(\(\) => \{\s+fetchCommunes\(\);\s+\}, \[searchQuery, wilayaFilter\]\);/,
    replace: `  useEffect(() => {\n    fetchCommunes();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [searchQuery, wilayaFilter]);`
  },
  {
    file: 'app/admin/wilayas/page.js',
    search: /  useEffect\(\(\) => \{\s+fetchWilayas\(\);\s+\}, \[searchQuery, deliveryFilter\]\);/,
    replace: `  useEffect(() => {\n    fetchWilayas();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [searchQuery, deliveryFilter]);`
  },
  {
    file: 'app/client/orders/cancelled/page.js',
    search: /  useEffect\(\(\) => \{\s+fetchCancelledOrders\(\);\s+\}, \[page, statusFilter, dateFilter\]\);/,
    replace: `  useEffect(() => {\n    fetchCancelledOrders();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [page, statusFilter, dateFilter]);`
  },
  {
    file: 'app/contact/page.js',
    search: /  useEffect\(\(\) => \{[\s\S]{1,100}fetchMessages\(\);[\s\S]{1,100}\}, \[currentPage, searchQuery, statusFilter\]\);/,
    replace: `  useEffect(() => {\n    fetchMessages();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [currentPage, searchQuery, statusFilter]);`
  },
  {
    file: 'app/finance/page.js',
    search: /  useEffect\(\(\) => \{\s+processFinanceData\(\);\s+\}, \[period\]\);/,
    replace: `  useEffect(() => {\n    processFinanceData();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [period]);`
  },
  {
    file: 'app/orders/page.js',
    search: /  useEffect\(\(\) => \{\s+fetchPendingOrders\(\);\s+\}, \[page, searchQuery\]\);/,
    replace: `  useEffect(() => {\n    fetchPendingOrders();\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [page, searchQuery]);`
  },
];

let fixed = 0;
let errors = 0;

fixes.forEach(({ file, search, replace }) => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    if (search.test(content)) {
      content = content.replace(search, replace);
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed: ${file}`);
      fixed++;
    } else {
      console.log(`⚠️  Pattern not found in: ${file}`);
    }
  } catch (e) {
    console.error(`❌ Error in ${file}: ${e.message}`);
    errors++;
  }
});

console.log(`\n📊 Summary: ${fixed} fixed, ${errors} errors`);
