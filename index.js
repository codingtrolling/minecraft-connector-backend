const mc = require('minecraft-protocol');
const WebSocket = require('ws');
const http = require('http');

// 1. SETUP SERVER
const server = http.createServer();
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

console.log(`[Tool 11] MC Proxy Engine starting on port ${PORT}...`);

wss.on('connection', (ws) => {
    console.log('[Proxy] Browser connected via WebSocket.');
    let mcClient = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // 2. ACTION: INITIALIZE CONNECTION
            if (data.type === 'connect') {
                const parts = data.address.split(':');
                const host = parts[0];
                const port = parts[1] ? parseInt(parts[1]) : 25565;

                console.log(`[Proxy] Creating tunnel to: ${host}:${port}`);

                // Create the Minecraft Client
                mcClient = mc.createClient({
                    host: host,
                    port: port,
                    username: data.username || 'TrollGuest',
                    version: data.version || false // false auto-detects version
                });

                // 3. FORWARD PACKETS: MC -> BROWSER
                mcClient.on('packet', (packet, meta) => {
                    ws.send(JSON.stringify({
                        type: 'mc_packet',
                        meta: meta,
                        data: packet
                    }));
                });

                // 4. HANDLE STATUS & ERRORS
                mcClient.on('connect', () => {
                    ws.send(JSON.stringify({ type: 'status', msg: `Successfully Tunneled to ${host}` }));
                });

                mcClient.on('error', (err) => {
                    console.error('[MC Error]', err);
                    ws.send(JSON.stringify({ type: 'error', msg: err.message }));
                });

                mcClient.on('end', () => {
                    ws.send(JSON.stringify({ type: 'status', msg: 'Minecraft Server closed the connection.' }));
                });
            }

            // 5. ACTION: SEND PACKET (BROWSER -> MC)
            if (data.type === 'send_packet' && mcClient) {
                mcClient.write(data.packetName, data.packetPayload);
            }

        } catch (e) {
            console.error('[System Error] Invalid JSON received');
        }
    });

    ws.on('close', () => {
        console.log('[Proxy] Browser disconnected.');
        if (mcClient) mcClient.end();
    });
});



server.listen(PORT, () => {
    console.log(`[Tool 11] Fully Functional. Access via wss://your-url.up.railway.app`);
});
