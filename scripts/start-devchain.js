const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');

(async function() {
  try {
    console.log('⛓ Starting ngrok tunnel to Hardhat (8545)...');

    const url = await ngrok.connect({
      addr: 8545,
      proto: 'http',
    });

    console.log(`🌐 ngrok URL: ${url}`);

    // Write it to .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = `NEXT_PUBLIC_HARDHAT_RPC=${url}`;

    fs.writeFileSync(envPath, envContent);
    console.log(`✅ .env.local updated with RPC URL`);

    console.log('\n👉 Now start your Hardhat node in another terminal:');
    console.log('npx hardhat node');
    console.log('\n👉 Then run your Next.js app as usual:');
    console.log('npm run dev');

  } catch (err) {
    console.error('Error starting ngrok:', err);
    process.exit(1);
  }
})();