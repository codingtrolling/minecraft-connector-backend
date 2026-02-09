const mc = require('minecraft-protocol');
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

wss.on('connection', (ws) => {
    let mcClient = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'connect') {
                // SAFETY: If address is missing, don't try to connect
                if (!data.address || data.address.trim() === "") {
                    return ws.send(JSON.stringify({ type: 'error', msg: 'Error: No Server IP provided!' }));
                }

                const parts = data.address.split(':');
                const host = parts[0];
                const port = parts[1] ? parseInt(parts[1]) : 25565;

                console.log(`[BRIDGE] Connecting to ${host}:${port}`);

                // Kill existing connection if user tries to connect again
                if (mcClient) mcClient.end();

                mcClient = mc.createClient({
                    host: host, // This MUST be the IP from the frontend
                    port: port,
                    username: 'TrollTool_User',
                    version: false 
                });

                mcClient.on('connect', () => {
                    ws.send(JSON.stringify({ type: 'status', msg: `Connected to ${host}` }));
                });

                mcClient.on('error', (err) => {
                    ws.send(JSON.stringify({ type: 'error', msg: 'MC Error: ' + err.message }));
                });

                mcClient.on('packet', (packet, meta) => {
                    ws.send(JSON.stringify({ type: 'mc_packet', meta: meta, data: packet }));
                });
            }
        } catch (e) {
            ws.send(JSON.stringify({ type: 'error', msg: 'Invalid Command Structure' }));
        }
    });

    ws.on('close', () => { if (mcClient) mcClient.end(); });
});

server.listen(PORT, () => console.log(`Proxy active on port ${PORT}`));
