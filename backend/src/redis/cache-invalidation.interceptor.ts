import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { mergeMap, Observable } from 'rxjs';
import { RedisService } from './redis.service';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const REPORT_PATH =
  /\/(clients|trainers|workouts|equipment|gym-links|receptions?|demo)(?:\/|$)/;

const PREFIX_BY_PATH: Array<[RegExp, string]> = [
  [/\/gyms(?:\/|$)/, 'cache:gyms:'],
  [/\/exercises(?:\/|$)/, 'cache:exercises:'],
  [/\/food-products(?:\/|$)/, 'cache:food-products:'],
  [/\/goals?(?:\/|$)/, 'cache:goals:'],
];

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<{ method?: string; path?: string }>();

    if (!request.method || !MUTATION_METHODS.has(request.method.toUpperCase())) {
      return next.handle();
    }

    const path = request.path ?? '';

    return next.handle().pipe(
      mergeMap(async (result) => {
        const prefixes = new Set<string>();

        if (path.includes('/demo')) {
          prefixes.add('cache:reports:');
          prefixes.add('cache:gyms:');
          prefixes.add('cache:exercises:');
          prefixes.add('cache:food-products:');
          prefixes.add('cache:goals:');
        } else {
          if (REPORT_PATH.test(path)) {
            prefixes.add('cache:reports:');
          }

          for (const [pattern, prefix] of PREFIX_BY_PATH) {
            if (pattern.test(path)) {
              prefixes.add(prefix);
            }
          }
        }

        await Promise.all(
          [...prefixes].map((prefix) => this.redis.invalidatePrefix(prefix)),
        );

        return result;
      }),
    );
  }
}
