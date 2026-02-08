const next = require('next');
const http = require('http');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Etat en memoire pour le salon unique
const roomState = {
	djUserId: null,
	currentUrl: null,
};

// Utilisateurs connectes: Map<socketId, { nickname, color }>
const users = new Map();

const AVATAR_COLORS = [
	'#1DB954', '#e54545', '#a238ff', '#3b82f6', '#f59e0b',
	'#ec4899', '#06b6d4', '#84cc16', '#f97316', '#8b5cf6',
	'#14b8a6', '#ef4444', '#6366f1', '#22c55e', '#eab308',
];

function getRandomColor() {
	return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function getUserList() {
	const list = [];
	for (const [id, data] of users.entries()) {
		list.push({ id, nickname: data.nickname, color: data.color, isDj: id === roomState.djUserId });
	}
	return list;
}

app.prepare().then(() => {
	const server = http.createServer((req, res) => handle(req, res));
	const io = new Server(server, {
		cors: {
			origin: true,
			methods: ['GET', 'POST'],
		},
	});

	io.on('connection', (socket) => {
		// Attribuer un pseudo par defaut
		const userNumber = users.size + 1;
		const userData = {
			nickname: `User ${userNumber}`,
			color: getRandomColor(),
		};
		users.set(socket.id, userData);

		// Envoyer l'etat courant au nouveau client
		socket.emit('state:init', {
			...roomState,
			selfId: socket.id,
			nickname: userData.nickname,
			color: userData.color,
			users: getUserList(),
		});

		// Notifier les autres qu'un nouvel utilisateur est connecte
		io.emit('users:update', getUserList());

		// Changement de pseudo
		socket.on('user:setNickname', (nickname) => {
			if (typeof nickname !== 'string' || !nickname.trim()) return;
			const clean = nickname.trim().slice(0, 20);
			const user = users.get(socket.id);
			if (user) {
				user.nickname = clean;
				io.emit('users:update', getUserList());
			}
		});

		// Chat messages
		socket.on('chat:message', (msg) => {
			if (typeof msg !== 'string' || !msg.trim()) return;
			const user = users.get(socket.id);
			io.emit('chat:message', {
				id: Date.now().toString() + '_' + socket.id,
				userId: socket.id,
				nickname: user?.nickname || 'Anonyme',
				color: user?.color || '#888',
				content: msg.trim(),
				timestamp: Date.now(),
			});
		});

		// Demande de devenir DJ
		socket.on('dj:request', () => {
			if (!roomState.djUserId) {
				roomState.djUserId = socket.id;
				io.emit('dj:granted', { djUserId: roomState.djUserId });
				io.emit('users:update', getUserList());
			}
		});

		// Quitter le role DJ
		socket.on('dj:release', () => {
			if (socket.id === roomState.djUserId) {
				roomState.djUserId = null;
				io.emit('dj:released');
				io.emit('users:update', getUserList());
			}
		});

		// Passer le DJ a un autre utilisateur
		socket.on('dj:transfer', (targetId) => {
			if (socket.id !== roomState.djUserId) return;
			if (!users.has(targetId)) return;
			roomState.djUserId = targetId;
			io.emit('dj:granted', { djUserId: roomState.djUserId });
			io.emit('users:update', getUserList());
		});

		// Changement de piste (seulement par le DJ)
		socket.on('player:change', (payload) => {
			if (socket.id !== roomState.djUserId) return;
			roomState.currentUrl = payload?.url || null;
			const user = users.get(socket.id);
			io.emit('player:changed', {
				url: roomState.currentUrl,
				by: socket.id,
				byNickname: user?.nickname || 'DJ',
			});
		});

		socket.on('disconnect', () => {
			const wasDj = socket.id === roomState.djUserId;
			users.delete(socket.id);

			if (wasDj) {
				roomState.djUserId = null;
				io.emit('dj:released');
			}

			io.emit('users:update', getUserList());
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
