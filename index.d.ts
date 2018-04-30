declare module 'express-unit' {
  import { RequestHandler, ErrorRequestHandler } from 'express'
  function run(
    setup: RequestHandler | null,
    middleware: RequestHandler | ErrorRequestHandler,
    callback: (err: any, req: Request, res: Response) => void
  ): void
  function run(
    setup: RequestHandler | null,
    middleware: RequestHandler | ErrorRequestHandler
  ): Promise<[any, Request, Response]>
  export = run
}
