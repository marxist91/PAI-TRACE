import assert from 'node:assert/strict';
import test from 'node:test';
import { frontendOrigin, validateProductionSecrets } from './deployment-config';

test('déploiement : secrets absents, courts ou identiques refusés en production', () => {
  for (const secrets of [{}, { JWT_SECRET: 'court', JWT_REFRESH_SECRET: 'court' }, { JWT_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'a'.repeat(40) }]) {
    assert.throws(() => validateProductionSecrets({ NODE_ENV: 'production', ...secrets }));
  }
  assert.doesNotThrow(() => validateProductionSecrets({ NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40) }));
  assert.doesNotThrow(() => validateProductionSecrets({}));
});

test('déploiement : origine HTTPS Render, sans wildcard en production', () => {
  assert.equal(frontendOrigin({ NODE_ENV: 'production', RENDER_EXTERNAL_URL: 'https://pia-test.onrender.com' }), 'https://pia-test.onrender.com');
  for (const origin of [undefined, '*', 'http://example.com', 'https://example.com/']) {
    assert.throws(() => frontendOrigin({ NODE_ENV: 'production', FRONTEND_URL: origin }));
  }
  assert.equal(frontendOrigin({}), '*');
});
