import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvLeads } from '../app/lib/csv-leads.ts';

test('imports Excel-style semicolon CSV with Portuguese headers', () => {
  const result = parseCsvLeads('Empresa;Telefone;Segmento;E-mail\nPet Shop Área 3;+595 983 479 69;Veterinário;pet@example.com');
  assert.equal(result.error, null);
  assert.deepEqual(result.leads[0], { name: 'Pet Shop Área 3', phone: '+595 983 479 69', category: 'Veterinário', email: 'pet@example.com', address: '', website: '', country: '', source: 'CSV' });
});

test('handles quoted commas, escaped quotes and multiline values', () => {
  const result = parseCsvLeads('Company Name,Phone Number,Address\n"Loja ""Central"", CDE","+595 981 123456","Rua 1,\nCiudad del Este"');
  assert.equal(result.leads[0].name, 'Loja "Central", CDE');
  assert.equal(result.leads[0].address, 'Rua 1,\nCiudad del Este');
});

test('accepts tab-separated exports and reports missing required headers', () => {
  assert.equal(parseCsvLeads('Nome\tWhatsApp\nClínica Norte\t+55 11 99999-0000').leads.length, 1);
  assert.equal(parseCsvLeads('Produto;Valor\niTeraCare;100').error, 'headers');
});
