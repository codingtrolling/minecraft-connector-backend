const net = require('net');
const WebSocket = require('ws');

// This tool runs on a specific port (e.g., 8080)
const wss = new WebSocket.Server({ port: 8080 });

console.log("Minecraft Connector Tool: Active on Port 8080");

wss.on('connection', (ws) => {
    let minecraftServer = null;

    ws.on('message', (message) => {
        const command = JSON.parse(message);

        // ACTION: CONNECT TO A SERVER
        if (command.type === 'connect') {
            const [host, port] = command.address.split(':');
            
            minecraftServer = new net.Socket();
            minecraftServer.connect(port || 25565, host, () => {
                ws.send(JSON.stringify({ type: 'status', msg: 'Connected to MC Server' }));
            });

            // Forward data from MC Server -> Browser
            minecraftServer.on('data', (data) => {
                ws.send(data); // Sending raw buffer to browser
            });

            minecraftServer.on('error', (err) => {
                ws.send(JSON.stringify({ type: 'error', msg: err.message }));
            });
        }

        // ACTION: FORWARD PLAYER DATA (Browser -> MC Server)
        if (command.type === 'packet' && minecraftServer) {
            minecraftServer.write(Buffer.from(command.data));
        }
    });

    ws.on('close', () => {
        if (minecraftServer) minecraftServer.destroy();
    });
});
