const net = require('net');

const comercios = new Map();

// Rangos que no son destinos válidos para una notificación saliente.
// Reemplaza a la librería `ip` (CVE-2024-29415, sin versión corregida):
// se usa net.BlockList, nativo de Node, sin dependencias externas.
const DESTINOS_INTERNOS = new net.BlockList();
[
  ['0.0.0.0', 8], // "esta red"
  ['10.0.0.0', 8], // privada
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, incluye metadatos 169.254.169.254
  ['172.16.0.0', 12], // privada
  ['192.0.0.0', 24], // asignaciones IETF
  ['192.168.0.0', 16], // privada
  ['198.18.0.0', 15], // pruebas de red
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reservada y broadcast
].forEach(([red, prefijo]) => DESTINOS_INTERNOS.addSubnet(red, prefijo, 'ipv4'));
[
  ['::', 128], // no especificada
  ['::1', 128], // loopback
  // Las IPv4 mapeadas (::ffff:127.0.0.1) las evalúa BlockList contra las reglas IPv4.
  ['64:ff9b::', 96], // NAT64
  ['fc00::', 7], // única local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
].forEach(([red, prefijo]) => DESTINOS_INTERNOS.addSubnet(red, prefijo, 'ipv6'));

function esDestinoInterno(host) {
  const familia = net.isIP(host);
  if (familia === 0) return false;
  return DESTINOS_INTERNOS.check(host, familia === 4 ? 'ipv4' : 'ipv6');
}

function validarUrlNotificacion(valor) {
  let url;
  try {
    url = new URL(valor);
  } catch (e) {
    return { ok: false, error: 'url invalida' };
  }
  if (url.protocol !== 'https:') {
    return { ok: false, error: 'solo https' };
  }
  // URL normaliza las formas abreviadas o en hex de IPv4 (127.1, 0x7f.1) a 127.0.0.1.
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return { ok: false, error: 'destino interno' };
  }
  if (esDestinoInterno(host)) {
    return { ok: false, error: 'destino interno' };
  }
  return { ok: true, url: url.toString() };
}

function registrarComercio(comercio, urlNotificacion) {
  const resultado = validarUrlNotificacion(urlNotificacion);
  if (!resultado.ok) return resultado;
  comercios.set(comercio, resultado.url);
  return { ok: true, comercio, url: resultado.url };
}

function urlDeComercio(comercio) {
  return comercios.get(comercio) || null;
}

module.exports = { validarUrlNotificacion, registrarComercio, urlDeComercio };
