import test from 'node:test'
import assert from 'node:assert/strict'

import { buildRootCloneManifestTemplate, TEMPLATE_MUSE_PUBKEY } from '../composables/useNsiteClone.js'

test('buildRootCloneManifestTemplate converts named manifests to root', () => {
  const sourceManifest = {
    kind: 35128,
    tags: [
      ['d', 'shop'],
      ['name', 'shop'],
      ['relay', 'wss://relay.damus.io'],
      ['relay', 'wss://relay.primal.net'],
      ['x', 'sha256-hash', '/index.html']
    ],
    content: '{"version":1}'
  }

  const template = buildRootCloneManifestTemplate({
    sourceManifest,
    sourcePubkey: 'abcdef0123456789',
    relays: ['wss://relay.damus.io', 'wss://relay.nos.lol']
  })

  assert.equal(template.kind, 15128)
  assert.equal(template.content, '{"version":1}')
  assert.ok(template.tags.some((tag) => tag[0] === 'x'))
  assert.ok(!template.tags.some((tag) => tag[0] === 'd'))
  assert.ok(!template.tags.some((tag) => tag[0] === 'name'))
  assert.ok(template.tags.some((tag) => tag[0] === 'muse' && tag[1] === TEMPLATE_MUSE_PUBKEY))

  const relayTags = template.tags.filter((tag) => tag[0] === 'relay').map((tag) => tag[1]).sort()
  assert.deepEqual(relayTags, ['wss://relay.damus.io', 'wss://relay.nos.lol', 'wss://relay.primal.net'])
})

test('buildRootCloneManifestTemplate keeps root manifests root', () => {
  const sourceManifest = {
    kind: 15128,
    tags: [
      ['relay', 'wss://relay.ditto.pub'],
      ['x', 'sha256-hash', '/app.js']
    ],
    content: '{}'
  }

  const template = buildRootCloneManifestTemplate({
    sourceManifest,
    sourcePubkey: '0011223344556677',
    relays: ['wss://relay.ditto.pub']
  })

  assert.equal(template.kind, 15128)
  assert.ok(template.tags.some((tag) => tag[0] === 'relay' && tag[1] === 'wss://relay.ditto.pub'))
  assert.ok(template.tags.some((tag) => tag[0] === 'muse' && tag[1] === TEMPLATE_MUSE_PUBKEY))
})
