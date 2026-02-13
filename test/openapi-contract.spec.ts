import * as path from 'path';
import SwaggerParser = require('@apidevtools/swagger-parser');

describe('OpenAPI contract (must cover implemented API)', () => {
  it('openapi.yaml contains core and new paths and Transaction has source/idempotencyKey', async () => {
    const specPath = path.resolve(__dirname, '..', 'openapi.yaml');
    const spec = (await SwaggerParser.parse(specPath)) as any;

    const paths = Object.keys(spec.paths ?? {});
    expect(paths).toEqual(expect.arrayContaining(['/health']));
    expect(paths).toEqual(expect.arrayContaining(['/categories', '/categories/{id}']));
    expect(paths).toEqual(expect.arrayContaining(['/transactions', '/transactions/{id}']));
    expect(paths).toEqual(
      expect.arrayContaining(['/recurring-expenses', '/recurring-expenses/{id}']),
    );
    expect(paths).toEqual(expect.arrayContaining(['/settings/timezone']));

    const txSchema = spec.components?.schemas?.Transaction;
    expect(txSchema?.properties?.source).toBeDefined();
    expect(txSchema?.properties?.idempotencyKey).toBeDefined();
  });

  it('openapi.openclaw.yaml contains required agent paths and uses idempotencyKey', async () => {
    const specPath = path.resolve(__dirname, '..', 'openapi.openclaw.yaml');
    const spec = (await SwaggerParser.parse(specPath)) as any;

    const paths = Object.keys(spec.paths ?? {});
    expect(paths).toEqual(expect.arrayContaining(['/health', '/categories']));
    expect(paths).toEqual(
      expect.arrayContaining(['/transactions/import', '/transactions/{idempotencyKey}']),
    );
    expect(paths).toEqual(
      expect.arrayContaining(['/recurring-expenses', '/recurring-expenses/{id}']),
    );

    const upsertSchema = spec.components?.schemas?.OpenClawUpsertTransaction;
    expect(upsertSchema?.properties?.idempotencyKey).toBeDefined();
    expect(upsertSchema?.required ?? []).toEqual(expect.arrayContaining(['idempotencyKey']));
  });
});
