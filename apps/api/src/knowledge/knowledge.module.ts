import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  KnowledgeBase,
  KnowledgeDocument,
  KnowledgeBaseRepository,
  KnowledgeDocumentRepository,
} from '@mintreels/db';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeBase, KnowledgeDocument])],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, KnowledgeBaseRepository, KnowledgeDocumentRepository],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
