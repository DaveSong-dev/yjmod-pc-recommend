/**
 * 출고 메타데이터: Blob(공개 URL)에 AES-256-GCM 암호문만 저장 — 평문 전화번호는 네트워크에 노출되지 않음
 */
const crypto = require('crypto');
const { put, list, del } = require('@vercel/blob');

const PAYLOAD_PATH = 'recent-shipping/state.payload';
const ALGO = 'aes-256-gcm';

function getKey() {
  const secret = process.env.SHIPPING_PAYLOAD_SECRET || '';
  if (secret.length < 16) {
    throw new Error('SHIPPING_PAYLOAD_SECRET too short (min 16 chars)');
  }
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

function encryptState(state) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const plain = JSON.stringify(state);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decryptState(b64) {
  const key = getKey();
  const buf = Buffer.from(String(b64 || ''), 'base64');
  if (buf.length < 32) throw new Error('invalid_payload');
  const iv = buf.subarray(0, 16);
  const tag = buf.subarray(16, 32);
  const data = buf.subarray(32);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const json = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  return JSON.parse(json);
}

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || '';
}

function normalizeBlobPathname(p) {
  return String(p || '').replace(/^\/+/, '');
}

async function readState() {
  const token = getBlobToken();
  const secret = process.env.SHIPPING_PAYLOAD_SECRET || '';
  if (!token || secret.length < 16) return null;

  try {
    const { blobs } = await list({
      prefix: 'recent-shipping/',
      limit: 80,
      token,
    });
    const want = normalizeBlobPathname(PAYLOAD_PATH);
    const blob = blobs.find((b) => normalizeBlobPathname(b.pathname) === want);
    if (!blob) {
      return { galleryMenuUrl: null, items: [] };
    }

    const res = await fetch(blob.url);
    if (!res.ok) {
      return { galleryMenuUrl: null, items: [] };
    }
    const b64 = await res.text();
    const state = decryptState(b64.trim());
    if (!state || typeof state !== 'object') {
      return { galleryMenuUrl: null, items: [] };
    }
    if (!Array.isArray(state.items)) state.items = [];
    return state;
  } catch (e) {
    console.error('[shipping-state] readState', e);
    return { galleryMenuUrl: null, items: [] };
  }
}

async function writeState(state) {
  const token = getBlobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN missing');
  const encStr = encryptState(state);
  const want = normalizeBlobPathname(PAYLOAD_PATH);
  try {
    const { blobs } = await list({
      prefix: 'recent-shipping/',
      limit: 80,
      token,
    });
    const existing = blobs.find((b) => normalizeBlobPathname(b.pathname) === want);
    if (existing && existing.url) {
      try {
        await del(existing.url, { token });
      } catch (e) {
        console.warn('[shipping-state] 기존 state 삭제 실패(무시 후 put 시도)', e);
      }
    }
  } catch (e) {
    console.warn('[shipping-state] 갱신 전 list 실패(put만 시도)', e);
  }
  await put(PAYLOAD_PATH, encStr, {
    access: 'public',
    token,
    contentType: 'text/plain; charset=utf-8',
    addRandomSuffix: false,
  });
}

module.exports = { readState, writeState, PAYLOAD_PATH };
