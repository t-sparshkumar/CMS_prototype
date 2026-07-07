import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateCollectionName } from '../core/collection.js';

describe('collections.service', () => {
  it('rejects invalid collection names', () => {
    assert.throws(() => validateCollectionName(''), /between 1 and 64/);
    assert.throws(() => validateCollectionName('cms_users'), /cannot start with cms_/);
    assert.throws(() => validateCollectionName('Invalid-Name'), /lowercase letters/);
  });
});
