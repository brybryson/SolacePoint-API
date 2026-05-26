const http = require('http');
const url = require('url');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('\n=====================================================');
  console.log('📬 SolacePoint Gmail OAuth2 Token Generator');
  console.log('=====================================================\n');
  console.log('Please configure your Google Cloud Console first using the steps in the plan.');
  
  const clientId = (await askQuestion('Enter GMAIL_CLIENT_ID: ')).trim();
  const clientSecret = (await askQuestion('Enter GMAIL_CLIENT_SECRET: ')).trim();
  
  if (!clientId || !clientSecret) {
    console.error('❌ Both Client ID and Client Secret are required!');
    process.exit(1);
  }

  const redirectUri = 'http://localhost:3000/oauth2callback';
  
  // Gmail API Scope for sending email
  const scope = 'https://www.googleapis.com/auth/gmail.send';
  
  // Build the authorization URL
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  // Start temporary local HTTP server to capture the code
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.pathname === '/oauth2callback') {
      const code = parsedUrl.query.code;
      
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Authorization failed: No code returned.');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
          <h2 style="color: #137333;">✓ Authorization Successful!</h2>
          <p>You can close this tab and return to your terminal.</p>
        </div>
      `);
      
      console.log('\n🔄 Code captured. Exchanging for tokens...');
      
      try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          })
        });
        
        const tokens = await tokenResponse.json();
        
        if (tokens.error) {
          throw new Error(tokens.error_description || tokens.error);
        }
        
        console.log('\n=====================================================');
        console.log('🎉 SUCCESS! GMAIL OAUTH2 CREDENTIALS GENERATED');
        console.log('=====================================================\n');
        console.log('Add these lines to your local .env file (and your Railway environment variables):');
        console.log('-----------------------------------------------------');
        console.log(`GMAIL_CLIENT_ID="${clientId}"`);
        console.log(`GMAIL_CLIENT_SECRET="${clientSecret}"`);
        console.log(`GMAIL_REFRESH_TOKEN="${tokens.refresh_token}"`);
        console.log('-----------------------------------------------------\n');
        
      } catch (err) {
        console.error('\n❌ Error exchanging authorization code:', err.message);
      } finally {
        rl.close();
        server.close();
        process.exit(0);
      }
    }
  });

  server.listen(3000, () => {
    console.log('\n-----------------------------------------------------');
    console.log('👉 Click or copy this link into your browser to log in:');
    console.log('-----------------------------------------------------');
    console.log(authUrl);
    console.log('-----------------------------------------------------\n');
    console.log('Waiting for login redirect on http://localhost:3000/oauth2callback ...');
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
