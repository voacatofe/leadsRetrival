import net from 'net';
import { URL } from 'url';

const MAX_RETRIES = 30;
const RETRY_INTERVAL = 2000; // 2 seconds

function parseUrl(connectionString, defaultHost, defaultPort) {
    if (!connectionString) return { host: defaultHost, port: defaultPort };
    try {
        const parsed = new URL(connectionString);
        return {
            host: parsed.hostname || defaultHost,
            port: parsed.port || defaultPort
        };
    } catch (e) {
        return { host: defaultHost, port: defaultPort };
    }
}

const dbConfig = parseUrl(process.env.DATABASE_URL, 'db', 5432);
const redisConfig = parseUrl(process.env.REDIS_URL, 'redis', 6379);

function checkConnection(name, host, port) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        
        socket.setTimeout(2000); // 2s connect timeout

        socket.on('connect', () => {
            console.log(`✅ ${name} is ready on ${host}:${port}`);
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Timeout'));
        });

        socket.on('error', (err) => {
            socket.destroy();
            reject(err);
        });

        socket.connect(port, host);
    });
}

async function waitForServices() {
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            console.log(`Attempting to connect to services (Try ${retries + 1}/${MAX_RETRIES})...`);
            
            await Promise.all([
                checkConnection('PostgreSQL', dbConfig.host, dbConfig.port),
                checkConnection('Redis', redisConfig.host, redisConfig.port)
            ]);
            
            console.log('🎉 All services are ready!');
            process.exit(0);
        } catch (error) {
            console.log(`⏳ Waiting for services... (${error.message || 'Connection failed'})`);
            retries++;
            await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
        }
    }

    console.error('❌ Could not connect to services in time.');
    process.exit(1);
}

waitForServices();