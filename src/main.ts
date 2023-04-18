import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import Consul from 'consul';

const consul = new Consul({
  host: process.env.CONSUL_HOST,
  port: process.env.CONSUL_PORT,
  secure: false,
});

async function bootstrap() {

  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT);
  const CONSUL_ID = require('uuid').v4();
  let details = {
    name: process.env.CONSUL_SERVICE_NAME,
    address: process.env.CONSUL_BIND_ADDRESS,
    port: parseInt(process.env.PORT),
    id: CONSUL_ID,
    check: {
      ttl: '10s',
      deregister_critical_service_after: '1m'
    }
  };

  await consul.agent.service.register(details, err => {
    if (err) { console.log(err.name, err.message); }
  });
  const interval = setInterval(() => {
    consul.agent.check.pass({ id: `service:${CONSUL_ID}` }, err => {
      if (err) {
        throw new Error(`Consul heartbeat error: ${err.name} - ${err.message}`);
      }
    });
  }, 5 * 1000);

  process.on('SIGINT', () => {
    console.log('SIGINT. De-Registering...');
    let details = { id: CONSUL_ID };

    clearInterval(interval);

    consul.agent.service.deregister(details, (err) => {
      console.log('de-registered.', err);
      process.exit();
    });
  });
}
bootstrap();
