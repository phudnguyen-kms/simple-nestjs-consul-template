import { Injectable } from '@nestjs/common';
import { RemoteService } from './interfaces/remoteService.interface';
import Consul from 'consul';
const uuid = require("uuid");

const serviceIds = ["service-b"];

@Injectable()
export class ConsulService {
    private readonly remoteServices: RemoteService[] = [];

    private readonly consul: Consul.Consul = new Consul({
        host: process.env.CONSUL_HOST,
        port: process.env.CONSUL_PORT,
        secure: false,
    });
    private readonly consulId: string = uuid.v4();

    private interval: any;

    onModuleInit() {
        let details = {
            name: process.env.CONSUL_SERVICE_NAME,
            address: process.env.CONSUL_BIND_ADDRESS,
            port: parseInt(process.env.PORT),
            id: this.consulId,
            check: {
                ttl: '10s',
                deregister_critical_service_after: '1m'
            }
        };

        this.consul.agent.service.register(details, err => {
            if (err) { console.log(err.name, err.message); }
        });

        this.interval = setInterval(() => {
            this.peformHealthcheck();
        }, 5 * 1000);

        this.watchRemoteServices();
    }

    onApplicationShutdown(signal: string) {
        console.log('onApplicationShutdown', signal); // e.g. "SIGINT"
        if (signal === "SIGINT") {
            console.log('SIGINT. De-Registering...');
            let details = { id: this.consulId };

            clearInterval(this.interval);

            this.consul.agent.service.deregister(details, (err) => {
                console.log('de-registered.', err);
            });
        }
    }

    private peformHealthcheck() {
        this.consul.agent.check.pass({ id: `service:${this.consulId}` }, err => {
            if (err) {
                throw new Error(`Consul heartbeat error: ${err.name} - ${err.message}`);
            }
        });
    }

    private watchRemoteServices() {
        const watcher = this.consul.watch({
            method: this.consul.health.service,
            options: {
                // @ts-ignore
                service: "service-b",
                passing: true,
            }
        });


        watcher.on('change', data => {
            data.forEach(entry => {
                console.log(entry.Service);
                this.remoteServices.push({
                    host: entry.Service.Address,
                    port: entry.Service.Port,
                    name: entry.Service.Service,
                    id: entry.Service.ID,
                });
            });
            console.log(this.remoteServices);
        });
    }
}