declare module 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno&dts' {
  export function createClient(url: string, key: string, options?: any): any
}

declare module 'https://esm.sh/stripe@12.0.0?target=deno&dts' {
  class Stripe {
    constructor(key: string, options?: any)
    webhooks: { constructEvent(payload: string, signature: string, secret: string): any }
    static createFetchHttpClient(): any
  }
  export default Stripe
}

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void
}

declare namespace Deno {
  export interface Env {
    get(name: string): string | undefined
    set(name: string, value: string): void
    delete(name: string): void
    has(name: string): boolean
    toObject(): { [key: string]: string }
  }
  export const env: Env
}
