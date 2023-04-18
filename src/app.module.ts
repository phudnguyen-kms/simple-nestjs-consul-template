import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ConsulService } from './consul/consul.service';

console.log(`Environment: ${process.env.NODE_ENV}`)

@Module({
  imports: [ConfigModule.forRoot({ envFilePath: `.env.${process.env.NODE_ENV}` }), ],
  controllers: [AppController],
  providers: [AppService, ConsulService],
})
export class AppModule {}
