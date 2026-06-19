Please keep in mind the following:

- We use Zod 4, so `z.safeExtend` and `z.literal` with an array works as you'd expect (e.g. `z.literal(['a', 'b'])` tests for `'a' | 'b'`).

- We use Node 24, so iterator methods are commonplace and best practice. Please recommend where they could be used more.
