import { Module } from '@nestjs/common';
import { OperatorsController } from './operators.controller.js';
import { OperatorsAdminController } from './operators-admin.controller.js';
import { OperatorsService } from './operators.service.js';
import { VerificationService } from './verification.service.js';

@Module({
  controllers: [OperatorsController, OperatorsAdminController],
  providers: [OperatorsService, VerificationService],
  exports: [OperatorsService],
})
export class OperatorsModule {}
