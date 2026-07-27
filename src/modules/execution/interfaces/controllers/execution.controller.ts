import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ExecutionService } from '../../application/services/execution.service';
import { ExecutionStatus } from '../../domain/enums/execution-status.enum';

class UpdateStatusDto {
  @IsEnum(ExecutionStatus)
  status!: ExecutionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  author?: string;
}

class AddNoteDto {
  @IsString()
  @MaxLength(1000)
  note!: string;

  @IsOptional()
  @IsString()
  author?: string;
}

@ApiTags('Executions')
@Controller('executions')
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as 50 execuções mais recentes' })
  async list() {
    const items = await this.executionService.listRecent();
    return { data: items, total: items.length };
  }

  @Get(':serviceOrderId')
  @ApiOperation({ summary: 'Detalha a execução de uma OS (timeline completa + checklist)' })
  async findByServiceOrder(@Param('serviceOrderId') serviceOrderId: string) {
    return this.executionService.findByServiceOrderId(serviceOrderId);
  }

  @Patch(':serviceOrderId/status')
  @ApiOperation({
    summary: 'Atualiza status da execução (mecânico). Se COMPLETED, publica evento pra Saga.',
  })
  async updateStatus(
    @Param('serviceOrderId') serviceOrderId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.executionService.updateStatus(
      serviceOrderId,
      dto.status,
      dto.note,
      dto.author,
    );
  }

  @Post(':serviceOrderId/notes')
  @ApiOperation({ summary: 'Adiciona uma nota de mecânico à timeline (não muda status)' })
  async addNote(
    @Param('serviceOrderId') serviceOrderId: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.executionService.addNote(serviceOrderId, dto.note, dto.author);
  }
}
