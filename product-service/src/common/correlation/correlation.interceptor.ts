import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Metadata } from '@grpc/grpc-js';
import { Observable } from 'rxjs';
import {
  CORRELATION_HEADER,
  getCorrelationId,
  runWithCorrelationId,
} from './correlation.context';

/**
 * Đọc correlation ID từ gRPC metadata của caller và chạy handler trong ngữ cảnh
 * AsyncLocalStorage tương ứng, đồng thời in một dòng access log dạng JSON khớp
 * với format pino của các service Node.
 *
 * Lưu ý quan trọng về RxJS: `next.handle()` trả về Observable NGAY LẬP TỨC,
 * handler thật chỉ chạy lúc subscribe. Nếu chỉ viết
 * `runWithCorrelationId(id, () => next.handle())` thì subscribe xảy ra SAU khi
 * `run()` đã thoát, và ngữ cảnh ALS mất sạch. Vì vậy phải subscribe BÊN TRONG
 * `run()` như dưới đây.
 */
@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = context.switchToRpc().getContext<Metadata>();
    const incoming = metadata?.get?.(CORRELATION_HEADER)?.[0];
    const correlationId = incoming ? String(incoming) : undefined;
    const method = context.getHandler().name;
    const start = Date.now();

    return new Observable((subscriber) => {
      runWithCorrelationId(correlationId, () => {
        log('info', `${method} called`);
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err: Error) => {
            log('warn', `${method} failed`, {
              ms: Date.now() - start,
              err: err?.message,
            });
            subscriber.error(err);
          },
          complete: () => {
            log('info', `${method} completed`, { ms: Date.now() - start });
            subscriber.complete();
          },
        });
      });
    });
  }
}

// JSON một dòng, cùng shape với pino để mọi service grep chung một kiểu.
function log(level: string, msg: string, extra: Record<string, unknown> = {}) {
  process.stdout.write(
    JSON.stringify({
      level,
      time: Date.now(),
      service: 'product-service',
      correlationId: getCorrelationId(),
      ...extra,
      msg,
    }) + '\n',
  );
}
