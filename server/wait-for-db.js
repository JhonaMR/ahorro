import net from 'net';

const checkPort = (host, port) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
};

const wait = async () => {
  const host = process.env.DB_HOST || 'db';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  
  console.log(`[Wait-For-DB] Esperando a que la base de datos (${host}:${port}) esté lista...`);
  
  // Reintentar hasta 30 veces (60 segundos en total)
  for (let i = 0; i < 30; i++) {
    const isReady = await checkPort(host, port);
    if (isReady) {
      console.log('[Wait-For-DB] ¡La base de datos está lista y aceptando conexiones!');
      process.exit(0);
    }
    
    console.log(`[Wait-For-DB] Base de datos no disponible aún. Reintentando en 2 segundos... (Intento ${i + 1}/30)`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  
  console.error('[Wait-For-DB] Error: La base de datos no estuvo disponible a tiempo.');
  process.exit(1);
};

wait();
