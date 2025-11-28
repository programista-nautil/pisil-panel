module.exports = {
	apps: [
		{
			name: 'pisil-app',
			script: 'npm',
			args: 'start',
			env: {
				NODE_ENV: 'production',
				PORT: 3019,
			},
		},
		{
			name: 'pisil-worker',
			script: 'workers/email-worker.js', // Uruchamia naszego workera
			instances: 1,
			autorestart: true, // Auto-restart po błędzie
			watch: false,
			max_memory_restart: '500M', // Restartuj jeśli zje za dużo RAMu (wyciek pamięci)
			env: {
				NODE_ENV: 'production',
			},
		},
	],
}
