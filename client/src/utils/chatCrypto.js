const encoder = new TextEncoder();
const decoder = new TextDecoder();

function storageKey(prefix) {
  return `pawapix-chat-${prefix}`;
}

export async function getChatIdentity(prefix) {
  const saved = window.localStorage.getItem(storageKey(prefix));
  if (saved) {
    const privateKeyJwk = JSON.parse(saved);
    const privateKey = await crypto.subtle.importKey('jwk', privateKeyJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
    return { privateKey, publicKeyJwk: { kty: privateKeyJwk.kty, x: privateKeyJwk.x, y: privateKeyJwk.y, crv: privateKeyJwk.crv, ext: true } };
  }
  return createChatIdentity(prefix);
}

async function createChatIdentity(prefix) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  window.localStorage.setItem(storageKey(prefix), JSON.stringify(privateKeyJwk));
  return { privateKey: pair.privateKey, publicKeyJwk: await crypto.subtle.exportKey('jwk', pair.publicKey) };
}

export async function deriveChatKey(privateKey, peerPublicKeyJwk) {
  const peerPublicKey = await crypto.subtle.importKey('jwk', peerPublicKeyJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
  return crypto.subtle.deriveKey({ name: 'ECDH', public: peerPublicKey }, privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptChatMessage(key, message) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(message));
  return { ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))), iv: btoa(String.fromCharCode(...iv)) };
}

export async function decryptChatMessage(key, ciphertext, iv) {
  const bytes = Uint8Array.from(atob(ciphertext), (character) => character.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), (character) => character.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, bytes);
  return decoder.decode(decrypted);
}
