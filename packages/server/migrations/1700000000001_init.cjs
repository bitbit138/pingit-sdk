/* eslint-disable */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('profiles', {
    id: { type: 'text', primaryKey: true },
    requires: { type: 'jsonb', notNull: true },
    version: { type: 'int', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('apps', {
    app_id: { type: 'text', primaryKey: true },
    name: { type: 'text', notNull: true },
    owner_email: { type: 'text' },
    api_key_hash: { type: 'text' },
    revoked_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('users', {
    id: { type: 'bigserial', primaryKey: true },
    email: { type: 'text', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    role: {
      type: 'text',
      notNull: true,
      check: "role IN ('admin', 'developer')",
    },
    app_id: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('results', {
    id: { type: 'bigserial', primaryKey: true },
    app_id: { type: 'text', notNull: true },
    device_id: { type: 'text', notNull: true },
    download_mbps: { type: 'numeric' },
    upload_mbps: { type: 'numeric' },
    latency_ms: { type: 'numeric' },
    jitter_ms: { type: 'numeric' },
    packet_loss_pct: { type: 'numeric' },
    score: { type: 'int' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('crashes', {
    id: { type: 'bigserial', primaryKey: true },
    app_id: { type: 'text', notNull: true },
    device_id: { type: 'text', notNull: true },
    message: { type: 'text', notNull: true },
    stack: { type: 'text' },
    platform: { type: 'text', notNull: true },
    app_version: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // Raw SQL for the DESC composite indexes (avoids the builder's ordering quirks).
  pgm.sql('CREATE INDEX results_app_device_time ON results (app_id, device_id, created_at DESC);');
  pgm.sql('CREATE INDEX crashes_app_time ON crashes (app_id, created_at DESC);');
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS crashes_app_time;');
  pgm.sql('DROP INDEX IF EXISTS results_app_device_time;');
  pgm.dropTable('crashes');
  pgm.dropTable('results');
  pgm.dropTable('users');
  pgm.dropTable('apps');
  pgm.dropTable('profiles');
};
