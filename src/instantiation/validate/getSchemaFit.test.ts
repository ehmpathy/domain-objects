import Joi from 'joi';
import { given, then, when } from 'test-fns';
import * as yup from 'yup';
import { z } from 'zod';

import { getSchemaFit } from './getSchemaFit';

describe('getSchemaFit', () => {
  given('[case1] a zod schema', () => {
    when('[t0] strict schema accepts the props', () => {
      then('reports accepts + strict', () => {
        const schema = z.object({ slug: z.string() }).strict();
        expect(
          getSchemaFit({
            schema,
            props: { slug: 'seagrass' },
            schemaName: 'Z',
          }),
        ).toEqual({ accepts: true, strict: true });
      });
    });

    when('[t1] non-strict schema accepts the props', () => {
      then('reports accepts + not strict', () => {
        const schema = z.object({ slug: z.string() });
        expect(
          getSchemaFit({
            schema,
            props: { slug: 'seagrass' },
            schemaName: 'Z',
          }),
        ).toEqual({ accepts: true, strict: false });
      });
    });

    when('[t2] schema rejects the props', () => {
      then('reports not accepts, with no strict field', () => {
        const schema = z.object({ slug: z.string() }).strict();
        expect(
          getSchemaFit({ schema, props: { depth: 40 }, schemaName: 'Z' }),
        ).toEqual({ accepts: false });
      });
    });
  });

  given('[case2] a joi schema', () => {
    when('[t0] strict (unknown rejected) schema accepts the props', () => {
      then('reports accepts + strict', () => {
        // joi rejects unknown keys by default → strict
        const schema = Joi.object({ blades: Joi.number().required() });
        expect(
          getSchemaFit({ schema, props: { blades: 12 }, schemaName: 'J' }),
        ).toEqual({ accepts: true, strict: true });
      });
    });

    when('[t1] non-strict (unknown allowed) schema accepts the props', () => {
      then('reports accepts + not strict', () => {
        const schema = Joi.object({ tag: Joi.string() }).unknown(true);
        expect(
          getSchemaFit({ schema, props: { tag: 'anemone' }, schemaName: 'J' }),
        ).toEqual({ accepts: true, strict: false });
      });
    });

    when('[t2] schema rejects the props', () => {
      then('reports not accepts', () => {
        const schema = Joi.object({ blades: Joi.number().required() });
        expect(
          getSchemaFit({ schema, props: { polyps: 3 }, schemaName: 'J' }),
        ).toEqual({ accepts: false });
      });
    });
  });

  given('[case3] a yup schema', () => {
    when('[t0] strict (noUnknown) schema accepts the props', () => {
      then('reports accepts + strict', () => {
        const schema = yup
          .object({ blades: yup.number().required() })
          .noUnknown()
          .strict(true);
        expect(
          getSchemaFit({ schema, props: { blades: 12 }, schemaName: 'Y' }),
        ).toEqual({ accepts: true, strict: true });
      });
    });

    when('[t1] non-strict schema accepts the props', () => {
      then('reports accepts + not strict', () => {
        // default yup strips unknown keys rather than reject → non-strict by our probe
        const schema = yup.object({ tag: yup.string() });
        expect(
          getSchemaFit({ schema, props: { tag: 'anemone' }, schemaName: 'Y' }),
        ).toEqual({ accepts: true, strict: false });
      });
    });

    when('[t2] schema rejects the props', () => {
      then('reports not accepts', () => {
        const schema = yup
          .object({ blades: yup.number().required() })
          .strict(true);
        expect(
          getSchemaFit({ schema, props: { tag: 'anemone' }, schemaName: 'Y' }),
        ).toEqual({ accepts: false });
      });
    });
  });
});
