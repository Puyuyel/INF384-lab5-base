const test = require('node:test');
const assert = require('node:assert');
const { validarUrlNotificacion, registrarComercio, urlDeComercio } = require('../src/notificaciones');

test('acepta una url publica https', () => {
  assert.strictEqual(validarUrlNotificacion('https://comercio.example.com/pagos').ok, true);
});

test('rechaza http', () => {
  assert.strictEqual(validarUrlNotificacion('http://comercio.example.com/pagos').ok, false);
});

test('rechaza una direccion privada', () => {
  assert.strictEqual(validarUrlNotificacion('https://10.0.0.8/pagos').ok, false);
  assert.strictEqual(validarUrlNotificacion('https://192.168.1.20/pagos').ok, false);
});

test('rechaza localhost', () => {
  assert.strictEqual(validarUrlNotificacion('https://localhost/pagos').ok, false);
  assert.strictEqual(validarUrlNotificacion('https://127.0.0.1/pagos').ok, false);
});

test('registra la url del comercio', () => {
  const r = registrarComercio('bodega-lucha', 'https://bodega.example.com/aviso');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(urlDeComercio('bodega-lucha'), 'https://bodega.example.com/aviso');
});

test('rechaza el metadata service y link-local', () => {
  assert.strictEqual(validarUrlNotificacion('https://169.254.169.254/latest/meta-data').ok, false);
});

test('rechaza formas abreviadas o en hex de loopback (CVE-2024-29415)', () => {
  assert.strictEqual(validarUrlNotificacion('https://127.1/pagos').ok, false);
  assert.strictEqual(validarUrlNotificacion('https://0x7f.1/pagos').ok, false);
  assert.strictEqual(validarUrlNotificacion('https://0.0.0.0/pagos').ok, false);
});

test('rechaza IPv6 interna y IPv4 mapeada en IPv6', () => {
  assert.strictEqual(validarUrlNotificacion('https://[::1]/pagos').ok, false);
  assert.strictEqual(validarUrlNotificacion('https://[::ffff:127.0.0.1]/pagos').ok, false);
  assert.strictEqual(validarUrlNotificacion('https://[fd00::1]/pagos').ok, false);
});

test('acepta una IP publica', () => {
  assert.strictEqual(validarUrlNotificacion('https://8.8.8.8/pagos').ok, true);
});
