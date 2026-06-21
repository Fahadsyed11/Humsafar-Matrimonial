const http = require('http');

function testUrl(url) {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            console.log(`URL: ${url} -> Status: ${res.statusCode}, Content-Type: ${res.headers['content-type']}`);
            resolve(res.statusCode);
        }).on('error', (err) => {
            console.error(`Error fetching ${url}:`, err.message);
            resolve(500);
        });
    });
}

async function run() {
    await testUrl('http://localhost:3000/boys_photos/boy_01.jpeg');
    await testUrl('http://localhost:3000/girls_photos/girl_01.jpeg');
    await testUrl('http://localhost:3000/dashboard.html');
}

run();
