import { spawn } from 'child_process';

console.log('Iniciando servidores...');

// Iniciar Backend (Puerto 3001)
const server = spawn('npm', ['run', 'server'], { stdio: 'inherit', shell: true });

// Iniciar Frontend Vite (Puerto 3000)
const dev = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });

// Manejar salida limpia al presionar Ctrl+C
process.on('SIGINT', () => {
  console.log('\nApagando servidores...');
  server.kill();
  dev.kill();
  process.exit();
});
