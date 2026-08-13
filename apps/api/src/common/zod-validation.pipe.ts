import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        error: 'Invalid request',
        issues: result.error instanceof ZodError ? result.error.issues : [],
      });
    }
    return result.data;
  }
}
