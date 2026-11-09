import { Injectable, NotFoundException } from '@nestjs/common';
import { Exercise } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { ExerciseFilterDto } from './dto/exercise-filter.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: ExerciseFilterDto = {}): Promise<Exercise[]> {
    return this.prisma.exercise.findMany({
      where: {
        type: filter.type,
        muscleGroup: filter.muscle_group,
        name: filter.q
          ? { contains: filter.q, mode: 'insensitive' }
          : undefined,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string): Promise<Exercise> {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    return exercise;
  }

  create(dto: CreateExerciseDto): Promise<Exercise> {
    return this.prisma.exercise.create({ data: dto });
  }

  async update(id: string, dto: UpdateExerciseDto): Promise<Exercise> {
    await this.findOne(id);

    return this.prisma.exercise.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.prisma.exercise.delete({ where: { id } });
  }
}
