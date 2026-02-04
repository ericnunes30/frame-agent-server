/**
 * Simple load test script
 * 
 * Usage: node scripts/load-test.js [concurrency] [requests]
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONCURRENCY = parseInt(process.argv[2], 10) || 10;
const TOTAL_REQUESTS = parseInt(process.argv[3], 10) || 100;

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runLoadTest() {
  console.log(`Load Test: ${CONCURRENCY} concurrent, ${TOTAL_REQUESTS} total`);
  console.log(`Target: ${BASE_URL}\n`);

  const startTime = Date.now();
  let completed = 0;
  let failed = 0;

  async function worker() {
    while (completed + failed < TOTAL_REQUESTS) {
      try {
        const response = await makeRequest('/execute', 'POST', {
          messages: [{ role: 'user', content: `Load test ${Date.now()}` }]
        });

        if (response.status === 200) {
          completed++;
          process.stdout.write('.');
        } else {
          failed++;
          process.stdout.write('X');
        }
      } catch (error) {
        failed++;
        process.stdout.write('E');
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const duration = Date.now() - startTime;
  const rps = (completed / (duration / 1000)).toFixed(2);

  console.log('\n');
  console.log('Results:');
  console.log(`  Completed: ${completed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Duration: ${duration}ms`);
  console.log(`  RPS: ${rps}`);

  // Health check
  const health = await makeRequest('/health');
  console.log('\nHealth:');
  console.log(`  Status: ${health.body.status}`);
  console.log(`  Workers: ${health.body.stats.workers}`);
  console.log(`  Available: ${health.body.stats.availableWorkers}`);
  console.log(`  Queue: ${health.body.stats.queued}`);
  console.log(`  Running: ${health.body.stats.running}`);
}

runLoadTest().catch(console.error);
