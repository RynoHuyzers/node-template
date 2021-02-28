import { Module } from '@nestjs/common';
import { AppController } from './rest-api/src/app.controller';
import { AppService } from './rest-api/src/app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
