import { runCodecTests } from './codec.test';
import { runIntegrationTests } from './tcp-integration.test';

async function main() {
  console.log('='.repeat(65));
  console.log('   TRACKWE TELTONIKA FMC920 INTEGRATION TEST SUITE   ');
  console.log('='.repeat(65));

  const t1 = await runCodecTests();
  const t2 = await runIntegrationTests();

  const totalPassed = t1.passed + t2.passed;
  const totalFailed = t1.failed + t2.failed;

  console.log('\n' + '='.repeat(65));
  console.log(`FINAL RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log('='.repeat(65));

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[TEST RUNNER FATAL]', err);
  process.exit(1);
});
