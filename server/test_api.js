async function runTests() {
    const baseUrl = 'http://localhost:5000';

    console.log('--- Testing API Endpoints ---');

    try {
        // 1. Test the Health Check
        const healthRes = await fetch(`${baseUrl}/health`);
        const healthData = await healthRes.json();
        console.log('1. Health Check Status:', healthRes.status, healthData.message);

        // 2. Test Registering a Vendor
        console.log('\nRegistering a test vendor...');
        const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Jane Farmer',
                email: 'jane@example.com',
                password: 'password123',
                role: 'vendor'
            })
        });
        const registerData = await registerRes.json();
        console.log('2. Register Status:', registerRes.status);
        console.log('Response:', registerData);

        // 3. Test Logging in
        console.log('\nLogging in...');
        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'jane@example.com',
                password: 'password123'
            })
        });
        const loginData = await loginRes.json();
        console.log('3. Login Status:', loginRes.status);
        console.log('Response Token:', loginData.token ? 'Success (Token received)' : 'Failed');
        console.log('User Role:', loginData.user ? loginData.user.role : 'None');

    } catch (error) {
        console.error('Test run failed with error:', error);
    }
}

runTests();
