const next = require('next');
const http = require('http');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Etat en mémoire pour le salon unique
const roomState = {
	djUserId: null,
	currentUrl: null,
};

app.prepare().then(() => {
	const server = http.createServer((req, res) => handle(req, res));
	const io = new Server(server, {
		cors: {
			origin: true,
			methods: ['GET', 'POST'],
		},
	});

	io.on('connection', (socket) => {
		// Envoyer l'état courant au nouveau client
		socket.emit('state:init', roomState);

		// Chat messages
		socket.on('chat:message', (msg) => {
			io.emit('chat:message', { id: Date.now().toString(), userId: socket.id, content: msg });
		});

		// Demande de devenir DJ
		socket.on('dj:request', () => {
			// Si personne n'est DJ, attribuer
			if (!roomState.djUserId) {
				roomState.djUserId = socket.id;
				io.emit('dj:granted', { djUserId: roomState.djUserId });
			}
		});

		// Changement de piste (seulement par le DJ)
		socket.on('player:change', (payload) => {
			if (socket.id !== roomState.djUserId) return;
			roomState.currentUrl = payload?.url || null;
			io.emit('player:changed', { url: roomState.currentUrl, by: socket.id });
		});

		socket.on('disconnect', () => {
			if (socket.id === roomState.djUserId) {
				roomState.djUserId = null;
				io.emit('dj:released');
			}
		});
	});

	const port = process.env.PORT || 3000;
	server.listen(port, () => {
		console.log(`> Ready on http://localhost:${port}`);
	});
}).catch((err) => {
	console.error(err);
	process.exit(1);
});
