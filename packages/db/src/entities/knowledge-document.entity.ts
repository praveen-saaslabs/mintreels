import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { KnowledgeDocumentRow } from '@mintreels/schema';

@Entity({ name: 'knowledge_documents' })
export class KnowledgeDocument implements KnowledgeDocumentRow {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int', name: 'knowledge_base_id' })
  knowledgeBaseId!: number;

  @Column({ type: 'text', name: 'provider_document_id' })
  providerDocumentId!: string;

  @Column({ type: 'int', name: 'recording_id', nullable: true })
  recordingId!: number | null;

  @Column({ type: 'text', name: 'source_type' })
  sourceType!: string;

  @Column({ type: 'text' })
  title!: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
